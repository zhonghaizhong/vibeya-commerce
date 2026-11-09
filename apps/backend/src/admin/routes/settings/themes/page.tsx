import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Theme = {
  id: string
  name: string
  description: string
  previewUrl: string
  active: boolean
}

const ThemeManagementPage = () => {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/theme", { credentials: "same-origin" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取主题失败。")
      setThemes(data.themes ?? [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取主题失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const publish = async (themeId: string) => {
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/theme", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeThemeId: themeId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "发布主题失败。")
      setThemes(data.themes ?? [])
      toast.success("主题已发布")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "发布主题失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-y-6">
      <div>
        <Heading level="h1">主题管理</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          管理当前店铺使用的前台主题。发布主题不会改动商品、订单或顾客设计。
        </Text>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}

      {loading ? <Container className="p-5"><Text>正在读取主题…</Text></Container> : themes.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {themes.map((theme) => (
            <Container key={theme.id} className="flex flex-col gap-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Heading level="h2">{theme.name}</Heading>
                  <Text size="small" className="mt-1 text-ui-fg-subtle">当前网站设计</Text>
                </div>
                {theme.active && <Badge color="green">已发布</Badge>}
              </div>
              <div className="aspect-[16/7] overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle">
                <iframe title={`${theme.name} preview`} src={theme.previewUrl} className="h-full w-full border-0" loading="lazy" />
              </div>
              <Text className="text-ui-fg-subtle">{theme.description}</Text>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" asChild>
                  <a href={theme.previewUrl} target="_blank" rel="noreferrer">预览前台</a>
                </Button>
                <Button disabled={saving || theme.active} onClick={() => publish(theme.id)}>
                  {theme.active ? "当前已发布" : "发布主题"}
                </Button>
              </div>
            </Container>
          ))}
        </div>
      ) : <Container className="p-5"><Text>暂无可用主题。</Text></Container>}

      <Container className="p-5">
        <Heading level="h2">主题说明</Heading>
        <Text className="mt-2 text-ui-fg-subtle">
          目前已登记并启用 VIBEYA Original，即你现在设计的这套网站主题。其他主题需要先完成前台页面设计，再添加到这里发布。
        </Text>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "主题管理", rank: 10 })

export default ThemeManagementPage
