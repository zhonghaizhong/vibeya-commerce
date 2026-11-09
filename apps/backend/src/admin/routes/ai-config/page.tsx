import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type AIConfig = {
  baseUrl: string
  model: string
  aspectRatio: string
  quality: "auto" | "low" | "medium" | "high" | "xhigh" | "max"
  hasApiKey: boolean
  apiKeyHint: string
}

const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"
const labelClass = "text-sm font-medium text-ui-fg-base"

async function responseError(response: Response, fallback: string): Promise<string> {
  const text = await response.text()
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: unknown; message?: unknown; detail?: unknown }
      for (const candidate of [data.error, data.message, data.detail]) {
        if (typeof candidate === "string" && candidate.trim()) return candidate
      }
    } catch {
      // Medusa can return a plain text or HTML error page; show its status below.
    }
  }
  return `${fallback}（服务器返回 ${response.status}）`
}

const AIConfigPage = () => {
  const [config, setConfig] = useState<AIConfig>({
    baseUrl: "https://grsai.dakka.com.cn",
    model: "gpt-image-2.5",
    aspectRatio: "1:1",
    quality: "auto",
    hasApiKey: false,
    apiKeyHint: "",
  })
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const pixelSizeModels = ["gpt-image-2-vip", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2.6-flare", "gpt-image-2.6-sunburst"]
  const aspectOptions = pixelSizeModels.includes(config.model)
    ? [
        ["1024x1024", "正方形 · 1K"],
        ["2048x2048", "正方形 · 2K"],
        ["2880x2880", "正方形 · 4K"],
        ["1024x1536", "竖版 · 1K"],
        ["1536x1024", "横版 · 1K"],
      ]
    : [
        ["1:1", "正方形 · 1:1"],
        ["16:9", "横版 · 16:9"],
        ["9:16", "竖版 · 9:16"],
        ["4:3", "横版 · 4:3"],
        ["3:4", "竖版 · 3:4"],
      ]
  const qualityOptions = config.model === "gpt-image-2.5-sunburst"
    ? ["auto", "low", "medium", "high", "xhigh", "max"]
    : ["gpt-image-2-vip", "gpt-image-2.5-flare", "gpt-image-2.6-flare", "gpt-image-2.6-sunburst"].includes(config.model)
      ? ["auto", "low", "medium", "high"]
      : ["auto"]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/admin/vibeya/ai", { credentials: "same-origin" })
      if (!response.ok) throw new Error(await responseError(response, "读取 AI 配置失败。"))
      const data = await response.json()
      setConfig(data.config)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取 AI 配置失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    setMessage("")
    setError("")
    try {
      const response = await fetch("/admin/vibeya/ai", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, apiKey }),
      })
      if (!response.ok) throw new Error(await responseError(response, "保存 AI 配置失败。"))
      const data = await response.json()
      setConfig(data.config)
      setApiKey("")
      setMessage("配置已安全保存。前台 AI 定制现在会使用这套服务。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存 AI 配置失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-y-6">
      <div>
        <Heading level="h1">AI 配置</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          在这里连接图片生成服务。保存后，前台设计工作室的“生成设计”会调用此服务。
        </Text>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}

      <Container className="flex flex-col gap-y-5 p-5">
        {loading ? <Text>正在读取配置…</Text> : <>
          <label className={labelClass}>
            GrsAI 节点
            <select className={inputClass} value={config.baseUrl} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })}>
              <option value="https://grsai.dakka.com.cn">国内节点</option>
              <option value="https://grsaiapi.com">全球节点</option>
            </select>
          </label>

          <label className={labelClass}>
            图片模型
            <select className={inputClass} value={config.model} onChange={(event) => {
              const model = event.target.value
              const pixelSize = pixelSizeModels.includes(model)
              setConfig({ ...config, model, quality: "auto", aspectRatio: pixelSize ? "1024x1024" : "1:1" })
            }}>
              <option value="gpt-image-2">GPT Image 2</option>
              <option value="gpt-image-2-vip">GPT Image 2 VIP</option>
              <option value="gpt-image-2.5">GPT Image 2.5</option>
              <option value="gpt-image-2.5-flare">GPT Image 2.5 Flare</option>
              <option value="gpt-image-2.5-sunburst">GPT Image 2.5 Sunburst</option>
              <option value="gpt-image-2.6">GPT Image 2.6</option>
              <option value="gpt-image-2.6-flare">GPT Image 2.6 Flare</option>
              <option value="gpt-image-2.6-sunburst">GPT Image 2.6 Sunburst</option>
            </select>
          </label>

          <label className={labelClass}>
            图片尺寸
            <select className={inputClass} value={config.aspectRatio} onChange={(event) => setConfig({ ...config, aspectRatio: event.target.value })}>
              {aspectOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {pixelSizeModels.includes(config.model) && <Text className="mt-1 text-xs text-ui-fg-subtle">2K / 4K 图片更清晰，也会消耗更多 API 额度。生成仍保持正方形商品图。</Text>}
          </label>

          <label className={labelClass}>
            图片质量
            <select className={inputClass} value={config.quality} onChange={(event) => setConfig({ ...config, quality: event.target.value as AIConfig["quality"] })}>
              {qualityOptions.map((quality) => <option key={quality} value={quality}>{quality === "auto" ? "自动（推荐）" : quality.toUpperCase()}</option>)}
            </select>
          </label>

          <label className={labelClass}>
            API 密钥
            <input
              className={inputClass}
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={config.hasApiKey ? `已保存（末尾 ${config.apiKeyHint}），留空表示不更换` : "粘贴服务商提供的 API 密钥"}
              autoComplete="new-password"
            />
            <Text size="small" className="mt-1 text-ui-fg-subtle">
              填写你 GrsAI 账户里的 API 密钥。密钥只保存在后端并加密，不会发送到顾客浏览器。
              <a className="ml-1 underline" href="https://grsai.ai/zh/dashboard/api-keys" target="_blank" rel="noreferrer">获取 GrsAI API Key</a>
            </Text>
          </label>

          <div className="rounded-md bg-ui-bg-subtle p-4">
            <Text size="small" className="text-ui-fg-subtle">
              保存配置不会生成图片。前台每次点击“生成设计”会调用一次 GrsAI 并按账户模型扣积分；模型质量和尺寸请按你的账户支持情况选择。
            </Text>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving || loading} onClick={save} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">
              {saving ? "保存中…" : "保存 AI 配置"}
            </button>
          </div>
        </>}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "AI 配置", rank: 2 })

export default AIConfigPage
