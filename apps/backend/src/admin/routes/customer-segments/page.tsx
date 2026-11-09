import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Customer = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  registered_at: string | null
  is_registered: boolean
  has_active_cart: boolean
  cart_item_count: number
  cart_updated_at: string | null
  order_count: number
  paid_order_count: number
  last_order_at: string | null
  last_paid_order_at: string | null
  design_total: number | null
  design_used: number | null
  design_remaining: number | null
}

type Summary = { total: number; registered: number; withCart: number; ordered: number; paid: number }
type Segment = "all" | "registered" | "cart" | "ordered" | "paid"

const tabs: { id: Segment; label: string; count: (summary: Summary) => number }[] = [
  { id: "all", label: "全部客户", count: (summary) => summary.total },
  { id: "registered", label: "已注册", count: (summary) => summary.registered },
  { id: "cart", label: "加过购物车", count: (summary) => summary.withCart },
  { id: "ordered", label: "已下单", count: (summary) => summary.ordered },
  { id: "paid", label: "已支付", count: (summary) => summary.paid },
]

const formatDate = (value: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN")
}

const CustomerSegmentsPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, registered: 0, withCart: 0, ordered: 0, paid: 0 })
  const [segment, setSegment] = useState<Segment>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [editingDesignCustomerId, setEditingDesignCustomerId] = useState("")
  const [designRemainingDraft, setDesignRemainingDraft] = useState("")
  const [savingDesignCustomerId, setSavingDesignCustomerId] = useState("")

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/customers", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取客户信息失败。")
      setCustomers(data.customers ?? [])
      setSummary(data.summary ?? { total: 0, registered: 0, withCart: 0, ordered: 0, paid: 0 })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取客户信息失败。")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const refreshVisibleList = () => {
      if (document.visibilityState === "visible" && !editingDesignCustomerId) void load(true)
    }
    const timer = window.setInterval(refreshVisibleList, 20000)
    window.addEventListener("focus", refreshVisibleList)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", refreshVisibleList)
    }
  }, [load, editingDesignCustomerId])

  const saveDesignRemaining = async (customer: Customer) => {
    if (!designRemainingDraft.trim()) {
      setError("请输入剩余设计次数。")
      return
    }
    const designRemaining = Number(designRemainingDraft)
    if (!Number.isInteger(designRemaining) || designRemaining < 0 || designRemaining > 10000) {
      setError("剩余设计次数必须是 0 到 10,000 之间的整数。")
      return
    }
    setSavingDesignCustomerId(customer.id)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/customers", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, designRemaining }),
      })
      const data = await response.json() as {
        error?: string
        designTotal?: number
        designUsed?: number
        designRemaining?: number
      }
      if (!response.ok) throw new Error(data.error || "保存设计次数失败。")
      setEditingDesignCustomerId("")
      setCustomers((current) => current.map((row) => row.id === customer.id
        ? {
            ...row,
            design_total: Number.isInteger(data.designTotal) ? data.designTotal! : row.design_total,
            design_used: Number.isInteger(data.designUsed) ? data.designUsed! : row.design_used,
            design_remaining: Number.isInteger(data.designRemaining) ? data.designRemaining! : designRemaining,
          }
        : row
      ))
      setMessage(`已将 ${customer.email || "该客户"} 的剩余设计次数设为 ${Number.isInteger(data.designRemaining) ? data.designRemaining : designRemaining} 次。`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存设计次数失败。")
    } finally {
      setSavingDesignCustomerId("")
    }
  }

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((customer) => {
      const inSegment = segment === "all"
        || (segment === "registered" && customer.is_registered)
        || (segment === "cart" && customer.has_active_cart)
        || (segment === "ordered" && customer.order_count > 0)
        || (segment === "paid" && customer.paid_order_count > 0)
      const haystack = [customer.first_name, customer.last_name, customer.email, customer.phone].join(" ").toLowerCase()
      return inSegment && (!query || haystack.includes(query))
    })
  }, [customers, search, segment])

  return (
    <div className="flex flex-col gap-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level="h1">客户分组</Heading>
          <Text className="mt-1 text-ui-fg-subtle">按注册、购物车、下单、支付和设计额度汇总客户。新订单会自动同步（页面打开时每 20 秒更新一次）；已用次数按真实任务统计，剩余设计次数可单独修改。</Text>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50">
          {loading ? "同步中…" : "刷新客户信息"}
        </button>
      </div>

      {message && <Container className="border border-ui-border-base p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setSegment(tab.id)} className={`rounded-lg border p-4 text-left transition-colors ${segment === tab.id ? "border-ui-border-interactive bg-ui-bg-interactive-subtle" : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle"}`}>
            <Text size="small" className="text-ui-fg-subtle">{tab.label}</Text>
            <div className="mt-1 text-2xl font-semibold text-ui-fg-base">{tab.count(summary)}</div>
          </button>
        ))}
      </div>

      <Container className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-base p-4">
          <div>
            <Heading level="h2">{tabs.find((tab) => tab.id === segment)?.label}</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">同一客户可同时出现在多个分组中。</Text>
          </div>
          <input
            aria-label="搜索客户"
            className="w-full max-w-sm rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"
            placeholder="搜索姓名、邮箱或电话"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? <div className="p-6"><Text>正在同步客户信息…</Text></div> : visibleCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <Text>{error ? "客户信息暂时无法显示。" : search ? "没有匹配的客户。" : "这个分组暂时没有客户。"}</Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-ui-bg-subtle text-ui-fg-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">客户</th>
                  <th className="px-4 py-3 font-medium">注册状态</th>
                  <th className="px-4 py-3 font-medium">购物车</th>
                  <th className="px-4 py-3 font-medium">已下单</th>
                  <th className="px-4 py-3 font-medium">已支付</th>
                  <th className="px-4 py-3 font-medium">最近下单</th>
                  <th className="px-4 py-3 font-medium">最近支付</th>
                  <th className="px-4 py-3 font-medium">已用/占用设计次数</th>
                  <th className="px-4 py-3 font-medium">剩余设计次数（可修改）</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((customer) => {
                  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ")
                  return (
                    <tr key={customer.id} className="border-t border-ui-border-base">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ui-fg-base">{name || "未填写姓名"}</div>
                        <div className="mt-0.5 text-ui-fg-subtle">{customer.email || "没有邮箱"}</div>
                        {customer.phone && <div className="mt-0.5 text-ui-fg-subtle">{customer.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${customer.is_registered ? "bg-ui-bg-positive text-ui-fg-positive" : "bg-ui-bg-subtle text-ui-fg-subtle"}`}>
                          {customer.is_registered ? "已注册" : "访客"}
                        </span>
                        {customer.registered_at && <div className="mt-1 text-xs text-ui-fg-subtle">{formatDate(customer.registered_at)}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {customer.has_active_cart ? <><div>{customer.cart_item_count} 件商品</div><div className="mt-0.5 text-xs text-ui-fg-subtle">更新于 {formatDate(customer.cart_updated_at)}</div></> : <span className="text-ui-fg-subtle">无未结账商品</span>}
                      </td>
                      <td className="px-4 py-3">{customer.order_count}</td>
                      <td className="px-4 py-3">{customer.paid_order_count}</td>
                      <td className="px-4 py-3">{formatDate(customer.last_order_at)}</td>
                      <td className="px-4 py-3">{formatDate(customer.last_paid_order_at)}</td>
                      <td className="px-4 py-3">{customer.design_used ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">
                        {editingDesignCustomerId === customer.id ? (
                          <div className="flex min-w-[210px] flex-wrap items-center gap-2">
                            <input
                              aria-label={`${customer.email} 剩余设计次数`}
                              type="number"
                              min={0}
                              max={10000}
                              step={1}
                              autoFocus
                              value={designRemainingDraft}
                              onChange={(event) => setDesignRemainingDraft(event.target.value)}
                              onKeyDown={(event) => { if (event.key === "Enter") void saveDesignRemaining(customer) }}
                              className="w-20 rounded-md border border-ui-border-base bg-ui-bg-field px-2 py-1 text-sm text-ui-fg-base"
                            />
                            <button type="button" onClick={() => void saveDesignRemaining(customer)} disabled={savingDesignCustomerId === customer.id} className="rounded-md bg-ui-bg-interactive px-2 py-1 text-xs font-medium text-ui-fg-on-color disabled:opacity-50">
                              {savingDesignCustomerId === customer.id ? "保存中…" : "保存"}
                            </button>
                            <button type="button" onClick={() => setEditingDesignCustomerId("")} disabled={savingDesignCustomerId === customer.id} className="rounded-md border border-ui-border-base px-2 py-1 text-xs text-ui-fg-subtle disabled:opacity-50">取消</button>
                          </div>
                        ) : (
                          <div className="flex min-w-[150px] items-center gap-2">
                            <span>{customer.design_remaining ?? "—"}</span>
                            <button
                              type="button"
                              disabled={!customer.is_registered || customer.design_remaining === null}
                              onClick={() => {
                                setError("")
                                setMessage("")
                                setEditingDesignCustomerId(customer.id)
                                setDesignRemainingDraft(String(customer.design_remaining ?? 0))
                              }}
                              className="rounded-md border border-ui-border-base px-2 py-1 text-xs font-medium text-ui-fg-base disabled:cursor-not-allowed disabled:opacity-40"
                            >修改</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="border-t border-ui-border-base px-4 py-3 text-xs text-ui-fg-subtle">显示 {visibleCustomers.length} 位客户。访客购物车仅在系统记录了客户 ID 或邮箱时才能归入客户列表。</div>
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "客户分组", rank: 4 })

export default CustomerSegmentsPage
