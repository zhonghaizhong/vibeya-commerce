import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Locale = "en-US" | "en-CA" | "ja-JP" | "es-MX"
type ProductCopy = {
  name: string
  detailTitle: string
  short: string
  eyebrow: string
  intro: string
  seoTitle: string
  seoDescription: string
  sizeGuide: string
  sizeNote: string
  variantSummary: string
  colorOptionLabel: string
  sizeOptionLabel: string
  productDetails: string
  productionDetails: string
  salesNotice: string
  galleryNote: string
  highlights: string[]
  services: [string, string][]
  sizeRows: (string | number)[][]
  measurementRows: [string, string][]
}
type Product = { id: string; title: string; handle: string; status: string; content: Partial<Record<Locale, ProductCopy>>; content_source?: Partial<Record<Locale, string>> }

const locales: { value: Locale; label: string }[] = [
  { value: "en-US", label: "美国 · English" },
  { value: "en-CA", label: "加拿大 · English" },
  { value: "ja-JP", label: "日本 · 日本語" },
  { value: "es-MX", label: "墨西哥 · Español" },
]
const emptyCopy: ProductCopy = {
  name: "", detailTitle: "", short: "", eyebrow: "", intro: "", seoTitle: "", seoDescription: "",
  sizeGuide: "", sizeNote: "", variantSummary: "", colorOptionLabel: "", sizeOptionLabel: "",
  productDetails: "", productionDetails: "", salesNotice: "", galleryNote: "",
  highlights: [], services: [], sizeRows: [], measurementRows: [],
}
const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"
const labelClass = "text-sm font-medium text-ui-fg-base"
const lines = (values: string[]) => values.join("\n")
const parseLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean)
const pairsToLines = (values: [string, string][]) => values.map(([first, second]) => `${first} | ${second}`).join("\n")
const parsePairs = (value: string): [string, string][] => value.split("\n").map((line) => {
  const divider = line.indexOf("|")
  return (divider < 0 ? [line.trim(), ""] : [line.slice(0, divider).trim(), line.slice(divider + 1).trim()]) as [string, string]
}).filter(([first, second]) => first || second)
const rowsToLines = (values: (string | number)[][]) => values.map((row) => row.join(" | ")).join("\n")
const parseRows = (value: string) => value.split("\n").map((line) => line.split("|").map((cell) => cell.trim())).filter((row) => row.some(Boolean))
const requiredContentFields: Array<[string, keyof ProductCopy]> = [
  ["商品卡片名称", "name"],
  ["详情页标题", "detailTitle"],
  ["商品介绍", "intro"],
  ["商品详情说明", "productDetails"],
  ["生产与配送说明", "productionDetails"],
  ["SEO 标题", "seoTitle"],
  ["SEO 描述", "seoDescription"],
]
const getMissingRequiredFields = (content: Partial<ProductCopy>) => requiredContentFields
  .filter(([, field]) => !String(content[field] ?? "").trim())
  .map(([label]) => label)

const ProductContentPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState("")
  const [locale, setLocale] = useState<Locale>("en-US")
  const [draft, setDraft] = useState<ProductCopy>(emptyCopy)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/product-content", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json() as { error?: string; products?: Product[] }
      if (!response.ok) throw new Error(data.error || "读取商品内容失败。")
      const nextProducts = data.products ?? []
      setProducts(nextProducts)
      const params = new URLSearchParams(window.location.search)
      const requestedProductId = params.get("productId")
      const requestedLocale = params.get("locale")
      if (requestedProductId || requestedLocale) {
        params.delete("productId")
        params.delete("locale")
        const remainingSearch = params.toString()
        window.history.replaceState(null, "", `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}${window.location.hash}`)
      }
      setProductId((current) => requestedProductId && nextProducts.some((product) => product.id === requestedProductId)
        ? requestedProductId
        : current && nextProducts.some((product) => product.id === current) ? current : nextProducts[0]?.id ?? "")
      if (requestedLocale && locales.some((item) => item.value === requestedLocale)) setLocale(requestedLocale as Locale)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取商品内容失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const selectedProduct = products.find((product) => product.id === productId)
  const savedCopy = selectedProduct?.content?.[locale] ?? emptyCopy
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedCopy)
  const missingRequired = getMissingRequiredFields(draft)

  useEffect(() => {
    setDraft({ ...emptyCopy, ...savedCopy })
    setMessage("")
  }, [productId, locale, products])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [isDirty])

  const update = <K extends keyof ProductCopy>(key: K, value: ProductCopy[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const save = async () => {
    if (!selectedProduct || !isDirty) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/product-content", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, locale, content: draft }),
      })
      const data = await response.json() as { error?: string; content?: ProductCopy }
      if (!response.ok) throw new Error(data.error || "保存商品内容失败。")
      const content = data.content ?? draft
      setProducts((current) => current.map((product) => product.id === productId
        ? { ...product, content: { ...product.content, [locale]: content }, content_source: { ...product.content_source, [locale]: "backend" } }
        : product
      ))
      setDraft(content)
      setMessage("已保存。前台会使用已填写的内容；留空的项目继续使用当前默认文案。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存商品内容失败。")
    } finally {
      setSaving(false)
    }
  }

  const initializeDefaults = async () => {
    if (isDirty) return
    if (!window.confirm("将把当前线上商品页面已有的文案复制到 Medusa 后台。已有后台内容会保留，之后可以在这里逐项编辑。继续吗？")) return
    setInitializing(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/product-content", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initializeDefaults: true }),
      })
      const data = await response.json() as { error?: string; initialized?: number }
      if (!response.ok) throw new Error(data.error || "导入当前商品文案失败。")
      await load()
      setMessage(`已将 ${data.initialized ?? 0} 款商品的现有文案导入后台；已有商品文案已保留。`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入当前商品文案失败。")
    } finally {
      setInitializing(false)
    }
  }

  const activeProducts = useMemo(() => products.filter((product) => product.status === "published"), [products])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level="h1">商品展示内容</Heading>
          <Text className="mt-1 text-ui-fg-subtle">编辑商品详情文案、卖点和搜索摘要。页面布局、价格、颜色尺码和图片仍沿用当前商品设置。</Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void initializeDefaults()} disabled={loading || saving || initializing || isDirty} title={isDirty ? "请先保存或放弃当前修改" : undefined} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50">{initializing ? "导入中…" : "导入当前网站文案"}</button>
          <button type="button" onClick={() => { if (!isDirty || window.confirm("刷新会放弃当前未保存的修改，确定继续吗？")) void load() }} disabled={loading || saving || initializing} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50">刷新商品</button>
        </div>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}

      <Container className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Heading level="h2">多站点内容总览</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">快速查看已上架商品在各站点的必填内容和当前来源。选择一个状态即可编辑对应商品和语言。</Text>
          </div>
          <Text size="small" className="text-ui-fg-subtle">检查 7 项：名称、详情、介绍、配送说明和 SEO</Text>
        </div>
        {loading ? <Text className="mt-4">正在读取商品…</Text> : activeProducts.length ? <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ui-border-base text-ui-fg-subtle">
                <th className="px-3 py-3 font-medium">商品</th>
                {locales.map((item) => <th key={item.value} className="px-3 py-3 font-medium">{item.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {activeProducts.map((product) => <tr key={product.id} className="border-b border-ui-border-base last:border-0">
                <td className="px-3 py-3 font-medium text-ui-fg-base">{product.title}</td>
                {locales.map((item) => {
                  const missing = getMissingRequiredFields(product.content?.[item.value] ?? {})
                  const isManaged = product.content_source?.[item.value] === "backend"
                  return <td key={item.value} className="px-2 py-2">
                    <button type="button" onClick={() => { if (isDirty && !window.confirm("切换商品或语言会放弃当前未保存的修改，确定继续吗？")) return; setProductId(product.id); setLocale(item.value) }} className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${productId === product.id && locale === item.value ? "border-ui-border-interactive bg-ui-bg-interactive-subtle" : "border-ui-border-base hover:bg-ui-bg-subtle"}`}>
                      <span className={`block font-medium ${missing.length ? "text-ui-fg-warning" : "text-ui-fg-positive"}`}>{missing.length ? `缺少 ${missing.length} 项` : "必填项齐全"}</span>
                      <span className="mt-1 block text-xs text-ui-fg-subtle">{isManaged ? "后台已接管" : "使用当前网站默认内容"}</span>
                    </button>
                  </td>
                })}
              </tr>)}
            </tbody>
          </table>
        </div> : <Text className="mt-4 block text-ui-fg-subtle">暂无已上架商品。</Text>}
      </Container>

      <Container className="flex flex-wrap gap-4 p-4">
        <label className="min-w-[260px] flex-1 text-sm font-medium text-ui-fg-base">商品
          <select className={inputClass} value={productId} onChange={(event) => { if (isDirty && !window.confirm("切换商品会放弃当前未保存的修改，确定继续吗？")) return; setProductId(event.target.value) }} disabled={loading || saving}>
            {activeProducts.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
          </select>
        </label>
        <label className="min-w-[220px] text-sm font-medium text-ui-fg-base">站点语言
          <select className={inputClass} value={locale} onChange={(event) => { if (isDirty && !window.confirm("切换语言会放弃当前未保存的修改，确定继续吗？")) return; setLocale(event.target.value as Locale) }} disabled={saving}>
            {locales.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </Container>

      {!loading && selectedProduct && <Container className="flex flex-col gap-5 p-5">
        <div className={missingRequired.length ? "rounded-lg border border-ui-border-warning bg-ui-bg-warning p-4" : "rounded-lg border border-ui-border-positive bg-ui-bg-subtle p-4"}>
          <Text className="font-medium text-ui-fg-base">{missingRequired.length ? "内容检查：尚有必填项" : "内容检查：核心字段齐全"}</Text>
          <Text size="small" className="mt-1 text-ui-fg-subtle">{missingRequired.length ? `当前语言缺少：${missingRequired.join("、")}。补齐后再核对该站点的前台展示。` : "名称、详情、配送和 SEO 内容均已填写。请继续核对该站点的商品规格与图片。"} </Text>
        </div>
        <div className="rounded-lg bg-ui-bg-subtle p-4">
          <Text className="font-medium text-ui-fg-base">逐步接管现有内容</Text>
          <Text size="small" className="mt-1 text-ui-fg-subtle">还没填写的字段不会清空线上现有文案。保存后，已填写的字段由后台内容覆盖；空白字段继续使用当前内容，便于逐款迁移和核对。</Text>
          <Text size="small" className="mt-2 text-ui-fg-subtle">当前语言来源：{selectedProduct.content_source?.[locale] === "backend" ? "Medusa 后台" : "线上当前页面默认内容"}</Text>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>商品卡片名称<input className={inputClass} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label className={labelClass}>商品详情页标题<input className={inputClass} value={draft.detailTitle} onChange={(event) => update("detailTitle", event.target.value)} /></label>
          <label className={labelClass}>商品卡片短描述<input className={inputClass} value={draft.short} onChange={(event) => update("short", event.target.value)} /></label>
          <label className={labelClass}>详情页眉标签<input className={inputClass} value={draft.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} /></label>
          <label className={labelClass}>颜色选项名称<input className={inputClass} value={draft.colorOptionLabel} onChange={(event) => update("colorOptionLabel", event.target.value)} /></label>
          <label className={labelClass}>尺码/规格选项名称<input className={inputClass} value={draft.sizeOptionLabel} onChange={(event) => update("sizeOptionLabel", event.target.value)} /></label>
          <label className={labelClass}>颜色和尺码摘要<input className={inputClass} value={draft.variantSummary} onChange={(event) => update("variantSummary", event.target.value)} /></label>
        </section>

        <label className={labelClass}>商品介绍<textarea className={inputClass} rows={4} value={draft.intro} onChange={(event) => update("intro", event.target.value)} /></label>
        <label className={labelClass}>商品卖点（每行一条）<textarea className={inputClass} rows={4} value={lines(draft.highlights)} onChange={(event) => update("highlights", parseLines(event.target.value))} /></label>
        <label className={labelClass}>详情页服务卡片（每行“标题 | 说明”）<textarea className={inputClass} rows={4} value={pairsToLines(draft.services)} onChange={(event) => update("services", parsePairs(event.target.value))} /></label>
        <section className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>商品详情说明<textarea className={inputClass} rows={4} value={draft.productDetails} onChange={(event) => update("productDetails", event.target.value)} /></label>
          <label className={labelClass}>生产与配送说明<textarea className={inputClass} rows={4} value={draft.productionDetails} onChange={(event) => update("productionDetails", event.target.value)} /></label>
          <label className={labelClass}>设计示例说明<textarea className={inputClass} rows={4} value={draft.galleryNote} onChange={(event) => update("galleryNote", event.target.value)} /></label>
          <label className={labelClass}>购买提示<textarea className={inputClass} rows={4} value={draft.salesNotice} onChange={(event) => update("salesNotice", event.target.value)} /></label>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>尺码表（每行用“ | ”分隔一行数据）<textarea className={inputClass} rows={5} value={rowsToLines(draft.sizeRows)} onChange={(event) => update("sizeRows", parseRows(event.target.value))} /></label>
          <label className={labelClass}>尺寸/材质表（每行“名称 | 说明”）<textarea className={inputClass} rows={5} value={pairsToLines(draft.measurementRows)} onChange={(event) => update("measurementRows", parsePairs(event.target.value))} /></label>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>尺码表标题<input className={inputClass} value={draft.sizeGuide} onChange={(event) => update("sizeGuide", event.target.value)} /></label>
          <label className={labelClass}>尺码说明<textarea className={inputClass} rows={3} value={draft.sizeNote} onChange={(event) => update("sizeNote", event.target.value)} /></label>
        </section>

        <section className="flex flex-col gap-4 border-t border-ui-border-base pt-5">
          <Heading level="h2">搜索引擎内容 · {locale}</Heading>
          <label className={labelClass}>SEO 标题<input className={inputClass} value={draft.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /></label>
          <label className={labelClass}>SEO 描述<textarea className={inputClass} rows={3} value={draft.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} /></label>
        </section>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-ui-border-base bg-ui-bg-base/95 py-3 backdrop-blur">
          <Text size="small" className={isDirty ? "text-ui-fg-warning" : "text-ui-fg-subtle"}>{isDirty ? "有尚未保存的修改" : `内容语言：${locale}`}</Text>
          <button type="button" disabled={saving || !isDirty} onClick={() => void save()} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{saving ? "保存中…" : "保存商品内容"}</button>
        </div>
      </Container>}

      {!loading && !activeProducts.length && <Container className="p-8 text-center"><Text>还没有已发布的 VIBEYA 商品。</Text></Container>}
      {loading && <Container className="p-6"><Text>正在读取商品…</Text></Container>}
    </div>
  )
}

export const config = defineRouteConfig({ label: "商品展示内容", nested: "/products", rank: 1 })

export default ProductContentPage
