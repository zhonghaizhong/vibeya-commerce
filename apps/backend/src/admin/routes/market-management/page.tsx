import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Market = { country_code: string; currency_code: string }
type Product = { id: string; title: string; handle: string; markets: string[] }
type LocalizedMedia = Record<string, Record<string, string[]>>

const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"

const MarketManagementPage = () => {
  const [markets, setMarkets] = useState<Market[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [media, setMedia] = useState<LocalizedMedia>({})
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

  const eligibleProducts = useMemo(() => products.filter((product) => product.markets.length > 1), [products])
  const selectedProduct = eligibleProducts.find((product) => product.id === productId)
  const destinationMarkets = markets.filter((market) => selectedProduct?.markets.includes(market.country_code))
  const imageUrls = media[productId]?.[countryCode] ?? []
  const hasSavedMarketImages = Boolean(media[productId]?.[countryCode]?.length)

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
        <Heading level="h1">国家与商品图片</Heading>
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
        <Heading level="h2">跨国家商品图片</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">这里只列出配送到两个及以上国家的商品。选择目的国家后上传该市场的商品图片；顾客切换配送国家时会看到对应版本，语言选择保持独立。</Text>
        {loading ? <Text className="mt-4">正在读取商品…</Text> : eligibleProducts.length ? <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-ui-fg-base">商品
              <select className={inputClass} value={productId} onChange={(event) => { const nextId = event.target.value; const nextProduct = eligibleProducts.find((product) => product.id === nextId); setProductId(nextId); setCountryCode(nextProduct?.markets[0] ?? "") }}>
                {eligibleProducts.map((product) => <option key={product.id} value={product.id}>{product.title} · {product.markets.map((code) => code.toUpperCase()).join(" / ")}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-ui-fg-base">目的国家
              <select className={inputClass} value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
                {destinationMarkets.map((market) => <option key={market.country_code} value={market.country_code}>{market.country_code.toUpperCase()} · {market.currency_code.toUpperCase()}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-lg border border-dashed border-ui-border-base p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><Text className="font-medium text-ui-fg-base">{countryCode.toUpperCase()} 商品图片</Text><Text size="small" className="mt-1 text-ui-fg-subtle">可上传 1–8 张，单张不超过 10 MB。</Text></div>
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

          <div className="mt-4 flex justify-end">
            <button type="button" disabled={saving || uploading || (!imageUrls.length && !hasSavedMarketImages)} onClick={() => void save()} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:cursor-not-allowed disabled:opacity-50">{saving ? "保存中…" : imageUrls.length ? "保存国家图片" : "移除专属图片并使用基础图"}</button>
          </div>
        </> : <div className="mt-4 rounded-lg bg-ui-bg-subtle p-4"><Text className="font-medium text-ui-fg-base">目前还没有跨国家配送的商品</Text><Text size="small" className="mt-1 block text-ui-fg-subtle">先为仓库配置多个国家的配送范围，并将商品关联到相应仓库；商品在两个及以上国家可售后，就能在这里上传各市场图片。</Text></div>}
      </Container>

      <Container className="p-5">
        <Heading level="h2">商品配送范围</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">需要调整仓库和商品的配送关系时，请到「发货地址与商品」；商品价格在 Medusa「设置 → 销售区域」管理。</Text>
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

export const config = defineRouteConfig({ label: "国家与商品", rank: 2 })

export default MarketManagementPage
