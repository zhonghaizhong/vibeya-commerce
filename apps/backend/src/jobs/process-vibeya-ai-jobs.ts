import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VIBEYA_AI_JOBS_MODULE } from "../modules/vibeya-ai-jobs"
import { processVibeyaAiJob } from "../lib/vibeya-ai-job-worker"
import { reconcileVibeyaDesignReservations } from "../lib/vibeya-design-credits"

type QueueJob = {
  id: string
  customer_id: string
  status: string
  created_at?: string | Date
}

type QueueService = {
  listVibeyaAiJobs(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<QueueJob[]>
}

const timestampOf = (value: unknown) => {
  const parsed = value instanceof Date ? value.getTime() : typeof value === "string" ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export default async function processVibeyaAiJobs(container: MedusaContainer) {
  const service = container.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as QueueService
  const initialJobs = await service.listVibeyaAiJobs(
    { status: ["reservation_pending", "queued", "processing"] },
    { select: ["id", "customer_id", "status", "created_at"], take: 500, order: { created_at: "ASC" } }
  )
  const pendingCustomers = [...new Set(initialJobs
    .filter((job) => job.status === "reservation_pending")
    .map((job) => job.customer_id)
    .filter(Boolean))]

  await Promise.all(pendingCustomers.map(async (customerId) => {
    try {
      await reconcileVibeyaDesignReservations(container, customerId, service as never)
    } catch (error) {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as { warn?: (message: string) => void }
      logger.warn?.(`[VIBEYA AI] Could not reconcile design credits for ${customerId}: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }))

  const jobs = await service.listVibeyaAiJobs(
    { status: ["queued", "processing"] },
    { select: ["id", "customer_id", "status", "created_at"], take: 20, order: { created_at: "ASC" } }
  )
  const runnableJobs = jobs.sort((first, second) => timestampOf(first.created_at) - timestampOf(second.created_at))
  await Promise.all(runnableJobs.map(async (job) => {
    if (!job.customer_id) return
    try {
      const request = { scope: container, ip: `vibeya-customer:${job.customer_id}` }
      await processVibeyaAiJob(request as never, job, job.customer_id)
    } catch (error) {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as { warn?: (message: string) => void }
      logger.warn?.(`[VIBEYA AI] Background task ${job.id} will be retried: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }))
}

export const config = {
  name: "process-vibeya-ai-jobs",
  schedule: { interval: 10_000, concurrency: "forbid" as const },
}
