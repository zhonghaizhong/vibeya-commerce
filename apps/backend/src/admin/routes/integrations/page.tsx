import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Config = {
  brevo: { enabled: boolean; host: string; port: number; login: string; keyHint: string; hasKey: boolean; fromEmail: string; fromName: string }
  turnstile: { enabled: boolean; siteKey: string; secretHint: string; hasSecret: boolean }
  paypal: { enabled: boolean; clientId: string; secretHint: string; hasSecret: boolean; environment: "sandbox" | "production"; webhookId: string; autoCapture: boolean }
  google: { enabled: boolean; clientId: string; secretHint: string; hasSecret: boolean; callbackUrl: string }
}

const initialConfig: Config = {
  brevo: { enabled: false, host: "smtp-relay.brevo.com", port: 587, login: "", keyHint: "", hasKey: false, fromEmail: "", fromName: "VIBEYA" },
  turnstile: { enabled: false, siteKey: "", secretHint: "", hasSecret: false },
  paypal: { enabled: false, clientId: "", secretHint: "", hasSecret: false, environment: "sandbox", webhookId: "", autoCapture: true },
  google: { enabled: false, clientId: "", secretHint: "", hasSecret: false, callbackUrl: "http://localhost:8000/us/auth/google/callback" },
}

const inputClass = "mt-1 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base outline-none focus:border-ui-border-interactive"
const labelClass = "text-sm font-medium text-ui-fg-base"

async function readError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string }
  return body.error || `请求失败（${response.status}）`
}

const IntegrationsPage = () => {
  const [config, setConfig] = useState<Config>(initialConfig)
  const [secrets, setSecrets] = useState({ brevoKey: "", turnstileSecret: "", paypalSecret: "", googleSecret: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const copyCallbackUrl = async () => {
    try {
      await navigator.clipboard.writeText(config.google.callbackUrl)
      setMessage("Google 回调地址已复制。请把它粘贴到 Google Cloud 的“已获授权的重定向 URI”中。")
      setError("")
    } catch {
      setError("无法自动复制，请手动选中并复制回调地址。")
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/admin/vibeya/integrations", { credentials: "same-origin" })
      if (!response.ok) throw new Error(await readError(response))
      const data = await response.json()
      setConfig({ ...initialConfig, ...data.config })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取配置失败。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/admin/vibeya/integrations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brevo: { ...config.brevo, key: secrets.brevoKey },
          turnstile: { ...config.turnstile, secret: secrets.turnstileSecret },
          paypal: { ...config.paypal, secret: secrets.paypalSecret },
          google: { ...config.google, secret: secrets.googleSecret },
        }),
      })
      if (!response.ok) throw new Error(await readError(response))
      const data = await response.json()
      setConfig({ ...initialConfig, ...data.config })
      setSecrets({ brevoKey: "", turnstileSecret: "", paypalSecret: "", googleSecret: "" })
      setMessage("配置已加密保存。密钥不会在页面中再次显示。")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存配置失败。")
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, value: string | number, onChange: (value: string) => void, placeholder = "", type = "text") => (
    <label className={labelClass}>
      {label}
      <input className={inputClass} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} autoComplete={type === "password" ? "new-password" : undefined} />
    </label>
  )

  const toggle = (title: string, checked: boolean, onChange: (checked: boolean) => void, description: string) => (
    <label className="flex cursor-pointer items-start gap-3">
      <input className="mt-1 h-4 w-4 accent-ui-button-inverted" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span><Text className="font-medium">{title}</Text><Text size="small" className="text-ui-fg-subtle">{description}</Text></span>
    </label>
  )

  return (
    <div className="flex max-w-4xl flex-col gap-y-6">
      <div>
        <Heading level="h1">服务配置</Heading>
        <Text className="mt-1 text-ui-fg-subtle">按下面的指引逐项配置。密钥会加密后保存在店铺后台，不会显示给顾客。</Text>
      </div>
      {error && <Container className="border border-ui-border-error p-4"><Text className="text-ui-fg-error">{error}</Text></Container>}
      {message && <Container className="border border-ui-border-positive p-4"><Text className="text-ui-fg-positive">{message}</Text></Container>}

      {loading ? <Container className="p-5"><Text>正在读取配置…</Text></Container> : <>
        <Container className="flex flex-col gap-y-2 bg-ui-bg-subtle p-5">
          <Heading level="h2">第一次配置？</Heading>
          <Text size="small" className="text-ui-fg-subtle">建议先完成 Brevo 邮件配置，这是邮箱注册验证所必需的。Cloudflare、PayPal 和 Google 登录都是可选项；暂时不用时保持关闭即可。</Text>
          <Text size="small" className="text-ui-fg-subtle">操作顺序：在对应服务商创建或验证账号 → 按本页说明复制需要的资料 → 填入并保存。不要把密钥发给顾客或粘贴到公开页面。</Text>
        </Container>

        <Container className="flex flex-col gap-y-5 p-5">
          <div>
            <Heading level="h2">Brevo 注册验证邮件</Heading>
            <Text className="mt-1 text-ui-fg-subtle">新用户需要验证邮箱才能完成注册，所以这一项必填。</Text>
          </div>
          <Container className="bg-ui-bg-subtle p-4">
            <Text className="font-medium">去哪里找这些信息</Text>
            <Text size="small" className="mt-1 text-ui-fg-subtle">登录 Brevo → SMTP & API → SMTP：把页面上的 Login 填到“Brevo SMTP 登录名”，生成一把 SMTP Key 后填到“SMTP 密钥”。再到发件人设置中验证一个邮箱，并填入“发件邮箱”。服务器和端口通常保持 smtp-relay.brevo.com 与 587。</Text>
            <a className="mt-2 inline-block text-sm text-ui-fg-interactive underline" href="https://app.brevo.com/" target="_blank" rel="noreferrer">打开 Brevo</a>
          </Container>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field("SMTP 服务器", config.brevo.host, (host) => setConfig({ ...config, brevo: { ...config.brevo, host } }))}
            {field("SMTP 端口", config.brevo.port, (value) => setConfig({ ...config, brevo: { ...config.brevo, port: Number(value) } }), "587", "number")}
            {field("Brevo SMTP 登录名", config.brevo.login, (login) => setConfig({ ...config, brevo: { ...config.brevo, login } }), "例如 Brevo 页面显示的 Login")}
            {field("发件邮箱", config.brevo.fromEmail, (fromEmail) => setConfig({ ...config, brevo: { ...config.brevo, fromEmail } }), "已在 Brevo 验证的发件邮箱", "email")}
            {field("发件人名称", config.brevo.fromName, (fromName) => setConfig({ ...config, brevo: { ...config.brevo, fromName } }))}
            {field("SMTP 密钥", secrets.brevoKey, (brevoKey) => setSecrets({ ...secrets, brevoKey }), config.brevo.hasKey ? `已保存（末尾 ${config.brevo.keyHint}），留空不更换` : "粘贴 Brevo SMTP Key", "password")}
          </div>
        </Container>

        <Container className="flex flex-col gap-y-5 p-5">
          <div><Heading level="h2">Cloudflare 人机验证</Heading><Text className="mt-1 text-ui-fg-subtle">用于阻止批量注册。Site Key 可公开使用；Secret Key 仅保存在后端。</Text></div>
          {toggle("启用注册人机验证", config.turnstile.enabled, (enabled) => setConfig({ ...config, turnstile: { ...config.turnstile, enabled } }), "请先在 Cloudflare Turnstile 创建 localhost 和线上域名对应的验证组件。")}
          <Container className="bg-ui-bg-subtle p-4">
            <Text className="font-medium">去哪里找这些信息</Text>
            <Text size="small" className="mt-1 text-ui-fg-subtle">登录 Cloudflare → Turnstile → 创建 Widget，添加你要使用的域名。打开 Widget 后复制 Site Key 和 Secret Key，分别填入下方。仅本地测试时也要把 localhost 加入域名列表；还没创建 Widget 时先不要开启此功能。</Text>
            <a className="mt-2 inline-block text-sm text-ui-fg-interactive underline" href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer">打开 Cloudflare</a>
          </Container>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field("Site Key", config.turnstile.siteKey, (siteKey) => setConfig({ ...config, turnstile: { ...config.turnstile, siteKey } }))}
            {field("Secret Key", secrets.turnstileSecret, (secret) => setSecrets({ ...secrets, turnstileSecret: secret }), config.turnstile.hasSecret ? `已保存（末尾 ${config.turnstile.secretHint}），留空不更换` : "粘贴 Cloudflare Secret Key", "password")}
          </div>
        </Container>

        <Container className="flex flex-col gap-y-5 p-5">
          <div><Heading level="h2">PayPal 收款</Heading><Text className="mt-1 text-ui-fg-subtle">填写 PayPal 应用的 Client ID 和 Secret。正式收款前请切换到正式环境。</Text></div>
          {toggle("启用 PayPal", config.paypal.enabled, (enabled) => setConfig({ ...config, paypal: { ...config.paypal, enabled } }), "启用后会提供 PayPal 收款方式。")}
          <Container className="bg-ui-bg-subtle p-4">
            <Text className="font-medium">去哪里找这些信息</Text>
            <Text size="small" className="mt-1 text-ui-fg-subtle">登录 PayPal Developer → Apps & Credentials，创建应用后复制 Client ID 和 Secret。先用 Sandbox 测试；确认收款流程正常后，再切换到 Live 并填入正式应用的资料。Webhook ID 暂时没有时可留空。</Text>
            <a className="mt-2 inline-block text-sm text-ui-fg-interactive underline" href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noreferrer">打开 PayPal Developer</a>
          </Container>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field("PayPal Client ID", config.paypal.clientId, (clientId) => setConfig({ ...config, paypal: { ...config.paypal, clientId } }))}
            {field("PayPal Secret", secrets.paypalSecret, (secret) => setSecrets({ ...secrets, paypalSecret: secret }), config.paypal.hasSecret ? `已保存（末尾 ${config.paypal.secretHint}），留空不更换` : "粘贴 PayPal Secret", "password")}
            <label className={labelClass}>
              环境
              <select className={inputClass} value={config.paypal.environment} onChange={(event) => setConfig({ ...config, paypal: { ...config.paypal, environment: event.target.value as Config["paypal"]["environment"] } })}>
                <option value="sandbox">测试环境</option>
                <option value="production">正式环境</option>
              </select>
            </label>
            {field("Webhook ID（可选）", config.paypal.webhookId, (webhookId) => setConfig({ ...config, paypal: { ...config.paypal, webhookId } }), "PayPal Webhook 设置中的 ID")}
          </div>
          {toggle("下单后自动扣款", config.paypal.autoCapture, (autoCapture) => setConfig({ ...config, paypal: { ...config.paypal, autoCapture } }), "关闭时先授权，之后再由后台捕获款项。")}
        </Container>

        <Container className="flex flex-col gap-y-5 p-5">
          <div><Heading level="h2">Google 登录</Heading><Text className="mt-1 text-ui-fg-subtle">为店铺登录启用 Google OAuth。请在 Google Cloud 中创建 Web 应用，并把下方回调地址添加到“已获授权的重定向 URI”。</Text></div>
          {toggle("启用 Google 登录", config.google.enabled, (enabled) => setConfig({ ...config, google: { ...config.google, enabled } }), "保存后立即生效，无需修改服务器环境文件。")}
          <Container className="bg-ui-bg-subtle p-4">
            <Text className="font-medium">一步一步获取 Google 登录资料</Text>
            <Text size="small" className="mt-1 text-ui-fg-subtle">打开 Google Cloud → API 和服务 → 凭证 → 创建凭证 → OAuth 客户端 ID，应用类型选“Web 应用”。创建后把客户端 ID 和客户端密钥填入下方。然后将回调地址原样复制到 Google Cloud 的“已获授权的重定向 URI”。地址必须完全一致，包括协议、域名和路径。</Text>
            <a className="mt-2 inline-block text-sm text-ui-fg-interactive underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">打开 Google Cloud 凭证</a>
          </Container>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field("Google Client ID", config.google.clientId, (clientId) => setConfig({ ...config, google: { ...config.google, clientId } }), "以 .apps.googleusercontent.com 结尾")}
            {field("Google Client Secret", secrets.googleSecret, (secret) => setSecrets({ ...secrets, googleSecret: secret }), config.google.hasSecret ? `已保存（末尾 ${config.google.secretHint}），留空不更换` : "粘贴 Google Client Secret", "password")}
            {field("授权回调地址", config.google.callbackUrl, (callbackUrl) => setConfig({ ...config, google: { ...config.google, callbackUrl } }), "例如 https://vibeyastudio.com/us/auth/google/callback", "url")}
          </div>
          <Container className="flex flex-wrap items-center justify-between gap-3 bg-ui-bg-subtle p-3">
            <Text size="small" className="break-all text-ui-fg-subtle">本地测试地址通常以 http://localhost:8000 开头；线上请使用店铺正式域名。请以当前输入框中的地址为准，并在 Google Cloud 登记完全相同的地址。</Text>
            <button type="button" onClick={copyCallbackUrl} className="shrink-0 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-1.5 text-sm font-medium text-ui-fg-base">复制回调地址</button>
          </Container>
        </Container>

        <Container className="p-4"><Text size="small" className="text-ui-fg-subtle">安全提示：这里不会显示或导出完整密钥。请只在可信的管理后台录入服务商密钥。</Text></Container>
        <div><button type="button" disabled={saving} onClick={save} className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50">{saving ? "保存中…" : "保存服务配置"}</button></div>
      </>}
    </div>
  )
}

export const config = defineRouteConfig({ label: "服务配置", rank: 3 })

export default IntegrationsPage
