import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VIBEYA_AI_JOBS_MODULE } from "../modules/vibeya-ai-jobs"
import { POST as generateImage } from "../api/store/vibeya/ai/generate/route"

type JobService = {
  updateVibeyaAiJobs(data: Record<string, unknown>): Promise<any>
  listVibeyaAiJobs(filters: Record<string, unknown>): Promise<any[]>
}

const runningJobs = new Map<string, Promise<any>>()
const customerQueues = new Map<string, Promise<void>>()

export function processVibeyaAiJob(req: MedusaRequest, job: any, customerId: string): Promise<any> {
  const jobId = String(job.id)
  const existing = runningJobs.get(jobId)
  if (existing) return existing

  const service = req.scope.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as JobService
  const previous = customerQueues.get(customerId) ?? Promise.resolve()
  const task = previous.catch(() => undefined).then(async () => {
    const [currentJob] = await service.listVibeyaAiJobs({ id: jobId, customer_id: customerId })
    if (!currentJob || ["deleted", "deleted-failed", "completed", "failed"].includes(currentJob.status)) return currentJob

    await service.updateVibeyaAiJobs({ id: jobId, status: "processing", error: "" })
    let activeProviderTaskId = currentJob.provider_task_id || ""
    let references: unknown[] = []
    let preserveBaseComposite = ""
    let productReference = ""
    try {
      const parsed = JSON.parse(currentJob.references || "[]")
      if (Array.isArray(parsed)) references = parsed
      else if (parsed && typeof parsed === "object") {
        const stored = parsed as { images?: unknown; preserveBaseComposite?: unknown; productReference?: unknown }
        if (Array.isArray(stored.images)) references = stored.images
        if (typeof stored.preserveBaseComposite === "string") preserveBaseComposite = stored.preserveBaseComposite
        if (typeof stored.productReference === "string") productReference = stored.productReference
      }
    } catch {}

    const workerRequest = Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
      body: {
        prompt: currentJob.prompt,
        productId: currentJob.product_id,
        color: currentJob.color,
        size: currentJob.size,
        printPlacement: currentJob.print_placement,
        preserveOriginalDesign: currentJob.preserve_original_design,
        preserveBaseComposite,
        productReference,
        references,
        providerTaskId: activeProviderTaskId,
      },
      vibeyaCreditReserved: true,
      vibeyaBackgroundJob: true,
      vibeyaSaveProviderTaskId: async (taskId: string) => {
        activeProviderTaskId = taskId
        return service.updateVibeyaAiJobs({ id: jobId, provider_task_id: taskId })
      },
    }) as MedusaRequest

    let responseBody: Record<string, unknown> = {}
    let responseStatus = 200
    const response = {
      status(code: number) { responseStatus = code; return this },
      json(payload: Record<string, unknown>) { responseBody = payload; return payload },
    } as unknown as MedusaResponse

    try {
      await generateImage(workerRequest, response)
      const [latestJob] = await service.listVibeyaAiJobs({ id: jobId, customer_id: customerId })
      if (!latestJob || ["deleted", "deleted-failed"].includes(latestJob.status)) return latestJob
      if (responseBody.pending === true) {
        return await service.updateVibeyaAiJobs({
          id: jobId,
          status: "processing",
          provider_task_id: typeof responseBody.providerTaskId === "string"
            ? responseBody.providerTaskId
            : currentJob.provider_task_id || "",
          error: "",
        })
      }
      if (responseStatus < 200 || responseStatus >= 300 || typeof responseBody.image !== "string") {
        const message = typeof responseBody.error === "string" ? responseBody.error : "Image generation failed. Please try again."
        const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as { warn?: (message: string) => void }
        logger.warn?.(`[VIBEYA AI] Job ${jobId} failed: ${message.slice(0, 300)}`)
        if (responseBody.providerFailed === true) {
          return await service.updateVibeyaAiJobs({
            id: jobId,
            status: "failed",
            provider_task_id: "",
            error: message,
          })
        }
        const pendingTaskId = typeof responseBody.providerTaskId === "string"
          ? responseBody.providerTaskId
          : activeProviderTaskId
        if (pendingTaskId) {
          return await service.updateVibeyaAiJobs({
            id: jobId,
            status: "processing",
            provider_task_id: pendingTaskId,
            error: "",
          })
        }
        throw new Error(/[\u3400-\u9fff]/.test(message) ? "Image generation failed. Please try again." : message)
      }
      return await service.updateVibeyaAiJobs({
        id: jobId,
        status: "completed",
        image: responseBody.image,
        references: "[]",
        provider_task_id: "",
        error: "",
      })
    } catch (error) {
      const message = error instanceof Error && !/[\u3400-\u9fff]/.test(error.message)
        ? error.message
        : "Image generation failed. Please try again."
      const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as { warn?: (message: string) => void }
      logger.warn?.(`[VIBEYA AI] Job ${jobId} failed: ${error instanceof Error ? error.message.slice(0, 300) : "Unknown error"}`)
      if (activeProviderTaskId) {
        return await service.updateVibeyaAiJobs({
          id: jobId,
          status: "processing",
          error: "",
        })
      }
      return await service.updateVibeyaAiJobs({ id: jobId, status: "failed", error: message })
    }
  })

  runningJobs.set(jobId, task)
  const queueEntry = task.then(() => undefined, () => undefined)
  customerQueues.set(customerId, queueEntry)
  void task.finally(() => {
    if (runningJobs.get(jobId) === task) runningJobs.delete(jobId)
    if (customerQueues.get(customerId) === queueEntry) customerQueues.delete(customerId)
  })
  return task
}
