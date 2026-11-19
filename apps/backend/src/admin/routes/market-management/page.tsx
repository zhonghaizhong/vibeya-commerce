import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Market = { country_code: string; currency_code: string; region_id?: string; region_name?: string }
type Product = { id: string; title: string; handle: string; markets: string[] }
type LocalizedMedia = Record<string, Record<string, string[]>>
type Readiness = {
  product_id: string
  title: string
  handle: string
  country_code: string
  currency_code: string
  available: boolean
  variant_count: number
  priced_variant_count: number
  minimum_price: number | null
  locale: string
  missing_content: string[]
  content_managed: boolean
  market_image_count: number
  has_base_image: boolean
}
const hasReadinessIssue = (item: Readiness) => item.available && (
  item.variant_count === 0
  || item.priced_variant_count < item.variant_count
  || item.missing_content.length > 0
  || !item.has_base_image
)

const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"

const MarketManagementPage = () => {
  const [markets, setMarkets] = useState<Market[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [media, setMedia] = useState<LocalizedMedia>({})
  const [savedMedia, setSavedMedia] = useState<LocalizedMedia>({})
  const [readiness, setReadiness] = useState<Readiness[]>([])
  const [readinessCountry, setReadinessCountry] = useState("")
  const [readinessSearch, setReadinessSearch] = useState("")
  const [readinessIssuesOnly, setReadinessIssuesOnly] = useState(false)
  const [productId, setProductId] = useState("")
  const [countryCode, setCountryCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/market-management", { credentials: "same-origin", cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取国家销售设置失败。")
      const nextProducts: Product[] = data.products ?? []
      setMarkets(data.markets ?? [])
      setProducts(nextProducts)
      setMedia(data.localized_media ?? {})
      setSavedMedia(data.localized_media ?? {})
      setReadiness(data.readiness ?? [])
      setReadinessCountry((current) => current && (data.markets ?? []).some((market: Market) => market.country_code === current)
        ? current
        : (["us", "ca", "mx", "jp"].find((code) => (data.markets ?? []).some((market: Market) => market.country_code === code)) ?? data.markets?.[0]?.country_code ?? ""))
      const firstProduct = nextProducts.find((product) => product.markets.length > 1)
      setProductId(firstProduct?.id ?? "")
      setCountryCode(firstProduct?.markets[0] ?? "")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取国家销售设置失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const imageUrls = media[productId]?.[countryCode] ?? []
  const savedImageUrls = savedMedia[productId]?.[countryCode] ?? []
  const hasImageChanges = JSON.stringify(imageUrls) !== JSON.stringify(savedImageUrls)

  useEffect(() => {
    if (!hasImageChanges) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [hasImageChanges])

  const eligibleProducts = useMemo(() => products.filter((product) => product.markets.length > 1), [products])
  const selectedProduct = eligibleProducts.find((product) => product.id === productId)
  const destinationMarkets = markets.filter((market) => selectedProduct?.markets.includes(market.country_code))
  const hasSavedMarketImages = Boolean(savedImageUrls.length)
  const countryReadiness = readiness.filter((item) => item.country_code === readinessCountry)
  const availableReadiness = countryReadiness.filter((item) => item.available)
  const priceIssues = availableReadiness.filter((item) => item.variant_count === 0 || item.priced_variant_count < item.variant_count).length
  const contentIssues = availableReadiness.filter((item) => item.missing_content.length > 0).length
  const imageIssues = availableReadiness.filter((item) => !item.has_base_image).length
  const visibleReadiness = countryReadiness.filter((item) => {
    const matchesSearch = !readinessSearch.trim() || `${item.title} ${item.handle}`.toLowerCase().includes(readinessSearch.trim().toLowerCase())
    return matchesSearch && (!readinessIssuesOnly || hasReadinessIssue(item))
  })

  const formatPrice = (amount: number | null, currency: string) => {
    if (amount === null || !Number.isFinite(amount)) return "未配置"
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount) }
    catch { return `${amount} ${currency.toUpperCase()}` }
  }

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return
    if (files.length + imageUrls.length > 8) { setError("每个商品和国家最多保存 8 张图片。"); return }
    if (Array.from(files).some((file) => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      setError("请选择不超过 10 MB 的图片文件。")
      return
    }
    setUploading(true)
    setError("")
    setMessage("")
    try {
      const form = new FormData()
      Array.from(files).forEach((file) => form.append("files", file))
      const response = await fetch("/admin/uploads", { method: "POST", credentials: "same-origin", body: form })
      const data = await response.json()
      const uploaded = (data.files ?? []).map((file: { url?: unknown }) => file.url).filter((url: unknown): url is string => typeof url === "string")
      if (!response.ok || uploaded.length !== files.length) throw new Error(data.message || data.error || "图片上传失败。")
      setMedia((current) => ({ ...current, [productId]: { ...(current[productId] ?? {}), [countryCode]: [...imageUrls, ...uploaded] } }))
      setMessage("图片已上传到素材库；还需要点击保存，才会在对应国家的商品页显示。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图片上传失败。")
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!selectedProduct || !countryCode || (!imageUrls.length && !hasSavedMarketImages)) { setError("请选择商品和国家，并至少上传一张图片。"); return }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/market-management", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, country_code: countryCode, image_urls: imageUrls }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "保存国家图片失败。")
      setMedia((current) => ({ ...current, [productId]: { ...(current[productId] ?? {}), [countryCode]: data.image_urls } }))
      setSavedMedia((current) => ({ ...current, [productId]: { ...(current[productId] ?? {}), [countryCode]: data.image_urls } }))
      setMessage(imageUrls.length ? `${selectedProduct.title} 的 ${countryCode.toUpperCase()} 图片已保存。` : `已移除 ${selectedProduct.title} 的 ${countryCode.toUpperCase()} 专属图片，前台将使用基础图片。`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存国家图片失败。")
    } finally {
      setSaving(false)
    }
  }

  const removeImage = (index: number) => setMedia((current) => ({
    ...current,
    [productId]: { ...(current[productId] ?? {}), [countryCode]: imageUrls.filter((_, imageIndex) => imageIndex !== index) },
  }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-y-5 pb-10">
      <div>
        <Heading level="h1">站点商品与图片</Heading>
        <Text className="mt-1 text-ui-fg-subtle">查看每个国家可配送的商品，并为跨国家销售的商品设置对应市场图片。</Text>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}

      <Container className="p-5">
        <Heading level="h2">已配置的销售国家</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">国家和价格来自 Medusa「销售区域」；商品可售国家来自仓库的配送范围和商品关联。</Text>
        {loading ? <Text className="mt-4">正在读取…</Text> : markets.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {markets.map((market) => {
              const count = products.filter((product) => product.markets.includes(market.country_code)).length
              return <div key={market.country_code} className="rounded-lg border border-ui-border-base p-4">
                <Text className="font-medium text-ui-fg-base">{market.country_code.toUpperCase()}</Text>
                <Text size="small" className="mt-1 block text-ui-fg-subtle">{market.currency_code.toUpperCase()} · {count} 款可配送商品</Text>
              </div>
            })}
          </div>
        ) : <Text className="mt-4 block text-ui-fg-subtle">尚未配置销售区域。请先在 Medusa「设置 → 销售区域」添加配送国家和币种。</Text>}
      </Container>

      <Container className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Heading level="h2">站点上架检查</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">检查可售范围、当地售价、站点语言必填文案和商品图片。价格、文案和图片问题只针对该站点可售商品统计；这里只读取并提示，不会自动修改商品或价格。</Text>
          </div>
          <label className="min-w-[200px] text-sm font-medium text-ui-fg-base">检查站点
            <select className={inputClass} value={readinessCountry} onChange={(event) => setReadinessCountry(event.target.value)} disabled={loading || !markets.length}>
              {markets.map((market) => <option key={`${market.region_id}-${market.country_code}`} value={market.country_code}>{market.country_code.toUpperCase()} · {market.currency_code.toUpperCase()}</option>)}
            </select>
          </label>
        </div>
        {loading ? <Text className="mt-4">正在检查商品…</Text> : countryReadiness.length ? <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-ui-border-base p-3"><Text size="small" className="text-ui-fg-subtle">该站点可售商品</Text><Text className="mt-1 font-medium">{availableReadiness.length} / {countryReadiness.length} 款</Text></div>
            <div className="rounded-lg border border-ui-border-base p-3"><Text size="small" className="text-ui-fg-subtle">当地价格缺项</Text><Text className={`mt-1 font-medium ${priceIssues ? "text-ui-fg-warning" : "text-ui-fg-positive"}`}>{priceIssues} 款</Text></div>
            <div className="rounded-lg border border-ui-border-base p-3"><Text size="small" className="text-ui-fg-subtle">语言内容缺项</Text><Text className={`mt-1 font-medium ${contentIssues ? "text-ui-fg-warning" : "text-ui-fg-positive"}`}>{contentIssues} 款</Text></div>
            <div className="rounded-lg border border-ui-border-base p-3"><Text size="small" className="text-ui-fg-subtle">没有商品图片</Text><Text className={`mt-1 font-medium ${imageIssues ? "text-ui-fg-warning" : "text-ui-fg-positive"}`}>{imageIssues} 款</Text></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input className={`${inputClass} mt-0 min-w-[240px] flex-1`} value={readinessSearch} onChange={(event) => setReadinessSearch(event.target.value)} placeholder="搜索商品名称或网址标识" aria-label="搜索站点商品检查结果" />
            <label className="flex items-center gap-2 text-sm text-ui-fg-base">
              <input type="checkbox" checked={readinessIssuesOnly} onChange={(event) => setReadinessIssuesOnly(event.target.checked)} />
              只看待处理项（{availableReadiness.filter(hasReadinessIssue).length}）
            </label>
            <Text size="small" className="text-ui-fg-subtle">显示 {visibleReadiness.length} / {countryReadiness.length} 款</Text>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-ui-border-base text-ui-fg-subtle">
                <th className="px-3 py-3 font-medium">商品</th><th className="px-3 py-3 font-medium">配送</th><th className="px-3 py-3 font-medium">售价</th><th className="px-3 py-3 font-medium">语言内容</th><th className="px-3 py-3 font-medium">图片</th><th className="px-3 py-3 font-medium">操作</th>
              </tr></thead>
              <tbody>{visibleReadiness.map((item) => {
                const priceComplete = item.variant_count > 0 && item.priced_variant_count === item.variant_count
                return <tr key={`${item.product_id}-${item.country_code}`} className="border-b border-ui-border-base last:border-0">
                  <td className="px-3 py-3"><Text className="font-medium text-ui-fg-base">{item.title}</Text><Text size="small" className="text-ui-fg-subtle">{item.handle}</Text></td>
                  <td className="px-3 py-3"><Text className={item.available ? "text-ui-fg-positive" : "text-ui-fg-warning"}>{item.available ? "可配送" : "未关联仓库"}</Text></td>
                  <td className="px-3 py-3">{item.available ? <><Text className={priceComplete ? "text-ui-fg-base" : "text-ui-fg-warning"}>{formatPrice(item.minimum_price, item.currency_code)}</Text><Text size="small" className="text-ui-fg-subtle">{item.priced_variant_count}/{item.variant_count} 个规格有当地价</Text></> : <Text className="text-ui-fg-subtle">不适用</Text>}</td>
                  <td className="px-3 py-3">{item.available ? <><Text className={item.missing_content.length ? "text-ui-fg-warning" : "text-ui-fg-positive"}>{item.missing_content.length ? `缺少 ${item.missing_content.length} 项` : `${item.locale} · 必填项齐全`}</Text><Text size="small" className="text-ui-fg-subtle">{item.content_managed ? "后台内容" : "当前网站默认内容"}</Text></> : <Text className="text-ui-fg-subtle">不适用</Text>}</td>
                  <td className="px-3 py-3">{item.available ? <Text className={item.market_image_count || item.has_base_image ? "text-ui-fg-positive" : "text-ui-fg-warning"}>{item.market_image_count ? `${item.market_image_count} 张站点图片` : item.has_base_image ? "使用基础图片" : "未配置图片"}</Text> : <Text className="text-ui-fg-subtle">不适用</Text>}</td>
                  <td className="px-3 py-3">{item.available ? <a className="font-medium text-ui-fg-interactive hover:underline" href={`/app/products/product-content?productId=${encodeURIComponent(item.product_id)}&locale=${encodeURIComponent(item.locale)}`}>编辑文案</a> : <Text className="text-ui-fg-subtle">—</Text>}</td>
                </tr>
              })}</tbody>
            </table>
            {!visibleReadiness.length && <Text className="block py-5 text-center text-ui-fg-subtle">没有符合条件的商品。可以清除搜索词或关闭待处理筛选。</Text>}
          </div>
          <Text size="small" className="mt-3 block text-ui-fg-subtle">当地价格按商品规格的币种与销售区域价格规则核对。基础图片可供站点复用；如果某站需要专属图片，可在下方跨国家商品图片中单独配置。</Text>
        </> : <Text className="mt-4 block text-ui-fg-subtle">该站点暂时没有已发布商品或销售区域配置。</Text>}
      </Container>

      <Container className="p-5">
        <Heading level="h2">跨国家商品图片</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">这里只列出配送到两个及以上国家的商品。选择目的国家后上传该市场的商品图片；顾客切换配送国家时会看到对应版本，语言选择保持独立。</Text>
        {loading ? <Text className="mt-4">正在读取商品…</Text> : eligibleProducts.length ? <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-ui-fg-base">商品
              <select className={inputClass} value={productId} onChange={(event) => { if (hasImageChanges && !window.confirm("切换商品会放弃当前未保存的图片修改，确定继续吗？")) return; const nextId = event.target.value; const nextProduct = eligibleProducts.find((product) => product.id === nextId); setProductId(nextId); setCountryCode(nextProduct?.markets[0] ?? "") }}>
                {eligibleProducts.map((product) => <option key={product.id} value={product.id}>{product.title} · {product.markets.map((code) => code.toUpperCase()).join(" / ")}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-ui-fg-base">目的国家
              <select className={inputClass} value={countryCode} onChange={(event) => { if (hasImageChanges && !window.confirm("切换国家会放弃当前未保存的图片修改，确定继续吗？")) return; setCountryCode(event.target.value) }}>
                {destinationMarkets.map((market) => <option key={market.country_code} value={market.country_code}>{market.country_code.toUpperCase()} · {market.currency_code.toUpperCase()}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-lg border border-dashed border-ui-border-base p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><Text className="font-medium text-ui-fg-base">{countryCode.toUpperCase()} 商品图片</Text><Text size="small" className="mt-1 text-ui-fg-subtle">可上传 1–8 张，单张不超过 10 MB。{hasImageChanges ? " 有未保存修改。" : ""}</Text></div>
              <label className="cursor-pointer rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium text-ui-fg-base">
                {uploading ? "上传中…" : "上传图片"}
                <input className="sr-only" type="file" accept="image/*" multiple disabled={uploading || saving || imageUrls.length >= 8} onChange={(event) => { void uploadImages(event.target.files); event.currentTarget.value = "" }} />
              </label>
            </div>
            {imageUrls.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {imageUrls.map((url, index) => <div key={`${url}-${index}`} className="relative rounded-lg border border-ui-border-base p-2">
                <img className="h-40 w-full rounded-md object-contain" src={url} alt={`${countryCode.toUpperCase()} product image ${index + 1}`} />
                <button type="button" onClick={() => removeImage(index)} className="mt-2 w-full rounded-md border border-ui-border-base px-2 py-1 text-xs text-ui-fg-subtle">移除</button>
              </div>)}
            </div> : <Text size="small" className="mt-4 block text-ui-fg-subtle">这个国家还没有专属图片，商品暂时使用基础图片。</Text>}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {hasImageChanges && <button type="button" disabled={saving || uploading} onClick={() => setMedia((current) => ({ ...current, [productId]: { ...(current[productId] ?? {}), [countryCode]: savedImageUrls } }))} className="rounded-md border border-ui-border-base px-4 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50">撤销图片修改</button>}
            <button type="button" disabled={saving || uploading || !hasImageChanges} onClick={() => void save()} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:cursor-not-allowed disabled:opacity-50">{saving ? "保存中…" : imageUrls.length ? "保存国家图片" : "移除专属图片并使用基础图"}</button>
          </div>
        </> : <div className="mt-4 rounded-lg bg-ui-bg-subtle p-4"><Text className="font-medium text-ui-fg-base">目前还没有跨国家配送的商品</Text><Text size="small" className="mt-1 block text-ui-fg-subtle">先为仓库配置多个国家的配送范围，并将商品关联到相应仓库；商品在两个及以上国家可售后，就能在这里上传各市场图片。</Text></div>}
      </Container>

      <Container className="p-5">
        <Heading level="h2">商品配送范围</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">需要调整仓库和商品的配送关系时，请到「仓库与配送」；商品价格在 Medusa「设置 → 销售区域」管理。</Text>
        {loading ? null : <div className="mt-4 divide-y divide-ui-border-base">
          {products.map((product) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <Text className="text-ui-fg-base">{product.title}</Text>
            <Text size="small" className="text-ui-fg-subtle">{product.markets.length ? product.markets.map((code) => code.toUpperCase()).join(" · ") : "未关联可配送仓库"}</Text>
          </div>)}
        </div>}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "站点商品与图片", rank: 2 })

export default MarketManagementPage
