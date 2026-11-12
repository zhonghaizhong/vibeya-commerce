import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Inspiration = {
  id: string
  title: string
  slug: string
  image: string
  cardImage: string
  summary: string
  articleBody: string
  useManagedImage: boolean
  product: string
  pattern: string
  style: string
  tags: string[]
  published: boolean
  homeFeatured: boolean
}

const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"
const labelClass = "text-sm font-medium text-ui-fg-base"
const emptyEntry = (items: Inspiration[]): Inspiration => {
  let suffix = 1
  let id = "new-inspiration"
  while (items.some((item) => item.id === id)) id = `new-inspiration-${++suffix}`
  return { id, title: "", slug: `story.html?inspiration=${id}`, image: "", cardImage: "", summary: "", articleBody: "", useManagedImage: true, product: "", pattern: "", style: "", tags: [], published: false, homeFeatured: false }
}

const StoreContentPage = () => {
  const [items, setItems] = useState<Inspiration[]>([])
  const [savedItems, setSavedItems] = useState<Inspiration[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [uploading, setUploading] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "home">("all")
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const isDirty = hasLoaded && JSON.stringify(items) !== JSON.stringify(savedItems)

  const load = useCallback(async () => {
    setLoading(true)
    setHasLoaded(false)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/inspirations", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取灵感内容失败。")
      const inspirations = data.inspirations ?? []
      setItems(inspirations)
      setSavedItems(inspirations)
      setHasLoaded(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取灵感内容失败。")
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

  const update = (index: number, patch: Partial<Inspiration>) => { if (!saving) setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  const visibleItems = items.map((item, index) => ({ item, index })).filter(({ item }) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [item.title, item.id, item.product, item.pattern, item.style, ...item.tags].some((value) => value.toLowerCase().includes(query))
    const matchesStatus = statusFilter === "all" || (statusFilter === "published" && item.published) || (statusFilter === "draft" && !item.published) || (statusFilter === "home" && item.published && item.homeFeatured)
    return matchesSearch && matchesStatus
  })
  const uploadImage = async (index: number, field: "image" | "cardImage", file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) { setError("请选择图片文件。"); return }
    if (file.size > 10 * 1024 * 1024) { setError("图片不能超过 10 MB。"); return }
    setUploading(`${index}-${field}`)
    setError("")
    setMessage("")
    try {
      const form = new FormData()
      form.append("files", file)
      const response = await fetch("/admin/uploads", { method: "POST", credentials: "same-origin", body: form })
      const data = await response.json()
      const url = data.files?.[0]?.url
      if (!response.ok || typeof url !== "string") throw new Error(data.message || data.error || "图片上传失败。")
      update(index, { [field]: url })
      setMessage("图片上传成功，保存灵感内容后生效。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图片上传失败。")
    } finally {
      setUploading("")
    }
  }
  const save = async () => {
    if (!hasLoaded) { setError("灵感列表尚未成功读取，请先重新读取后再保存。"); return }
    setMessage("")
    if (items.some((item) => !item.title.trim())) { setError("每条灵感都需要填写标题；暂时不创建的空白条目请先删除。"); return }
    const ids = items.map((item) => item.id)
    if (ids.some((id) => !/^[a-z0-9-]{2,80}$/.test(id))) { setError("灵感编号需使用 2–80 位英文小写字母、数字或连字符。"); return }
    if (new Set(ids).size !== ids.length) { setError("灵感编号不能重复，请修改重复的编号后再保存。"); return }
    const incomplete = items.find((item) => item.published && (!item.title.trim() || !item.image.trim() || !item.cardImage.trim() || (item.slug.startsWith("story.html?") && !item.summary.trim())))
    if (incomplete) { setError(`“${incomplete.title || "新灵感"}”已设为发布，请补全标题、卡片图片、专题主图和文章介绍。`); return }
    const mismatchedStory = items.find((item) => item.slug.startsWith("story.html?") && item.slug !== `story.html?inspiration=${item.id}`)
    if (mismatchedStory) { setError(`“${mismatchedStory.title || "新灵感"}”的文章地址需要与内部编号保持一致。`); return }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/inspirations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspirations: items }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "保存灵感内容失败。")
      setItems(data.inspirations)
      setSavedItems(data.inspirations)
      setMessage("灵感内容已保存，已发布的条目会同步到首页和灵感页。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存灵感内容失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading level="h1">首页与灵感</Heading>
          <Text className="mt-1 text-ui-fg-subtle">管理灵感图片和文章。已发布内容会同步到灵感页；首页随机展示最多 4 张已选卡片。</Text>
        </div>
        <button type="button" disabled={!hasLoaded || loading || saving} onClick={() => { const index = items.length; setItems((current) => [...current, emptyEntry(current)]); setExpandedIndex(index) }} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:cursor-not-allowed disabled:opacity-50">+ 添加灵感</button>
      </div>

      {hasLoaded && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "全部灵感", value: items.length },
          { label: "已发布", value: items.filter((item) => item.published).length },
          { label: "未发布", value: items.filter((item) => !item.published).length },
          { label: "首页候选", value: items.filter((item) => item.published && item.homeFeatured).length },
        ].map((stat) => <Container key={stat.label} className="p-4"><Text size="small" className="text-ui-fg-subtle">{stat.label}</Text><Text className="mt-1 text-xl font-semibold text-ui-fg-base">{stat.value}</Text></Container>)}
      </div>}

      {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}
      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}

      {!loading && hasLoaded && <Container className="flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[240px] flex-1 text-sm font-medium text-ui-fg-base">搜索<input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="输入标题、商品或标签" /></label>
        <label className="min-w-[180px] text-sm font-medium text-ui-fg-base">内容状态<select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">全部</option><option value="published">已发布</option><option value="draft">未发布</option><option value="home">首页候选</option></select></label>
        <Text size="small" className="pb-2 text-ui-fg-subtle">显示 {visibleItems.length} / {items.length}</Text>
      </Container>}

      {loading ? <Container className="p-5"><Text>正在读取灵感内容…</Text></Container> : !hasLoaded ? <Container className="flex flex-wrap items-center justify-between gap-3 p-5"><Text>内容暂时无法读取，因此已暂停编辑和保存，避免覆盖已有灵感。</Text><button type="button" onClick={() => void load()} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium text-ui-fg-base">重新读取</button></Container> : visibleItems.map(({ item, index }) => (
        <Container key={`${item.id}-${index}`} className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <button type="button" aria-expanded={expandedIndex === index} onClick={() => setExpandedIndex(expandedIndex === index ? null : index)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              {item.cardImage || item.image ? <img className="h-14 w-14 shrink-0 rounded-md border border-ui-border-base object-cover" src={item.cardImage || item.image} alt="" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-dashed border-ui-border-base text-xs text-ui-fg-subtle">无图片</span>}
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-ui-fg-base">{item.title || "新灵感（待填写标题）"}</span><Badge color={item.published ? "green" : "grey"}>{item.published ? "已发布" : "草稿"}</Badge>{item.published && item.homeFeatured && <Badge color="blue">首页候选</Badge>}</span><span className="mt-1 block truncate text-xs text-ui-fg-subtle">{item.product || "未设置商品"}{item.pattern ? ` · ${item.pattern}` : ""}{item.style ? ` · ${item.style}` : ""}</span></span>
              <span aria-hidden="true" className="px-2 text-ui-fg-subtle">{expandedIndex === index ? "−" : "+"}</span>
            </button>
            <button type="button" disabled={saving} onClick={() => { setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)); setExpandedIndex((current) => current === index ? null : current !== null && current > index ? current - 1 : current) }} className="rounded-md border border-ui-border-base px-3 py-2 text-sm text-ui-fg-error disabled:opacity-50">删除</button>
          </div>

          {expandedIndex === index && <div className="flex flex-col gap-6 border-t border-ui-border-base p-5">
            <section className="flex flex-col gap-3">
              <div><Heading level="h3">基本信息</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">标题会显示在首页卡片和文章页。</Text></div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>标题<input className={inputClass} value={item.title} onChange={(event) => update(index, { title: event.target.value })} placeholder="例如：Cozy Funny Blanket" /></label>
                <label className={labelClass}>内部编号<input className={inputClass} value={item.id} onChange={(event) => { const id = event.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"); update(index, { id, ...(item.slug.startsWith("story.html?inspiration=") ? { slug: `story.html?inspiration=${id}` } : {}) }) }} placeholder="英文小写和连字符" /></label>
                <label className={`${labelClass} md:col-span-2`}>文章地址<input className={inputClass} value={item.slug} onChange={(event) => update(index, { slug: event.target.value.trim().toLowerCase() })} /><Text size="small" className="mt-1 text-ui-fg-subtle">新文章使用统一模板；已有文章继续使用原页面。</Text></label>
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-ui-border-base pt-5">
              <div><Heading level="h3">图片</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">卡片图用于首页和灵感列表；专题主图用于文章页。</Text></div>
              <div className="grid gap-5 md:grid-cols-2">
                <div><label className={labelClass}>卡片图片<input className={inputClass} value={item.cardImage} onChange={(event) => update(index, { cardImage: event.target.value })} placeholder="上传图片或粘贴图片地址" /></label><input className="mt-2 block w-full text-sm text-ui-fg-subtle" type="file" accept="image/*" aria-label="上传灵感卡片图片" disabled={saving || uploading === `${index}-cardImage`} onChange={(event) => { void uploadImage(index, "cardImage", event.target.files?.[0]); event.currentTarget.value = "" }} />{uploading === `${index}-cardImage` && <Text size="small">正在上传…</Text>}{item.cardImage && <img className="mt-3 max-h-48 max-w-full rounded-lg border border-ui-border-base object-contain" src={item.cardImage} alt={`${item.title || "灵感"}卡片预览`} />}{item.image && item.cardImage !== item.image && <button type="button" disabled={saving} onClick={() => update(index, { cardImage: item.image })} className="mt-2 rounded-md border border-ui-border-base px-2.5 py-1.5 text-xs text-ui-fg-base disabled:opacity-50">使用专题主图</button>}</div>
                <div><label className={labelClass}>文章专题主图<input className={inputClass} value={item.image} onChange={(event) => update(index, { image: event.target.value })} placeholder="上传图片或粘贴图片地址" /></label><input className="mt-2 block w-full text-sm text-ui-fg-subtle" type="file" accept="image/*" aria-label="上传专题主图" disabled={saving || uploading === `${index}-image`} onChange={(event) => { void uploadImage(index, "image", event.target.files?.[0]); event.currentTarget.value = "" }} />{uploading === `${index}-image` && <Text size="small">正在上传…</Text>}{item.image && <img className="mt-3 max-h-48 max-w-full rounded-lg border border-ui-border-base object-contain" src={item.image} alt={`${item.title || "灵感"}专题主图预览`} />}</div>
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-ui-border-base pt-5">
              <div><Heading level="h3">文章内容</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">正文中空一行即可另起一段。</Text></div>
              <label className={labelClass}>简短介绍<textarea className={inputClass} rows={3} value={item.summary} onChange={(event) => update(index, { summary: event.target.value })} placeholder="用一两句话介绍这个设计" /></label>
              <label className={labelClass}>详细正文<textarea className={inputClass} rows={6} value={item.articleBody} onChange={(event) => update(index, { articleBody: event.target.value })} placeholder="介绍设计灵感、图案特点或适合的商品" /></label>
            </section>

            <section className="flex flex-col gap-3 border-t border-ui-border-base pt-5">
              <div><Heading level="h3">分类与展示</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">分类用于灵感筛选；首页只会从已发布且选为首页候选的内容中随机展示。</Text></div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className={labelClass}>关联商品<input className={inputClass} value={item.product} onChange={(event) => update(index, { product: event.target.value })} placeholder="例如 hoodie" /></label>
                <label className={labelClass}>图案分类<input className={inputClass} value={item.pattern} onChange={(event) => update(index, { pattern: event.target.value })} placeholder="例如 botanical" /></label>
                <label className={labelClass}>设计风格<input className={inputClass} value={item.style} onChange={(event) => update(index, { style: event.target.value })} placeholder="例如 streetwear" /></label>
              </div>
              <label className={labelClass}>标签（英文逗号分隔）<input className={inputClass} value={item.tags.join(", ")} onChange={(event) => update(index, { tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="funny, cozy, gift" /></label>
              <div className="flex flex-col gap-3 rounded-lg bg-ui-bg-subtle p-4">
                <label className="flex items-center gap-2 text-sm text-ui-fg-base"><input type="checkbox" checked={item.published} onChange={(event) => update(index, { published: event.target.checked })} />发布到灵感页</label>
                <label className="flex items-center gap-2 text-sm text-ui-fg-base"><input type="checkbox" checked={item.homeFeatured} onChange={(event) => update(index, { homeFeatured: event.target.checked })} />允许首页随机展示</label>
                <label className="flex items-center gap-2 text-sm text-ui-fg-base"><input type="checkbox" checked={item.useManagedImage} onChange={(event) => update(index, { useManagedImage: event.target.checked })} />将上传的专题主图用于原有文章主视觉</label>
              </div>
            </section>
          </div>}
        </Container>
      ))}

      {!loading && hasLoaded && visibleItems.length === 0 && <Container className="p-8 text-center"><Text className="text-ui-fg-subtle">没有找到符合条件的灵感。</Text></Container>}

      {!loading && hasLoaded && <div className="sticky bottom-0 z-20 border-t border-ui-border-base bg-ui-bg-base/95 px-5 py-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Text size="small" className={isDirty ? "text-ui-fg-warning" : "text-ui-fg-subtle"}>{isDirty ? "有尚未保存的修改" : message || "所有更改已保存"}</Text>
          <button type="button" disabled={saving || Boolean(uploading) || !isDirty} onClick={() => void save()} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{saving ? "保存中…" : "保存更改"}</button>
        </div>
      </div>}
    </div>
  )
}

export const config = defineRouteConfig({ label: "首页与灵感", rank: 1 })

export default StoreContentPage
