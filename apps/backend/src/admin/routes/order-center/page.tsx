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
    phone?: string | null
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
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null)

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setNotice(`${label}已复制`)
      window.setTimeout(() => setNotice(""), 2200)
    } catch {
      setNotice("复制失败，请手动选择内容复制")
      window.setTimeout(() => setNotice(""), 3000)
    }
  }, [])

  useEffect(() => {
    if (!preview) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null) }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [preview])

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
  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id)
  }, [selected?.id, selectedId])
  const needsShipping = orders.filter((order) => !["fulfilled", "shipped", "delivered", "canceled"].includes(order.fulfillment_status || "not_fulfilled")).length
  const unpaid = orders.filter((order) => !["captured", "partially_captured", "refunded", "partially_refunded"].includes(order.payment_status || "not_paid")).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level="h1">订单工作台</Heading>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium disabled:opacity-50">
          {loading ? "同步中…" : "刷新订单"}
        </button>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}

      {notice && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-lg bg-ui-bg-inverse px-4 py-3 text-sm text-ui-fg-on-inverse shadow-lg">{notice}</div>}

      <Container className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-base p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${filter === item.id ? "bg-ui-bg-interactive text-ui-fg-on-color" : "border border-ui-border-base text-ui-fg-base hover:bg-ui-bg-subtle"}`}>
                {item.label}{item.id === "needs_shipping" ? ` · ${needsShipping}` : item.id === "unpaid" ? ` · ${unpaid}` : ""}
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <Text size="small" className="hidden whitespace-nowrap text-ui-fg-subtle sm:block">{loading ? "正在同步…" : `共 ${visibleOrders.length} 笔`}</Text>
            <input aria-label="搜索订单" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜订单号、客户、邮箱" className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm outline-none focus:border-ui-border-interactive sm:w-64" />
          </div>
        </div>

        {loading ? <div className="p-8 text-center"><Text>正在读取订单…</Text></div> : visibleOrders.length === 0 ? (
          <div className="p-10 text-center"><Text className="text-ui-fg-subtle">{orders.length ? "没有符合条件的订单。" : "还没有订单。新订单会显示在这里。"}</Text></div>
        ) : (
          <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="overflow-x-auto border-b border-ui-border-base lg:border-b-0 lg:border-r">
              <table className="w-full min-w-[610px] text-left text-sm">
                <thead className="bg-ui-bg-subtle text-ui-fg-subtle">
                  <tr><th className="px-4 py-3 font-medium">订单</th><th className="px-4 py-3 font-medium">客户</th><th className="px-4 py-3 font-medium">状态</th><th className="px-4 py-3 text-right font-medium">金额</th></tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.id} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(order.id) }} onClick={() => setSelectedId(order.id)} className={`cursor-pointer border-t border-ui-border-base transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ui-border-interactive ${selected?.id === order.id ? "bg-ui-bg-interactive-subtle" : "hover:bg-ui-bg-subtle"}`}>
                      <td className="px-4 py-3 align-top"><div className="font-semibold">#{order.display_id}</div><div className="mt-1 text-xs text-ui-fg-subtle">{formatDate(order.created_at)}</div></td>
                      <td className="px-4 py-3 align-top"><div>{getCustomerName(order)}</div><div className="mt-1 max-w-[180px] truncate text-xs text-ui-fg-subtle">{order.email || "—"}</div></td>
                      <td className="px-4 py-3 align-top"><div className="font-medium">{paymentLabel(order.payment_status)}</div><div className="mt-1 text-xs text-ui-fg-subtle">{fulfillmentLabel(order.fulfillment_status)}</div></td>
                      <td className="px-4 py-3 text-right align-top font-medium">{formatTotal(order.total, order.currency_code)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected && (
              <aside className="flex max-h-[calc(100vh-150px)] flex-col gap-4 overflow-y-auto p-4 sm:sticky sm:top-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><Heading level="h2">订单 #{selected.display_id}</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">{formatDate(selected.created_at)}</Text></div>
                  <div className="text-right"><div className="text-lg font-semibold">{formatTotal(selected.total, selected.currency_code)}</div><div className="mt-1 text-xs text-ui-fg-subtle">订单总额</div></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ui-bg-subtle px-3 py-1 text-xs font-medium">付款：{paymentLabel(selected.payment_status)}</span>
                  <span className="rounded-full bg-ui-bg-subtle px-3 py-1 text-xs font-medium">发货：{fulfillmentLabel(selected.fulfillment_status)}</span>
                </div>

                <section>
                  <div className="flex items-center justify-between gap-2"><Text className="font-semibold">客户与收货</Text>{detail?.shipping_address && <button type="button" onClick={() => void copyText([detail.shipping_address?.first_name, detail.shipping_address?.last_name, detail.shipping_address?.address_1, detail.shipping_address?.address_2, [detail.shipping_address?.city, detail.shipping_address?.province, detail.shipping_address?.postal_code].filter(Boolean).join(", "), detail.shipping_address?.country_code?.toUpperCase(), detail.shipping_address?.phone || detail.customer?.phone].filter(Boolean).join("\n"), "收货地址")} className="text-xs font-medium text-ui-fg-interactive">复制地址</button>}</div>
                  <div className="mt-2 rounded-lg bg-ui-bg-subtle p-3 text-sm">
                    <div className="font-medium">{getCustomerName(selected)}</div>
                    <div className="mt-1 break-all text-ui-fg-subtle">{detail?.email || selected.email || "未提供邮箱"}</div>
                    {(detail?.shipping_address?.phone || detail?.customer?.phone) && <div className="mt-1 text-ui-fg-subtle">{detail.shipping_address?.phone || detail.customer?.phone}</div>}
                    {detail?.shipping_address && <div className="mt-3 border-t border-ui-border-base pt-2 leading-6 text-ui-fg-subtle">
                      {[detail.shipping_address.address_1, detail.shipping_address.address_2, [detail.shipping_address.city, detail.shipping_address.province, detail.shipping_address.postal_code].filter(Boolean).join(", "), detail.shipping_address.country_code?.toUpperCase()].filter(Boolean).map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
                    </div>}
                    {!detail?.shipping_address && (detailsLoading ? <div className="mt-2 text-ui-fg-subtle">正在读取收货地址…</div> : <div className="mt-2 text-ui-fg-subtle">{detailsError || "订单没有收货地址。"}</div>)}
                  </div>
                </section>

                <section>
                  <Text className="font-semibold">商品</Text>
                  <div className="mt-2 flex flex-col gap-2">
                    {detail?.items?.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-lg border border-ui-border-base p-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ui-bg-subtle">
                          {item.thumbnail ? <button type="button" onClick={() => setPreview({ src: item.thumbnail!, title: item.title })} aria-label={`放大查看${item.title}`} className="h-full w-full cursor-zoom-in"><img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" /></button> : <span className="text-xs text-ui-fg-subtle">无图片</span>}
                        </div>
                        <div className="min-w-0 text-sm"><div className="font-medium">{item.title}</div>{item.variant_title && <div className="mt-1 text-xs text-ui-fg-subtle">{item.variant_title}</div>}<div className="mt-1 text-xs text-ui-fg-subtle">数量：{item.quantity}</div></div>
                      </div>
                    ))}
                    {detailsLoading && <div className="rounded-lg border border-ui-border-base p-4 text-sm text-ui-fg-subtle">正在读取商品图片…</div>}
                    {!detailsLoading && !detail?.items?.length && <div className="rounded-lg border border-ui-border-base p-4 text-sm text-ui-fg-subtle">{detailsError || "订单没有商品图片信息。"}</div>}
                  </div>
                </section>

                <section>
                  <Text className="font-semibold">物流</Text>
                  <div className="mt-2 rounded-lg border border-ui-border-base p-3 text-sm">
                    {detail?.fulfillments?.length ? detail.fulfillments.map((fulfillment) => (
                      <div key={fulfillment.id} className="border-t border-ui-border-base py-2 first:border-0">
                        {(fulfillment.labels ?? []).length ? fulfillment.labels?.map((label, index) => <div key={`${label.tracking_number}-${index}`} className="flex flex-wrap items-center justify-between gap-2"><span className="break-all font-medium">{label.tracking_number || "暂无运单号"}</span><span className="flex gap-3">{label.tracking_number && <button type="button" onClick={() => void copyText(label.tracking_number!, "运单号")} className="text-ui-fg-interactive">复制</button>}{label.tracking_url && <a className="text-ui-fg-interactive" href={label.tracking_url} target="_blank" rel="noreferrer">17TRACK 追踪</a>}</span></div>) : <div className="text-ui-fg-subtle">已创建发货单，暂无运单号。</div>}
                      </div>
                    )) : <div className="text-ui-fg-subtle">{detailsLoading ? "正在读取物流信息…" : detailsError || "尚未创建发货单。"}</div>}
                  </div>
                </section>

                <a href={`/app/orders/${encodeURIComponent(selected.id)}`} className="mt-auto inline-flex min-h-10 items-center justify-center rounded-md bg-ui-bg-interactive px-4 py-2 text-sm font-medium text-ui-fg-on-color hover:opacity-90">发货 / 退款</a>
              </aside>
            )}
          </div>
        )}
      </Container>

      {preview && <div role="dialog" aria-modal="true" aria-label="商品图片预览" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}><button type="button" aria-label="关闭图片预览" className="absolute right-5 top-5 rounded-full bg-white px-3 py-2 text-sm font-medium text-black">关闭</button><img src={preview.src} alt={preview.title} className="max-h-[90vh] max-w-[92vw] rounded-lg bg-white object-contain" onClick={(event) => event.stopPropagation()} /></div>}
    </div>
  )
}

export const config = defineRouteConfig({ label: "订单工作台", nested: "/orders", rank: 1 })

export default OrderCenterPage
