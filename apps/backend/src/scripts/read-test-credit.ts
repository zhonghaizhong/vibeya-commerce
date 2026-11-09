import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VIBEYA_AI_JOBS_MODULE } from "../modules/vibeya-ai-jobs"
import { VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY, getVibeyaDesignCredits } from "../lib/vibeya-design-credits"

export default async function readTestCredit({ container }: { container: any }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const service = container.resolve(VIBEYA_AI_JOBS_MODULE)
  const { data } = await query.graph({ entity: "customer", fields: ["id", "metadata"], filters: { email: "bestgiftspersonalized@gmail.com" }, pagination: { take: 1 } })
  const customer = data[0]
  if (!customer) return console.log(JSON.stringify({ found: false }))
  const credits = await getVibeyaDesignCredits(container, customer.id, service)
  const jobs = await service.listVibeyaAiJobs({ customer_id: customer.id }, { select: ["id", "status"], take: 100000 })
  console.log(JSON.stringify({ found: true, adjustment: customer.metadata?.[VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY] ?? null, total: credits.total, used: credits.used, remaining: credits.remaining, jobStatusCounts: jobs.reduce((result: Record<string, number>, job: any) => { result[job.status] = (result[job.status] || 0) + 1; return result }, {}) }))
}
