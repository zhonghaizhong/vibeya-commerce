import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Locale = "en-US" | "en-CA" | "ja-JP" | "es-MX"
type CategoryCopy = { label: string; seoTitle: string; description: string }
type Category = { label: string; productHandles: string[]; legacyHandles: string[]; locales: Partial<Record<Locale, CategoryCopy>> }
type Product = { id: string; title: string; handle: string; status: string }
const locales: { value: Locale; label: string }[] = [
  { value: "en-US", label: "美国 · English" },
  { value: "en-CA", label: "加拿大 · English" },
  { value: "ja-JP", label: "日本 · 日本語" },
  { value: "es-MX", label: "墨西哥 · Español" },
]
const emptyCopy: CategoryCopy = { label: "", seoTitle: "", description: "" }
const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"
const categoryName = (slug: string) => slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")

const CategoryContentPage = () => {
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [slug, setSlug] = useState("")
  const [locale, setLocale] = useState<Locale>("en-US")
  const [draft, setDraft] = useState<CategoryCopy>(emptyCopy)
  const [productHandles, setProductHandles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/category-content", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json() as { error?: string; categories?: Record<string, Category>; products?: Product[] }
      if (!response.ok) throw new Error(data.error || "读取分类内容失败。")
      setCategories(data.categories ?? {})
      setProducts(data.products ?? [])
      setSlug((current) => current && data.categories?.[current] ? current : Object.keys(data.categories ?? {})[0] ?? "")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取分类内容失败。")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const selected = categories[slug]
  const savedCopy = selected?.locales?.[locale] ?? emptyCopy
  const savedHandles = selected?.productHandles ?? []
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedCopy) || JSON.stringify(productHandles) !== JSON.stringify(savedHandles)
  const categoryReady = Boolean(draft.label.trim() && draft.seoTitle.trim() && draft.description.trim() && productHandles.length)
  useEffect(() => {
    setDraft({ ...(categories[slug]?.locales?.[locale] ?? emptyCopy) })
    setProductHandles([...(categories[slug]?.productHandles ?? [])])
    setMessage("")
  }, [categories, slug, locale])
  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [dirty])

  const toggleProduct = (handle: string) => setProductHandles((current) => current.includes(handle)
    ? current.filter((item) => item !== handle)
    : [...current, handle])
  const save = async () => {
    if (!selected || !dirty) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/category-content", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, locale, copy: draft, productHandles }),
      })
      const data = await response.json() as { error?: string; category?: Category }
      if (!response.ok) throw new Error(data.error || "保存分类设置失败。")
      if (data.category) setCategories((current) => ({ ...current, [slug]: data.category! }))
      setMessage("分类文案与商品归属已保存。前台只会显示当前站点实际可配送的商品。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存分类设置失败。")
    } finally {
      setSaving(false)
    }
  }

  const initializeDefaults = async () => {
    if (dirty) return
    if (!window.confirm("将把当前网站已有的分类文案、SEO 和商品归属复制到 Medusa 后台。已有后台修改会保留。继续吗？")) return
    setInitializing(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/category-content", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initializeDefaults: true }),
      })
      const data = await response.json() as { error?: string; initialized?: number }
      if (!response.ok) throw new Error(data.error || "导入当前分类内容失败。")
      await load()
      setMessage(`已将 ${data.initialized ?? 0} 个分类的现有内容导入后台；已有修改已保留。`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入当前分类内容失败。")
    } finally {
      setInitializing(false)
    }
  }

  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.title.localeCompare(b.title)), [products])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level="h1">分类与 SEO 内容</Heading>
          <Text className="mt-1 text-ui-fg-subtle">维护六个既定分类页的当地文案和商品归属。分类网址固定，站点只展示本地可配送的关联商品。</Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void initializeDefaults()} disabled={loading || saving || initializing || dirty} title={dirty ? "请先保存或放弃当前修改" : undefined} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50">{initializing ? "导入中…" : "导入当前网站文案"}</button>
          <button type="button" onClick={() => { if (!dirty || window.confirm("刷新会放弃当前未保存的修改，确定继续吗？")) void load() }} disabled={loading || saving || initializing} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50">刷新资料</button>
        </div>
      </div>
      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}

      <Container className="grid gap-4 p-4 md:grid-cols-2">
        <label className="text-sm font-medium text-ui-fg-base">分类网址
          <select className={inputClass} value={slug} onChange={(event) => { if (dirty && !window.confirm("切换分类会放弃当前未保存的修改，确定继续吗？")) return; setSlug(event.target.value) }} disabled={loading || saving || initializing}>
            {Object.keys(categories).map((key) => <option key={key} value={key}>/{key}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-ui-fg-base">站点语言
          <select className={inputClass} value={locale} onChange={(event) => { if (dirty && !window.confirm("切换语言会放弃当前未保存的修改，确定继续吗？")) return; setLocale(event.target.value as Locale) }} disabled={saving || initializing}>
            {locales.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </Container>

      {!loading && selected && <Container className="flex flex-col gap-y-5 p-5">
        <div className={categoryReady ? "rounded-lg border border-ui-border-positive bg-ui-bg-subtle p-4" : "rounded-lg border border-ui-border-warning bg-ui-bg-warning p-4"}>
          <Text className="font-medium text-ui-fg-base">{categoryReady ? "内容检查：核心字段齐全" : "内容检查：还不能作为完整分类落地页"}</Text>
          <Text size="small" className="mt-1 text-ui-fg-subtle">{categoryReady ? `已填写本地标题、SEO 文案，并关联 ${productHandles.length} 款商品；最终是否收录仍取决于该站点实际可配送商品。` : "请填写本地分类标题、SEO 标题和描述，并至少关联一款商品。未完成本地 SEO 或没有可配送商品的页面不会进入站点地图。"}</Text>
        </div>
        <div className="rounded-lg bg-ui-bg-subtle p-4">
          <Text className="font-medium text-ui-fg-base">网址保持稳定</Text>
          <Text size="small" className="mt-1 text-ui-fg-subtle">分类网址使用现有 SEO 规划（例如 /us/categories/{slug}），这里仅更新各语言的标题、介绍和商品归属，避免改动已发布链接。</Text>
        </div>
        <section className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-ui-fg-base">页面分类标题<input className={inputClass} value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} /></label>
          <label className="text-sm font-medium text-ui-fg-base">SEO 标题<input className={inputClass} value={draft.seoTitle} onChange={(event) => setDraft((current) => ({ ...current, seoTitle: event.target.value }))} /></label>
        </section>
        <label className="text-sm font-medium text-ui-fg-base">分类介绍与 SEO 描述<textarea className={inputClass} rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>

        <section className="flex flex-col gap-y-3 border-t border-ui-border-base pt-5">
          <div><Heading level="h2">这个分类包含哪些商品？</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">所选商品会加入该分类；访客只会看到配送范围包含当前国家的商品。</Text></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sortedProducts.map((product) => <label key={product.id} className="flex items-start gap-2 rounded-md border border-ui-border-base p-3 text-sm text-ui-fg-base">
              <input type="checkbox" checked={productHandles.includes(product.handle)} onChange={() => toggleProduct(product.handle)} disabled={saving} />
              <span>{product.title}</span>
            </label>)}
          </div>
        </section>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-ui-border-base bg-ui-bg-base/95 py-3 backdrop-blur">
          <Text size="small" className={dirty ? "text-ui-fg-warning" : "text-ui-fg-subtle"}>{dirty ? "有尚未保存的修改" : `${categoryName(slug)} · ${locale}`}</Text>
          <button type="button" disabled={saving || !dirty} onClick={() => void save()} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{saving ? "保存中…" : "保存分类设置"}</button>
        </div>
      </Container>}
      {loading && <Container className="p-6"><Text>正在读取分类资料…</Text></Container>}
    </div>
  )
}

export const config = defineRouteConfig({ label: "分类与 SEO 内容", nested: "/products", rank: 2 })

export default CategoryContentPage
