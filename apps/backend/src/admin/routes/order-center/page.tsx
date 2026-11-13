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
    items?: Array<{ id: string; line_item_id?: string | null; quantity: number }>
    labels?: Array<{ tracking_number?: string | null; tracking_url?: string | null }>
  }>
  items?: OrderItem[]
}

type FulfillmentLocation = { id: string; name: string; address: string }

type Filter = "pending" | "all"

const filters: Array<{ id: Filter; label: string }> = [
  { id: "pending", label: "待处理" },
  { id: "all", label: "全部订单" },
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
  const [filter, setFilter] = useState<Filter>("pending")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null)
  const [trackingFulfillment, setTrackingFulfillment] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [savingTracking, setSavingTracking] = useState(false)
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false)
  const [fulfillmentLocations, setFulfillmentLocations] = useState<FulfillmentLocation[]>([])
  const [fulfillmentItems, setFulfillmentItems] = useState<Array<{ id: string; quantity: number }>>([])
  const [fulfillmentLocationId, setFulfillmentLocationId] = useState("")
  const [loadingFulfillmentOptions, setLoadingFulfillmentOptions] = useState(false)

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
      const isUnpaid = !["captured", "partially_captured", "refunded", "partially_refunded"].includes(payment)
      const needsFulfillment = !["fulfilled", "shipped", "delivered", "canceled"].includes(fulfillment)
      const matchesFilter = filter === "all" || isUnpaid || needsFulfillment
      const customer = getCustomerName(order)
      return matchesFilter && (!keyword || [order.display_id, order.email, customer].join(" ").toLowerCase().includes(keyword))
    })
  }, [orders, filter, search])

  const selected = visibleOrders.find((order) => order.id === selectedId) || visibleOrders[0]
  const detail = orderDetails?.id === selected?.id ? orderDetails : null
  const selectedNeedsFulfillment = Boolean(selected && !["fulfilled", "shipped", "delivered", "canceled"].includes(selected.fulfillment_status || "not_fulfilled"))
  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id)
  }, [selected?.id, selectedId])
  const pendingCount = orders.filter((order) => {
    const unpaidOrder = !["captured", "partially_captured", "refunded", "partially_refunded"].includes(order.payment_status || "not_paid")
    const needsFulfillment = !["fulfilled", "shipped", "delivered", "canceled"].includes(order.fulfillment_status || "not_fulfilled")
    return unpaidOrder || needsFulfillment
  }).length

  const saveTracking = useCallback(async () => {
    const fulfillment = detail?.fulfillments?.find((item) => item.id === trackingFulfillment)
    const number = trackingNumber.trim()
    if (!selected || !fulfillment || !number || !fulfillment.items?.length) return
    if (fulfillment.items.some((item) => !item.line_item_id)) {
      setDetailsError("订单商品信息不完整，请刷新订单后再登记运单。")
      return
    }
    setSavingTracking(true)
    setDetailsError("")
    try {
      const response = await fetch(`/admin/orders/${encodeURIComponent(selected.id)}/fulfillments/${encodeURIComponent(fulfillment.id)}/shipments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: fulfillment.items.map((item) => ({
            id: item.line_item_id,
            quantity: item.quantity,
          })),
          labels: [{ tracking_number: number, tracking_url: "", label_url: "" }],
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || data.error || "保存运单失败，请稍后重试。")
      setTrackingFulfillment(null)
      setTrackingNumber("")
      setNotice("运单已登记，17TRACK 链接已生成")
      window.setTimeout(() => setNotice(""), 3000)
      await load()
      const refreshed = await fetch(`/admin/vibeya/orders/${encodeURIComponent(selected.id)}/images`, { credentials: "same-origin", cache: "no-store" })
      const refreshedData = await refreshed.json()
      if (!refreshed.ok) throw new Error(refreshedData.error || "运单已保存，但订单详情刷新失败。")
      setOrderDetails(refreshedData.order)
    } catch (caught) {
      setDetailsError(caught instanceof Error ? caught.message : "保存运单失败，请稍后重试。")
    } finally {
      setSavingTracking(false)
    }
  }, [detail, load, selected, trackingFulfillment, trackingNumber])

  const openFulfillment = useCallback(async () => {
    if (!selected) return
    setFulfillmentOpen(true)
    setLoadingFulfillmentOptions(true)
    setDetailsError("")
    setTrackingNumber("")
    try {
      const response = await fetch(`/admin/vibeya/orders/${encodeURIComponent(selected.id)}/fulfillment-options`, {
        credentials: "same-origin",
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "发货信息读取失败。")
      setFulfillmentLocations(data.locations ?? [])
      setFulfillmentItems(data.remaining_items ?? [])
      setFulfillmentLocationId(data.locations?.length === 1 ? data.locations[0].id : "")
      if (data.already_fulfilled) setDetailsError("这个订单已全部发货。")
      else if (!data.locations?.length) setDetailsError("没有找到可用于本订单商品的发货仓库，请先在发货地址设置中关联商品。")
    } catch (caught) {
      setDetailsError(caught instanceof Error ? caught.message : "发货信息读取失败。")
    } finally {
      setLoadingFulfillmentOptions(false)
    }
  }, [selected])

  const createFulfillment = useCallback(async () => {
    if (!selected || !fulfillmentLocationId || !fulfillmentItems.length) return
    setSavingTracking(true)
    setDetailsError("")
    try {
      const response = await fetch(`/admin/vibeya/orders/${encodeURIComponent(selected.id)}/fulfill`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: fulfillmentLocationId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "创建发货单失败，请稍后重试。")
      let shipmentSaved = false
      if (trackingNumber.trim()) {
        const shipmentResponse = await fetch(`/admin/orders/${encodeURIComponent(selected.id)}/fulfillments/${encodeURIComponent(data.fulfillment_id)}/shipments`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: data.items,
            labels: [{ tracking_number: trackingNumber.trim(), tracking_url: "", label_url: "" }],
          }),
        })
        const shipmentData = await shipmentResponse.json().catch(() => ({}))
        if (!shipmentResponse.ok) throw new Error(`发货单已创建，但运单保存失败：${shipmentData.message || shipmentData.error || "请在订单物流区补登记。"}`)
        shipmentSaved = true
      }
      setFulfillmentOpen(false)
      setTrackingNumber("")
      setNotice(shipmentSaved ? "发货和运单已登记，17TRACK 链接已生成" : "发货单已创建，可稍后补充运单号")
      window.setTimeout(() => setNotice(""), 3500)
      await load()
      const refreshed = await fetch(`/admin/vibeya/orders/${encodeURIComponent(selected.id)}/images`, { credentials: "same-origin", cache: "no-store" })
      const refreshedData = await refreshed.json()
      if (refreshed.ok) setOrderDetails(refreshedData.order)
    } catch (caught) {
      setDetailsError(caught instanceof Error ? caught.message : "创建发货单失败，请稍后重试。")
    } finally {
      setSavingTracking(false)
    }
  }, [fulfillmentItems.length, fulfillmentLocationId, load, selected, trackingNumber])

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
                {item.label}{item.id === "pending" ? ` · ${pendingCount}` : ""}
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
                        {(fulfillment.labels ?? []).length ? fulfillment.labels?.map((label, index) => <div key={`${label.tracking_number}-${index}`} className="flex flex-wrap items-center justify-between gap-2"><span className="break-all font-medium">{label.tracking_number || "暂无运单号"}</span><span className="flex gap-3">{label.tracking_number && <button type="button" onClick={() => void copyText(label.tracking_number!, "运单号")} className="text-ui-fg-interactive">复制</button>}{label.tracking_url && <a className="text-ui-fg-interactive" href={label.tracking_url} target="_blank" rel="noreferrer">17TRACK 追踪</a>}</span></div>) : <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-ui-fg-subtle">已创建发货单，暂无运单号。</span>{fulfillment.items?.length ? <button type="button" onClick={() => { setTrackingFulfillment(fulfillment.id); setDetailsError("") }} className="font-medium text-ui-fg-interactive">登记运单</button> : null}</div>}
                      </div>
                    )) : <div className="text-ui-fg-subtle">{detailsLoading ? "正在读取物流信息…" : detailsError || "尚未创建发货单。"}</div>}
                  </div>
                </section>

                <div className="mt-auto flex flex-col gap-2">
                  {selectedNeedsFulfillment && <button type="button" disabled={!detail || detailsLoading || !["captured", "partially_captured"].includes(selected.payment_status)} onClick={() => void openFulfillment()} className="inline-flex min-h-10 items-center justify-center rounded-md bg-ui-bg-interactive px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:cursor-not-allowed disabled:opacity-50">一键发货</button>}
                  {selectedNeedsFulfillment && !["captured", "partially_captured"].includes(selected.payment_status) && <Text size="small" className="text-center text-ui-fg-subtle">收款后即可发货</Text>}
                  {!selectedNeedsFulfillment && detail?.fulfillments?.length ? <a href={`/app/orders/${encodeURIComponent(selected.id)}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-ui-border-base px-4 py-2 text-sm font-medium hover:bg-ui-bg-subtle">退款等其他操作</a> : null}
                </div>
              </aside>
            )}
          </div>
        )}
      </Container>

      {preview && <div role="dialog" aria-modal="true" aria-label="商品图片预览" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}><button type="button" aria-label="关闭图片预览" className="absolute right-5 top-5 rounded-full bg-white px-3 py-2 text-sm font-medium text-black">关闭</button><img src={preview.src} alt={preview.title} className="max-h-[90vh] max-w-[92vw] rounded-lg bg-white object-contain" onClick={(event) => event.stopPropagation()} /></div>}
      {trackingFulfillment && <div role="dialog" aria-modal="true" aria-labelledby="tracking-dialog-title" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!savingTracking) setTrackingFulfillment(null) }}><div className="w-full max-w-md rounded-xl bg-ui-bg-base p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><Heading level="h2" id="tracking-dialog-title">登记发货运单</Heading><Text size="small" className="mt-2 text-ui-fg-subtle">保存后会自动创建 17TRACK 追踪链接。</Text><label className="mt-4 block text-sm font-medium" htmlFor="order-tracking-number">运单号</label><input id="order-tracking-number" autoFocus value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveTracking() }} placeholder="输入承运商提供的运单号" className="mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm outline-none focus:border-ui-border-interactive" />{detailsError && <Text className="mt-2 text-ui-fg-error">{detailsError}</Text>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={savingTracking} onClick={() => setTrackingFulfillment(null)} className="rounded-md border border-ui-border-base px-3 py-2 text-sm">取消</button><button type="button" disabled={savingTracking || !trackingNumber.trim()} onClick={() => void saveTracking()} className="rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{savingTracking ? "保存中…" : "保存运单"}</button></div></div></div>}
      {fulfillmentOpen && <div role="dialog" aria-modal="true" aria-labelledby="fulfillment-dialog-title" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!savingTracking) setFulfillmentOpen(false) }}><div className="w-full max-w-lg rounded-xl bg-ui-bg-base p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between gap-3"><Heading level="h2" id="fulfillment-dialog-title">一键发货 · 订单 #{selected?.display_id}</Heading><button type="button" aria-label="关闭" disabled={savingTracking} onClick={() => setFulfillmentOpen(false)} className="rounded-md px-2 py-1 text-lg text-ui-fg-subtle">×</button></div><Text size="small" className="mt-2 text-ui-fg-subtle">选择适用仓库；运单号可现在填写，也可稍后补上。保存后自动生成 17TRACK 链接。</Text>{loadingFulfillmentOptions ? <div className="py-8 text-center text-sm text-ui-fg-subtle">正在匹配商品和发货仓库…</div> : <><label htmlFor="fulfillment-location" className="mt-4 block text-sm font-medium">发货仓库</label><select id="fulfillment-location" value={fulfillmentLocationId} onChange={(event) => setFulfillmentLocationId(event.target.value)} className="mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm" disabled={!fulfillmentLocations.length}><option value="">请选择发货仓库</option>{fulfillmentLocations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.address}</option>)}</select><label htmlFor="fulfillment-tracking-number" className="mt-4 block text-sm font-medium">运单号（可选）</label><input id="fulfillment-tracking-number" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createFulfillment() }} placeholder="如果已有运单号，现在填写即可" className="mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm outline-none focus:border-ui-border-interactive" /><Text size="small" className="mt-2 text-ui-fg-subtle">本次将发出 {fulfillmentItems.reduce((sum, item) => sum + item.quantity, 0)} 件商品。</Text></>}{detailsError && <Text className="mt-3 text-ui-fg-error">{detailsError}</Text>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={savingTracking} onClick={() => setFulfillmentOpen(false)} className="rounded-md border border-ui-border-base px-3 py-2 text-sm">取消</button><button type="button" disabled={savingTracking || loadingFulfillmentOptions || !fulfillmentLocationId || !fulfillmentItems.length} onClick={() => void createFulfillment()} className="rounded-md bg-ui-bg-interactive px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{savingTracking ? "正在处理…" : trackingNumber.trim() ? "发货并登记运单" : "创建发货单"}</button></div></div></div>}
    </div>
  )
}

export const config = defineRouteConfig({ label: "订单工作台", rank: 1 })

export default OrderCenterPage
