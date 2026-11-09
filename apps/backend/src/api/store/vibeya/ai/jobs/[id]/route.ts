import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VIBEYA_AI_JOBS_MODULE } from "../../../../../../modules/vibeya-ai-jobs"

type JobService = {
  listVibeyaAiJobs(filters: Record<string, unknown>): Promise<any[]>
  updateVibeyaAiJobs(data: Record<string, unknown>): Promise<any>
}

const customerFor = (req: MedusaRequest) =>
  (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id
const jobIdFor = (req: MedusaRequest) => {
  const fromBody = (req.body as { id?: unknown } | undefined)?.id
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim()
  const fromQuery = (req.query as { job_id?: unknown } | undefined)?.job_id
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim()
  const fromParams = typeof req.params?.id === "string" ? req.params.id.trim() : ""
  if (fromParams) return fromParams
  const path = (req as MedusaRequest & { originalUrl?: string }).originalUrl || req.url || ""
  const match = path.match(/\/store\/vibeya\/ai\/jobs\/([^/?#]+)\/?(?:[?#]|$)/)
  if (!match) return ""
  try { return decodeURIComponent(match[1]).trim() } catch { return "" }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = customerFor(req)
  if (!customerId) return res.status(401).json({ error: "Please sign in to view your designs." })
  const id = jobIdFor(req)
  if (!id) return res.status(400).json({ error: "This design link is missing its task ID. Refresh My Designs and try again." })
  const service = req.scope.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as JobService
  const [job] = await service.listVibeyaAiJobs({ id, customer_id: customerId })
  if (!job || ["deleted", "deleted-failed"].includes(job.status)) return res.status(404).json({ error: "This design task could not be found." })
  return res.json({ job })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = customerFor(req)
  if (!customerId) return res.status(401).json({ error: "Please sign in to generate this design." })
  const id = jobIdFor(req)
  if (!id) return res.status(400).json({ error: "This design link is missing its task ID." })
  const service = req.scope.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as JobService
  let [job] = await service.listVibeyaAiJobs({ id, customer_id: customerId })
  if (!job || ["deleted", "deleted-failed"].includes(job.status)) return res.status(404).json({ error: "This design task could not be found." })
  if (job.status === "failed" && job.provider_task_id) {
    job = await service.updateVibeyaAiJobs({ id: job.id, status: "processing", error: "" })
  }
  return res.status(202).json({ job: { id: job.id, status: job.status, error: job.error } })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = customerFor(req)
  if (!customerId) return res.status(401).json({ error: "Please sign in to delete your design." })
  const id = jobIdFor(req)
  if (!id) return res.status(400).json({ error: "This design link is missing its task ID. Refresh My Designs and try again." })
  const service = req.scope.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as JobService
  const [job] = await service.listVibeyaAiJobs({ id, customer_id: customerId })
  if (!job || ["deleted", "deleted-failed"].includes(job.status)) return res.status(404).json({ error: "This design task could not be found." })
  await service.updateVibeyaAiJobs({
    id: job.id,
    // A queued task has not started generation, so deleting it restores its
    // reserved design credit. Once processing begins, the credit stays used.
    status: ["failed", "queued", "reservation_pending"].includes(job.status) ? "deleted-failed" : "deleted",
    prompt: "",
    references: "[]",
    image: "",
    error: "",
  })
  return res.json({ id, deleted: true })
}
