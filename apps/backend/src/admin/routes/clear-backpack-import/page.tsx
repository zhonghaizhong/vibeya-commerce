import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import productManifest from "../../data/clear-pvc-backpack-import.json"

type ImportResult = {
  dry_run?: boolean
  published?: boolean
  validated?: Array<{ handle: string; title: string; countries: string[]; category?: string | null; fulfillment_location?: string | null; image_count: number; variant_count: number }>
  products?: Array<{ id: string; handle: string; title: string }>
  error?: string
  errors?: string[]
  conflicts?: string[]
}

const ClearBackpackImportPage = () => {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult>()
  const [error, setError] = useState("")

  const submit = async (publish: boolean) => {
    setBusy(true)
    setError("")
    setResult(undefined)
    try {
      const response = await fetch("/admin/vibeya/products/import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productManifest, dryRun: !publish, publish }),
      })
      const data = await response.json() as ImportResult
      if (!response.ok) throw new Error([data.error, ...(data.errors ?? []), ...(data.conflicts ?? [])].filter(Boolean).join("\n") || "商品导入失败。")
      setResult(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "商品导入失败。")
    } finally {
      setBusy(false)
    }
  }

  const validation = result?.validated?.[0]

  return <Container className="divide-y p-0">
    <div className="px-6 py-4">
      <Heading level="h1">透明背包上架</Heading>
      <Text className="mt-2 text-ui-fg-subtle">按四站点配置导入透明 PVC 背包：美国、加拿大、墨西哥、日本；包含 3 种语言轮播图、One Size、各站点价格、Custom Bags 分类、免费配送及前片设计器。</Text>
    </div>
    <div className="space-y-4 px-6 py-5">
      <div className="rounded-lg border border-ui-border-base p-4">
        <Heading level="h2">导入前校验</Heading>
        <Text className="mt-2 text-ui-fg-subtle">先检查图片、分类、市场价格、发货地点及设计器底图。校验不会创建或修改商品。</Text>
        <Button className="mt-4" onClick={() => void submit(false)} isLoading={busy}>开始校验</Button>
      </div>
      {error ? <pre className="whitespace-pre-wrap rounded-lg border border-ui-tag-red-border bg-ui-tag-red-bg p-4 text-ui-tag-red-text">{error}</pre> : null}
      {validation ? <div className="rounded-lg border border-ui-tag-green-border bg-ui-tag-green-bg p-4">
        <Heading level="h2">校验通过</Heading>
        <Text className="mt-2">{validation.title} · {validation.image_count} 张商品图 · {validation.variant_count} 个变体 · {validation.countries.join(" / ").toUpperCase()} · {validation.fulfillment_location ?? "中国发货地点未确认"}</Text>
        <Button className="mt-4" onClick={() => void submit(true)} isLoading={busy}>确认创建并发布到四站点</Button>
      </div> : null}
      {result?.products?.length ? <div className="rounded-lg border border-ui-tag-green-border bg-ui-tag-green-bg p-4">
        <Heading level="h2">商品已发布</Heading>
        {result.products.map((product) => <Text key={product.id} className="mt-2">{product.title} · {product.handle} · {product.id}</Text>)}
      </div> : null}
    </div>
  </Container>
}

export const config = defineRouteConfig({ label: "透明背包上架", nested: "/products", rank: 4 })
export default ClearBackpackImportPage
