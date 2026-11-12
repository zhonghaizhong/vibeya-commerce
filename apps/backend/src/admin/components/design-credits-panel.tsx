import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type DesignCreditConfig = {
  initialDesigns: number
  perPaidProductDesigns: number
}

const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"
const labelClass = "text-sm font-medium text-ui-fg-base"

const DesignCreditsPage = () => {
  const [config, setConfig] = useState<DesignCreditConfig>({ initialDesigns: 30, perPaidProductDesigns: 50 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/admin/vibeya/design-credits", { credentials: "same-origin" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "读取设计次数规则失败。")
      setConfig(data.config)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取设计次数规则失败。")
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
      const response = await fetch("/admin/vibeya/design-credits", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "保存设计次数规则失败。")
      setConfig(data.config)
      setMessage("设计次数规则已保存，前台立即生效。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存设计次数规则失败。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-y-6">
      <div>
        <Heading level="h1">设计次数规则</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          设置顾客登录后的免费设计次数，以及每件已付款商品增加的次数。未登录顾客不能提交 AI 设计。
        </Text>
      </div>

      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}

      <Container className="flex flex-col gap-y-5 p-5">
        {loading ? <Text>正在读取规则…</Text> : <>
          <label className={labelClass}>
            登录后的初始免费设计次数
            <input
              className={inputClass}
              type="number"
              min={0}
              max={10000}
              step={1}
              value={config.initialDesigns}
              onChange={(event) => setConfig({ ...config, initialDesigns: Number(event.target.value) })}
            />
        <Text size="small" className="mt-1 text-ui-fg-subtle">所有登录顾客都可使用此初始额度；调整规则会立即更新尚未使用的次数。</Text>
          </label>

          <label className={labelClass}>
            每件已付款商品赠送的免费设计次数
            <input
              className={inputClass}
              type="number"
              min={0}
              max={10000}
              step={1}
              value={config.perPaidProductDesigns}
              onChange={(event) => setConfig({ ...config, perPaidProductDesigns: Number(event.target.value) })}
            />
            <Text size="small" className="mt-1 text-ui-fg-subtle">只统计规则启用后创建且已付款的订单，按每件商品数量计算；未付款订单不赠送。</Text>
          </label>

          <div className="rounded-md bg-ui-bg-subtle p-4">
            <Text size="small" className="text-ui-fg-subtle">
              设计任务成功完成后扣除 1 次；排队中的任务会暂时占用 1 次，失败任务不扣次数。未登录拦截与次数上限由服务器执行。
            </Text>
          </div>

          <div>
            <button type="button" disabled={saving || loading} onClick={save} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">
              {saving ? "保存中…" : "保存规则"}
            </button>
          </div>
        </>}
      </Container>
    </div>
  )
}

export default DesignCreditsPage
