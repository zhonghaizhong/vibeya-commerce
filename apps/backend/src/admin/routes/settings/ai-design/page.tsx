import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import AIConfigPanel from "../../../components/ai-config-panel"
import DesignCreditsPanel from "../../../components/design-credits-panel"

type Section = "generation" | "credits"

const sections: { id: Section; label: string; description: string }[] = [
  { id: "generation", label: "图片生成服务", description: "选择生成模型并连接图片服务商。" },
  { id: "credits", label: "免费设计额度", description: "设置登录赠送次数和付款后的奖励次数。" },
]

const AIDesignSettingsPage = () => {
  const [section, setSection] = useState<Section>("generation")

  return (
    <div className="flex max-w-5xl flex-col gap-y-5">
      <div>
        <Heading level="h1">AI 设计</Heading>
        <Text className="mt-1 text-ui-fg-subtle">管理图片生成服务和顾客可使用的设计额度。</Text>
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="tablist" aria-label="AI 设计设置">
        {sections.map((item) => {
          const selected = section === item.id
          return (
            <button
              key={item.id}
              id={`ai-design-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`ai-design-panel-${item.id}`}
              onClick={() => setSection(item.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${selected ? "border-ui-border-interactive bg-ui-bg-interactive-subtle" : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle"}`}
            >
              <Text className="font-medium text-ui-fg-base">{item.label}</Text>
              <Text size="small" className="mt-1 text-ui-fg-subtle">{item.description}</Text>
            </button>
          )
        })}
      </div>

      <Container id={`ai-design-panel-${section}`} role="tabpanel" aria-labelledby={`ai-design-tab-${section}`} className="p-5">
        {section === "generation" ? <AIConfigPanel /> : <DesignCreditsPanel />}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "AI 设计", rank: 3 })

export default AIDesignSettingsPage
