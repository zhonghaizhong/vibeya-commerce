import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Product = { id: string; title: string; handle: string; status: string }
type Location = {
  id: string
  name: string
  address?: {
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country_code?: string | null
  } | null
  product_ids: string[]
}
type Draft = {
  id: string
  name: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
  product_ids: string[]
}

const emptyDraft: Draft = {
  id: "", name: "", address_1: "", address_2: "", city: "", province: "", postal_code: "", country_code: "US", product_ids: [],
}

const FulfillmentLocationsPage = () => {
  const [locations, setLocations] = useState<Location[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/fulfillment-locations", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取发货地址失败。")
      setLocations(data.locations ?? [])
      setProducts(data.products ?? [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取发货地址失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const edit = (location: Location) => setDraft({
    id: location.id,
    name: location.name,
    address_1: location.address?.address_1 ?? "",
    address_2: location.address?.address_2 ?? "",
    city: location.address?.city ?? "",
    province: location.address?.province ?? "",
    postal_code: location.address?.postal_code ?? "",
    country_code: location.address?.country_code?.toUpperCase() ?? "US",
    product_ids: location.product_ids ?? [],
  })

  const toggleProduct = (productId: string) => setDraft((current) => ({
    ...current,
    product_ids: current.product_ids.includes(productId)
      ? current.product_ids.filter((id) => id !== productId)
      : [...current.product_ids, productId],
  }))

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/admin/vibeya/fulfillment-locations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "保存发货地址失败。")
      setDraft(emptyDraft)
      setNotice("发货地址和关联商品已保存。")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存发货地址失败。")
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof Omit<Draft, "id" | "product_ids">, label: string, required = false) => (
    <label className="flex flex-col gap-1 text-sm font-medium text-ui-fg-base" key={key}>
      {label}
      <input
        required={required}
        value={draft[key]}
        onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
        className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 font-normal"
      />
    </label>
  )

  return (
    <div className="flex max-w-5xl flex-col gap-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level="h1">发货地址</Heading>
          <Text className="mt-1 text-ui-fg-subtle">添加多个美国仓库，并为每个仓库勾选负责发货的商品。订单发货时，按商品对应仓库选择发货地址；不同仓库商品请分开发货。</Text>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium disabled:opacity-50">{loading ? "读取中…" : "刷新"}</button>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {notice && <Container className="border border-ui-border-base p-4"><Text className="text-ui-fg-positive">{notice}</Text></Container>}

      <Container className="p-5">
        <Heading level="h2">{draft.id ? "修改发货地址" : "添加发货地址"}</Heading>
        <form className="mt-4 flex flex-col gap-4" onSubmit={save}>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("name", "仓库名称", true)}
            {field("address_1", "街道地址", true)}
            {field("address_2", "地址补充")}
            {field("city", "城市", true)}
            {field("province", "州", true)}
            {field("postal_code", "邮政编码")}
            {field("country_code", "国家/地区代码（例如 US）", true)}
          </div>
          <div>
            <Text className="font-medium">关联商品</Text>
            <Text size="small" className="mb-2 mt-1 text-ui-fg-subtle">勾选后，此仓库会显示为这些商品的可选发货地点。</Text>
            {loading ? <Text>正在读取商品…</Text> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 rounded-md border border-ui-border-base p-3 text-sm">
                    <input type="checkbox" checked={draft.product_ids.includes(product.id)} onChange={() => toggleProduct(product.id)} />
                    <span>{product.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || loading} className="rounded-md bg-ui-bg-interactive px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{saving ? "保存中…" : draft.id ? "保存修改" : "添加地址"}</button>
            {draft.id && <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-md border border-ui-border-base px-4 py-2 text-sm">取消修改</button>}
          </div>
        </form>
      </Container>

      <div className="flex flex-col gap-3">
        <Heading level="h2">已配置的发货地点</Heading>
        {locations.length === 0 && !loading && <Container className="p-5"><Text>暂时没有发货地址，请在上方添加。</Text></Container>}
        {locations.map((location) => {
          const address = location.address
          const assigned = products.filter((product) => location.product_ids?.includes(product.id))
          return (
            <Container key={location.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <Text className="font-semibold">{location.name}</Text>
                <Text className="mt-1 text-ui-fg-subtle">{[address?.address_1, address?.address_2, address?.city, address?.province, address?.postal_code, address?.country_code].filter(Boolean).join(", ")}</Text>
                <Text size="small" className="mt-2 text-ui-fg-subtle">关联商品：{assigned.length ? assigned.map((product) => product.title).join("、") : "尚未关联"}</Text>
              </div>
              <button type="button" onClick={() => edit(location)} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium">编辑</button>
            </Container>
          )
        })}
      </div>
      <Container className="p-4"><Text size="small" className="text-ui-fg-subtle">系统会保存仓库及商品关联，订单履约页面仍需由你选择实际发货地点。订单包含不同仓库的商品时，请拆分为多个发货单。</Text></Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "发货地址", rank: 5 })

export default FulfillmentLocationsPage
