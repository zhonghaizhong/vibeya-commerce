import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type OrderItem = {
  id: string
  title: string
  variant_title?: string | null
  quantity: number
  thumbnail?: string | null
}

type Order = {
  id: string
  display_id: number
  created_at: string
  status: string
  payment_status: string
  fulfillment_status: string
  total: number
  currency_code: string
  email?: string | null
  customer?: { first_name?: string | null; last_name?: string | null; phone?: string | null } | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country_code?: string | null
  } | null
  shipping_methods?: Array<{ name?: string | null }>
  fulfillments?: Array<{
    id: string
    created_at?: string
    labels?: Array<{ tracking_number?: string | null; tracking_url?: string | null }>
  }>
  items?: OrderItem[]
}

type Filter = "all" | "needs_shipping" | "unpaid" | "shipped"

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "全部订单" },
  { id: "needs_shipping", label: "待发货" },
  { id: "unpaid", label: "待付款" },
  { id: "shipped", label: "已发货" },
]

const paymentLabel = (value: string) => ({
  captured: "已支付",
  partially_captured: "部分支付",
  authorized: "已授权",
  awaiting: "等待付款",
  not_paid: "未付款",
  refunded: "已退款",
  partially_refunded: "部分退款",
}[value] || value || "未知")

const fulfillmentLabel = (value: string) => ({
  fulfilled: "已发货",
  partially_fulfilled: "部分发货",
  not_fulfilled: "待发货",
  shipped: "运输中",
  partially_shipped: "部分发货",
  delivered: "已送达",
  canceled: "已取消",
}[value] || value || "未处理")

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN")
}

const formatTotal = (amount: number, currency: string) => {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "USD").toUpperCase() }).format(numeric)
}

const getCustomerName = (order: Order) => [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") || "访客客户"

const OrderCenterPage = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [orderDetails, setOrderDetails] = useState<Order | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState("")
  const [lastSyncedAt, setLastSyncedAt] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/orders", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "订单读取失败。")
      const nextOrders = data.orders ?? []
      setOrders(nextOrders)
      setSelectedId((current) => nextOrders.some((order: Order) => order.id === current) ? current : nextOrders[0]?.id ?? "")
      setLastSyncedAt(new Date().toLocaleTimeString("zh-CN"))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "订单读取失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!selectedId) {
      setOrderDetails(null)
      return
    }
    let active = true
    setDetailsLoading(true)
    setDetailsError("")
    setOrderDetails(null)
    void fetch(`/admin/vibeya/orders/${encodeURIComponent(selectedId)}/images`, {
      credentials: "same-origin",
      cache: "no-store",
    }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "订单详情读取失败。")
      if (active) setOrderDetails(data.order)
    }).catch((caught: unknown) => {
      if (active) setDetailsError(caught instanceof Error ? caught.message : "订单详情读取失败。")
    }).finally(() => {
      if (active) setDetailsLoading(false)
    })
    return () => { active = false }
  }, [selectedId])

  const visibleOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return orders.filter((order) => {
      const fulfillment = order.fulfillment_status || "not_fulfilled"
      const payment = order.payment_status || "not_paid"
      const matchesFilter = filter === "all"
        || (filter === "needs_shipping" && !["fulfilled", "shipped", "delivered", "canceled"].includes(fulfillment))
        || (filter === "unpaid" && !["captured", "partially_captured", "refunded", "partially_refunded"].includes(payment))
        || (filter === "shipped" && ["fulfilled", "partially_fulfilled", "shipped", "partially_shipped", "delivered"].includes(fulfillment))
      const customer = getCustomerName(order)
      return matchesFilter && (!keyword || [order.display_id, order.email, customer].join(" ").toLowerCase().includes(keyword))
    })
  }, [orders, filter, search])

  const selected = visibleOrders.find((order) => order.id === selectedId) || visibleOrders[0]
  const detail = orderDetails?.id === selected?.id ? orderDetails : null
  const needsShipping = orders.filter((order) => !["fulfilled", "shipped", "delivered", "canceled"].includes(order.fulfillment_status || "not_fulfilled")).length
  const unpaid = orders.filter((order) => !["captured", "partially_captured", "refunded", "partially_refunded"].includes(order.payment_status || "not_paid")).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level="h1">订单工作台</Heading>
          <Text className="mt-1 text-ui-fg-subtle">集中查看订单、商品实图、收货信息和物流单号。需要创建发货或退款时，可从订单详情继续操作。</Text>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium disabled:opacity-50">
          {loading ? "同步中…" : "刷新订单"}
        </button>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Container className="p-4"><Text size="small" className="text-ui-fg-subtle">订单总数</Text><div className="mt-1 text-2xl font-semibold">{orders.length}</div></Container>
        <Container className="p-4"><Text size="small" className="text-ui-fg-subtle">待发货</Text><div className="mt-1 text-2xl font-semibold">{needsShipping}</div></Container>
        <Container className="p-4"><Text size="small" className="text-ui-fg-subtle">待付款</Text><div className="mt-1 text-2xl font-semibold">{unpaid}</div></Container>
        <Container className="p-4"><Text size="small" className="text-ui-fg-subtle">最近同步</Text><div className="mt-2 text-sm">{loading ? "正在更新…" : lastSyncedAt || "—"}</div></Container>
      </div>

      <Container className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-base p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-md px-3 py-2 text-sm font-medium ${filter === item.id ? "bg-ui-bg-interactive text-ui-fg-on-color" : "border border-ui-border-base text-ui-fg-base hover:bg-ui-bg-subtle"}`}>
                {item.label}{item.id === "needs_shipping" ? ` · ${needsShipping}` : item.id === "unpaid" ? ` · ${unpaid}` : ""}
              </button>
            ))}
          </div>
          <input aria-label="搜索订单" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索订单号、客户或邮箱" className="w-full max-w-sm rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm outline-none focus:border-ui-border-interactive" />
        </div>

        {loading ? <div className="p-8 text-center"><Text>正在读取订单…</Text></div> : visibleOrders.length === 0 ? (
          <div className="p-10 text-center"><Text className="text-ui-fg-subtle">{orders.length ? "没有符合条件的订单。" : "还没有订单。新订单会显示在这里。"}</Text></div>
        ) : (
          <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <div className="overflow-x-auto border-b border-ui-border-base lg:border-b-0 lg:border-r">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-ui-bg-subtle text-ui-fg-subtle">
                  <tr><th className="px-4 py-3 font-medium">订单</th><th className="px-4 py-3 font-medium">客户</th><th className="px-4 py-3 font-medium">付款 / 发货</th><th className="px-4 py-3 text-right font-medium">金额</th></tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.id} onClick={() => setSelectedId(order.id)} className={`cursor-pointer border-t border-ui-border-base transition-colors ${selected?.id === order.id ? "bg-ui-bg-interactive-subtle" : "hover:bg-ui-bg-subtle"}`}>
                      <td className="px-4 py-3 align-top"><div className="font-semibold">#{order.display_id}</div><div className="mt-1 text-xs text-ui-fg-subtle">{formatDate(order.created_at)}</div></td>
                      <td className="px-4 py-3 align-top"><div>{getCustomerName(order)}</div><div className="mt-1 max-w-[180px] truncate text-xs text-ui-fg-subtle">{order.email || "—"}</div></td>
                      <td className="px-4 py-3 align-top"><div>{paymentLabel(order.payment_status)}</div><div className="mt-1 text-xs text-ui-fg-subtle">{fulfillmentLabel(order.fulfillment_status)}</div></td>
                      <td className="px-4 py-3 text-right align-top font-medium">{formatTotal(order.total, order.currency_code)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-ui-border-base px-4 py-3 text-xs text-ui-fg-subtle">显示 {visibleOrders.length} / {orders.length} 笔最近订单</div>
            </div>

            {selected && (
              <aside className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><Heading level="h2">订单 #{selected.display_id}</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">{formatDate(selected.created_at)}</Text></div>
                  <a href={`/app/orders/${encodeURIComponent(selected.id)}`} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium hover:bg-ui-bg-subtle">打开订单详情</a>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-ui-bg-subtle p-3 text-sm">
                  <div><Text size="small" className="text-ui-fg-subtle">付款状态</Text><div className="mt-1 font-medium">{paymentLabel(selected.payment_status)}</div></div>
                  <div><Text size="small" className="text-ui-fg-subtle">发货状态</Text><div className="mt-1 font-medium">{fulfillmentLabel(selected.fulfillment_status)}</div></div>
                </div>

                <section>
                  <Text className="font-semibold">客户与收货地址</Text>
                  <div className="mt-2 rounded-lg border border-ui-border-base p-3 text-sm">
                    <div className="font-medium">{getCustomerName(selected)}</div>
                    <div className="mt-1 break-all text-ui-fg-subtle">{detail?.email || selected.email || "未提供邮箱"}</div>
                    {detail?.customer?.phone && <div className="mt-1 text-ui-fg-subtle">{detail.customer.phone}</div>}
                    {detail?.shipping_address ? (
                      <div className="mt-3 leading-6 text-ui-fg-subtle">
                        {[detail.shipping_address.first_name, detail.shipping_address.last_name, detail.shipping_address.address_1, detail.shipping_address.address_2, [detail.shipping_address.city, detail.shipping_address.province, detail.shipping_address.postal_code].filter(Boolean).join(", "), detail.shipping_address.country_code?.toUpperCase()].filter(Boolean).map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
                      </div>
                    ) : detailsLoading ? <div className="mt-2 text-ui-fg-subtle">正在读取地址…</div> : <div className="mt-2 text-ui-fg-subtle">{detailsError || "订单没有收货地址。"}</div>}
                  </div>
                </section>

                <section>
                  <Text className="font-semibold">商品与设计图</Text>
                  <div className="mt-2 flex flex-col gap-2">
                    {detail?.items?.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-lg border border-ui-border-base p-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ui-bg-subtle">
                          {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" /> : <span className="text-xs text-ui-fg-subtle">无图片</span>}
                        </div>
                        <div className="min-w-0 text-sm"><div className="font-medium">{item.title}</div>{item.variant_title && <div className="mt-1 text-xs text-ui-fg-subtle">{item.variant_title}</div>}<div className="mt-1 text-xs text-ui-fg-subtle">数量：{item.quantity}</div></div>
                      </div>
                    ))}
                    {detailsLoading && <div className="rounded-lg border border-ui-border-base p-4 text-sm text-ui-fg-subtle">正在读取商品图片…</div>}
                    {!detailsLoading && !detail?.items?.length && <div className="rounded-lg border border-ui-border-base p-4 text-sm text-ui-fg-subtle">{detailsError || "订单没有商品图片信息。"}</div>}
                  </div>
                </section>

                <section>
                  <Text className="font-semibold">配送与运单</Text>
                  <div className="mt-2 rounded-lg border border-ui-border-base p-3 text-sm">
                    {(detail?.shipping_methods ?? []).map((method, index) => <div key={`${method.name}-${index}`} className="mb-2">配送方式：{method.name || "未记录"}</div>)}
                    {detail?.fulfillments?.length ? detail.fulfillments.map((fulfillment) => (
                      <div key={fulfillment.id} className="border-t border-ui-border-base py-2 first:border-0">
                        {(fulfillment.labels ?? []).length ? fulfillment.labels?.map((label, index) => <div key={`${label.tracking_number}-${index}`} className="flex flex-wrap items-center justify-between gap-2"><span className="text-ui-fg-subtle">运单号：{label.tracking_number || "未填写"}</span>{label.tracking_url && <a className="text-ui-fg-interactive" href={label.tracking_url} target="_blank" rel="noreferrer">查看物流</a>}</div>) : <div className="text-ui-fg-subtle">已创建发货单，暂无运单号。</div>}
                      </div>
                    )) : <div className="text-ui-fg-subtle">{detailsLoading ? "正在读取物流信息…" : detailsError || "尚未创建发货单。"}</div>}
                  </div>
                </section>

                <div className="mt-auto flex items-center justify-between border-t border-ui-border-base pt-3"><Text className="font-semibold">订单总额</Text><Text className="text-lg font-semibold">{formatTotal(selected.total, selected.currency_code)}</Text></div>
              </aside>
            )}
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "订单工作台", nested: "/orders", rank: 1 })

export default OrderCenterPage
