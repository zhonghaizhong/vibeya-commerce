import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Reference = { color: string; size: string; side: "front" | "back" | "surface"; baseImageUrl: string; printAreaImageUrl: string }
type Designer = { enabled: boolean; legacyProfile?: string; generationPromptTemplate: string; mode: "front-back" | "full-surface"; placements: Array<"front" | "back" | "both" | "wrap">; galleryUrls: string[]; references: Reference[] }
type Product = { id: string; title: string; handle: string; status: string; colors: string[]; sizes: string[]; designer: Designer }

const emptyDesigner: Designer = { enabled: false, generationPromptTemplate: "", mode: "front-back", placements: ["front"], galleryUrls: [], references: [] }
const uploadFiles = async (files: FileList | null) => {
  if (!files?.length) return []
  if (Array.from(files).some((file) => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) throw new Error("请选择不超过 10 MB 的图片文件。")
  const form = new FormData()
  Array.from(files).forEach((file) => form.append("files", file))
  const response = await fetch("/admin/uploads", { method: "POST", credentials: "same-origin", body: form })
  const data = await response.json()
  const urls = (data.files ?? []).map((file: { url?: unknown }) => file.url).filter((url: unknown): url is string => typeof url === "string")
  if (!response.ok || urls.length !== files.length) throw new Error(data.message || data.error || "图片上传失败。")
  return urls
}

const referencesToText = (references: Reference[]) => references.map((item) => [item.color, item.size, item.side, item.baseImageUrl, item.printAreaImageUrl].join(" | ")).join("\n")
const parseReferences = (value: string): Reference[] => value.split("\n").map((line) => {
  const [color = "", size = "", side = "front", baseImageUrl = "", printAreaImageUrl = ""] = line.split("|").map((part) => part.trim())
  return { color, size, side: side === "back" || side === "surface" ? side : "front", baseImageUrl, printAreaImageUrl }
}).filter((item) => item.baseImageUrl)
const textClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"

const ProductDesignerPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState("")
  const [draft, setDraft] = useState<Designer>(emptyDesigner)
  const [referenceText, setReferenceText] = useState("")
  const [galleryText, setGalleryText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [importing, setImporting] = useState(false)
  const product = products.find((item) => item.id === productId)

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const response = await fetch("/admin/vibeya/product-designer", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取商品失败。")
      const list = (data.products ?? []) as Product[]
      setProducts(list)
      setProductId((current) => list.some((item) => item.id === current) ? current : list[0]?.id ?? "")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "读取商品失败。") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const next = product?.designer ?? emptyDesigner
    setDraft({ ...emptyDesigner, ...next, references: next.references ?? [], galleryUrls: next.galleryUrls ?? [], placements: next.placements ?? ["front"] })
    setReferenceText(referencesToText(next.references ?? []))
    setGalleryText((next.galleryUrls ?? []).join("\n"))
    setMessage("")
  }, [productId, products])

  const save = async () => {
    if (!product) return
    setSaving(true); setError(""); setMessage("")
    const designer = { ...draft, references: parseReferences(referenceText), galleryUrls: galleryText.split("\n").map((line) => line.trim()).filter(Boolean) }
    try {
      const response = await fetch("/admin/vibeya/product-designer", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, designer }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "保存失败。")
      setProducts((current) => current.map((item) => item.id === productId ? { ...item, designer: data.designer } : item))
      setMessage("已保存。前台商品目录和设计器会读取此配置。")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败。") }
    finally { setSaving(false) }
  }

  const importCurrentConfigs = async () => {
    if (!window.confirm("将把当前网站已有商品的详情文案、底图、印花区域和固定生图指令模板导入后台。已有后台配置会保留，商品、价格、库存和订单不会变更。继续吗？")) return
    setImporting(true); setError(""); setMessage("")
    try {
      const response = await fetch("/admin/vibeya/product-designer", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importCurrentConfigs: true }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "导入失败。")
      await load()
      setMessage(`已同步 ${data.contentImported ?? 0} 款商品详情文案、${data.imported ?? 0} 款商品底图/设计配置和 ${data.promptTemplatesImported ?? 0} 款固定生图指令模板。已有后台配置及商品、价格、库存、订单均未改动。`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : "导入失败。") }
    finally { setImporting(false) }
  }

  const addUploads = async (kind: "reference" | "gallery", files: FileList | null) => {
    setUploading(true); setError("")
    try {
      const urls = await uploadFiles(files)
      if (kind === "gallery") setGalleryText((current) => [...current.split("\n").map((line) => line.trim()).filter(Boolean), ...urls].join("\n"))
      else setReferenceText((current) => [...current.split("\n").filter(Boolean), ...urls.map((url) => ` |  | front | ${url} | `)].join("\n"))
      setMessage("图片已上传。记得填写颜色和尺码对应关系并保存设置。")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "图片上传失败。") }
    finally { setUploading(false) }
  }

  const togglePlacement = (placement: Designer["placements"][number]) => setDraft((current) => ({ ...current, placements: current.placements.includes(placement) ? current.placements.filter((item) => item !== placement) : [...current.placements, placement] }))
  const colors = useMemo(() => product?.colors.length ? product.colors : ["(无颜色选项)"], [product])

  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-y-5 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Heading level="h1">商品设计器配置</Heading><Text className="mt-1 text-ui-fg-subtle">管理前台商品详情文案、设计入口、示例图、空白底图和印花区域图。已有配置会保留；商品本身的价格、库存和订单不受影响。</Text></div><div className="flex gap-2"><button type="button" onClick={() => void importCurrentConfigs()} disabled={loading || saving || importing} className="rounded-md border border-ui-border-base px-3 py-2 text-sm">{importing ? "导入中…" : "同步现有商品配置"}</button><button type="button" onClick={() => void load()} disabled={loading || saving} className="rounded-md border border-ui-border-base px-3 py-2 text-sm">刷新商品</button></div></div>
    {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
    {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}
    <Container className="p-5"><label className="text-sm font-medium">选择商品<select className={textClass} value={productId} onChange={(event) => { if (window.confirm("切换商品会放弃尚未保存的修改，确定继续吗？")) setProductId(event.target.value) }} disabled={loading || saving}><option value="">请选择</option>{products.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select></label>
      {loading ? <Text className="mt-4">正在读取商品…</Text> : product ? <div className="mt-5 flex flex-col gap-5">
        {draft.legacyProfile && <Container className="border border-ui-border-base p-4"><Text className="font-medium">此商品使用现有专用设计流程</Text><Text size="small" className="mt-1 text-ui-fg-subtle">当前前端底图和印花区域已同步到后台作为配置记录。为保留已验证的生成效果，网站继续使用原有专用流程；新商品才使用下面的通用配置。</Text></Container>}
        <div className="rounded-lg border border-ui-border-base p-4"><Heading level="h2">固定生图指令模板</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">每次为这款商品生图都会附加此模板。系统内置的商品结构和印花区域限制仍会保留。支持变量：<code>{"{{product_name}}"}</code>、<code>{"{{color}}"}</code>、<code>{"{{size}}"}</code>、<code>{"{{placement}}"}</code>。</Text><textarea className={`${textClass} min-h-36 font-mono`} value={draft.generationPromptTemplate} maxLength={8000} onChange={(event) => setDraft((current) => ({ ...current, generationPromptTemplate: event.target.value }))} placeholder="例如：保持商品版型和材质不变，只在标记的印花区域内生成图案。"/><Text size="small" className="mt-1 text-ui-fg-subtle">{draft.generationPromptTemplate.length}/8000 字符</Text></div>
        <div className="rounded-lg border border-ui-border-base p-4"><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.enabled} disabled={Boolean(draft.legacyProfile)} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />在前台开放自定义设计</label><Text size="small" className="mt-2 text-ui-fg-subtle">发布状态、站点可售国家和价格仍由商品及站点配置控制。设计器配置不会自动发布商品。</Text></div>
        <label className="text-sm font-medium">印花方式<select className={textClass} value={draft.mode} onChange={(event) => setDraft((current) => ({ ...current, mode: event.target.value as Designer["mode"], placements: event.target.value === "full-surface" ? ["wrap"] : ["front"] }))}><option value="front-back">服装/单面区域（正面、背面）</option><option value="full-surface">整面满印（杯子、毯子等）</option></select></label>
        {draft.mode === "front-back" && <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="mb-2 font-medium">允许顾客选择的印花位置</legend>{(["front", "back", "both"] as const).map((placement) => <label key={placement} className="flex items-center gap-2"><input type="checkbox" checked={draft.placements.includes(placement)} onChange={() => togglePlacement(placement)} />{{ front: "正面", back: "背面", both: "正反面" }[placement]}</label>)}</fieldset>}
        <div className="rounded-lg border border-ui-border-base p-4"><Heading level="h2">商品底图和印花区域</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">每行一条：颜色 | 尺码 | 面（front / back / surface） | 空白商品底图 URL | 印花区域参考图 URL。颜色、尺码留空表示通用。图片可从下方上传；URL 必须是 https:// 或站内 / 路径。当前商品颜色：{colors.join("、")}；尺码：{product.sizes.join("、") || "未设置"}</Text><textarea className={`${textClass} min-h-36 font-mono`} value={referenceText} onChange={(event) => setReferenceText(event.target.value)} placeholder="Black | M | front | https://.../blank-front.png | https://.../print-area-front.png"/><label className="mt-3 inline-flex cursor-pointer items-center rounded-md border border-ui-border-base px-3 py-2 text-sm">{uploading ? "上传中…" : "上传底图 / 印花区域图"}<input className="sr-only" type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => { void addUploads("reference", event.target.files); event.currentTarget.value = "" }}/></label></div>
        <div className="rounded-lg border border-ui-border-base p-4"><Heading level="h2">商品展示图片</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">商品卡片使用 Medusa 商品主图；此处可添加设计器示例图 / 画廊图片，每行一个 URL。</Text><textarea className={`${textClass} min-h-24 font-mono`} value={galleryText} onChange={(event) => setGalleryText(event.target.value)} placeholder="https://.../gallery-01.webp"/><label className="mt-3 inline-flex cursor-pointer items-center rounded-md border border-ui-border-base px-3 py-2 text-sm">上传示例图<input className="sr-only" type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => { void addUploads("gallery", event.target.files); event.currentTarget.value = "" }}/></label></div>
        <div className="flex justify-end"><button type="button" onClick={() => void save()} disabled={saving || uploading} className="rounded-full bg-ui-bg-interactive px-5 py-2.5 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{saving ? "保存中…" : "保存设计器设置"}</button></div>
      </div> : <Text className="mt-4">没有可配置的商品。</Text>}
    </Container>
  </div>
}

export const config = defineRouteConfig({ label: "商品设计器", nested: "/products", rank: 3 })
export default ProductDesignerPage
