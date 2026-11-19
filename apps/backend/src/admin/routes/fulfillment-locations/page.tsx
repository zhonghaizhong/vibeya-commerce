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

const countryNames: Record<string, string> = { us: "美国", ca: "加拿大", jp: "日本", mx: "墨西哥" }
const countryLabel = (code: string) => `${code.toUpperCase()}${countryNames[code] ? ` · ${countryNames[code]}` : ""}`

const FulfillmentLocationsPage = () => {
  const [locations, setLocations] = useState<Location[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [countryCodes, setCountryCodes] = useState<string[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [savedDraft, setSavedDraft] = useState<Draft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
  const resetToNewLocation = () => {
    const next = { ...emptyDraft, country_code: countryCodes.includes("us") ? "US" : countryCodes[0]?.toUpperCase() ?? "" }
    setDraft(next)
    setSavedDraft(next)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/fulfillment-locations", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取仓库信息失败。")
      setLocations(data.locations ?? [])
      setProducts(data.products ?? [])
      const availableCountries: string[] = data.country_codes ?? []
      setCountryCodes(availableCountries)
      const nextEmptyDraft = { ...emptyDraft, country_code: availableCountries.includes("us") ? "US" : availableCountries[0]?.toUpperCase() ?? "" }
      setDraft((current) => current.id ? current : nextEmptyDraft)
      setSavedDraft((current) => current.id ? current : nextEmptyDraft)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取仓库信息失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!isDirty) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [isDirty])

  const edit = (location: Location) => {
    const next = {
      id: location.id,
      name: location.name,
      address_1: location.address?.address_1 ?? "",
      address_2: location.address?.address_2 ?? "",
      city: location.address?.city ?? "",
      province: location.address?.province ?? "",
      postal_code: location.address?.postal_code ?? "",
      country_code: location.address?.country_code?.toUpperCase() ?? "US",
      product_ids: location.product_ids ?? [],
    }
    setDraft(next)
    setSavedDraft(next)
  }

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
      if (!response.ok) throw new Error(data.error || "保存仓库信息失败。")
      resetToNewLocation()
      setNotice("仓库和关联商品已保存。")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存仓库信息失败。")
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof Omit<Draft, "id" | "product_ids" | "country_code">, label: string, required = false) => (
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
          <Heading level="h1">仓库与配送</Heading>
          <Text className="mt-1 text-ui-fg-subtle">为仓库填写实际地址，并关联由该仓库发货的商品。顾客只能购买配送到所选国家/地区的商品；订单发货时请按对应仓库创建发货单。</Text>
        </div>
        <button type="button" onClick={() => { if (!isDirty || window.confirm("刷新可能放弃当前未保存的仓库修改，确定继续吗？")) void load() }} disabled={loading || saving} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium disabled:opacity-50">{loading ? "读取中…" : "刷新"}</button>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {notice && <Container className="border border-ui-border-base p-4"><Text className="text-ui-fg-positive">{notice}</Text></Container>}

      <Container className="p-5">
        <Heading level="h2">{draft.id ? "修改仓库" : "添加仓库"}</Heading>
        <form className="mt-4 flex flex-col gap-4" onSubmit={save}>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("name", "仓库名称", true)}
            {field("address_1", "街道地址", true)}
            {field("address_2", "地址补充")}
            {field("city", "城市", true)}
            {field("province", "州 / 省 / 地区", true)}
            {field("postal_code", "邮政编码")}
            <label className="flex flex-col gap-1 text-sm font-medium text-ui-fg-base">
              国家 / 地区
              <select
                required
                value={draft.country_code}
                disabled={Boolean(draft.id) || loading || countryCodes.length === 0}
                onChange={(event) => setDraft((current) => ({ ...current, country_code: event.target.value }))}
                className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 font-normal disabled:opacity-60"
              >
                {draft.id && !countryCodes.includes(draft.country_code.toLowerCase()) && <option value={draft.country_code}>{countryLabel(draft.country_code.toLowerCase())} · 已配置仓库</option>}
                {countryCodes.map((code) => <option key={code} value={code.toUpperCase()}>{countryLabel(code)}</option>)}
              </select>
              {draft.id && <Text size="small" className="text-ui-fg-subtle">创建仓库后不能直接更改国家/地区；如需更换，请新建对应国家的仓库。</Text>}
              {!countryCodes.length && !loading && <Text size="small" className="text-ui-fg-warning">还没有可选国家。请先在 Medusa「设置 → 销售区域」配置国家和币种。</Text>}
            </label>
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
            <button type="submit" disabled={saving || loading || !isDirty || (!draft.id && countryCodes.length === 0)} className="rounded-md bg-ui-bg-interactive px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{saving ? "保存中…" : draft.id ? "保存修改" : "添加仓库"}</button>
            {draft.id && <button type="button" onClick={() => { if (!isDirty || window.confirm("放弃当前未保存的仓库修改？")) resetToNewLocation() }} className="rounded-md border border-ui-border-base px-4 py-2 text-sm">取消修改</button>}
          </div>
        </form>
      </Container>

      <div className="flex flex-col gap-3">
        <Heading level="h2">已配置的仓库</Heading>
        {locations.length === 0 && !loading && <Container className="p-5"><Text>暂时没有仓库，请在上方添加。</Text></Container>}
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
              <button type="button" onClick={() => { if (!isDirty || window.confirm("切换仓库会放弃当前未保存的修改，确定继续吗？")) edit(location) }} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium">编辑</button>
            </Container>
          )
        })}
      </div>
      <Container className="p-4"><Text size="small" className="text-ui-fg-subtle">系统会保存仓库及商品关联。订单履约时仍需选择实际发货仓库；订单包含不同仓库的商品时，请拆分为多个发货单。</Text></Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "仓库与配送", rank: 5 })

export default FulfillmentLocationsPage
