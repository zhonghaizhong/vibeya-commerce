import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"

type OrderItem = {
  id: string
  title: string
  variant_title?: string | null
  quantity: number
  thumbnail?: string | null
}

const OrderProductImagesWidget = () => {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<OrderItem[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!id) return
      try {
        const response = await fetch(`/admin/vibeya/orders/${encodeURIComponent(id)}/images`, { credentials: "same-origin", cache: "no-store" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "订单商品图片读取失败。")
        if (active) setItems(data.order?.items ?? [])
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "订单商品图片读取失败。")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id])

  return (
    <Container className="p-0">
      <div className="border-b border-ui-border-base px-6 py-4">
        <Heading level="h2">商品图片</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">订单创建时保存的商品图片与款式信息。</Text>
      </div>
      {loading ? <div className="p-6"><Text>正在读取订单商品…</Text></div> : error ? (
        <div className="p-6"><Text className="text-ui-fg-error">{error}</Text></div>
      ) : items.length === 0 ? (
        <div className="p-6"><Text className="text-ui-fg-subtle">订单没有可显示的商品。</Text></div>
      ) : (
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-lg border border-ui-border-base p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ui-bg-subtle">
                {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" /> : <Text size="small" className="text-ui-fg-subtle">无图片</Text>}
              </div>
              <div className="min-w-0">
                <Text className="font-medium">{item.title}</Text>
                {item.variant_title && <Text size="small" className="mt-1 text-ui-fg-subtle">{item.variant_title}</Text>}
                <Text size="small" className="mt-1 text-ui-fg-subtle">数量：{item.quantity}</Text>
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.after" })

export default OrderProductImagesWidget
