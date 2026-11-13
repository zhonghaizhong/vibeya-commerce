import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VIBEYA_AI_JOBS_MODULE } from "../../../../../modules/vibeya-ai-jobs"
import { getVibeyaProductReference } from "../../../../../lib/vibeya-product-references"
import {
  getVibeyaDesignCredits,
  reconcileVibeyaDesignReservations,
} from "../../../../../lib/vibeya-design-credits"

type JobService = {
  createVibeyaAiJobs(data: Record<string, unknown>): Promise<any>
  updateVibeyaAiJobs(data: Record<string, unknown>): Promise<any>
  listVibeyaAiJobs(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<any[]>
}
const DESIGN_GENERATION_PRODUCT_IDS = new Set([
  "sds-167256",
  "vibeya-washed-hoodie",
  "sds-128646",
  "sds-97226",
  "sds-138708",
  "sds-172647",
  "vibeya-shower-curtain",
])

const serviceFor = (req: MedusaRequest) =>
  req.scope.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as JobService
const customerFor = (req: MedusaRequest) =>
  (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id

const customerGenerationLocks = new Map<string, Promise<void>>()
async function withCustomerGenerationLock<T>(customerId: string, task: () => Promise<T>): Promise<T> {
  const previous = customerGenerationLocks.get(customerId) ?? Promise.resolve()
  let release = () => {}
  const current = new Promise<void>((resolve) => { release = resolve })
  customerGenerationLocks.set(customerId, current)
  await previous
  try {
    return await task()
  } finally {
    release()
    if (customerGenerationLocks.get(customerId) === current) customerGenerationLocks.delete(customerId)
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = customerFor(req)
  if (!customerId) return res.status(401).json({ error: "Please sign in to view your designs." })
  const service = serviceFor(req)
  const jobs = await service.listVibeyaAiJobs(
    { customer_id: customerId },
    { order: { created_at: "DESC" }, take: 100 }
  )
  const credits = await getVibeyaDesignCredits(req.scope, customerId, service)
  return res.json({ jobs: jobs.filter((job) => !["deleted", "deleted-failed"].includes(job.status)).slice(0, 30).map(({ references: _references, image: _image, ...job }) => job), credits })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = customerFor(req)
  if (!customerId) return res.status(401).json({ error: "Please sign in before creating a design." })

  const body = req.body as Record<string, unknown> | undefined
  const references = Array.isArray(body?.references) ? body.references : []
  const preserveBaseComposite = typeof body?.preserveBaseComposite === "string" ? body.preserveBaseComposite : ""
  let productReference = typeof body?.productReference === "string" ? body.productReference : ""
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
  const productId = typeof body?.productId === "string" ? body.productId : ""
  const color = typeof body?.color === "string" ? body.color : ""
  const size = typeof body?.size === "string" ? body.size : ""
  if (!productId || !color || !size) {
    return res.status(400).json({ error: "Choose a product, color, and size before creating your design. These choices will be saved with it." })
  }
  if (!DESIGN_GENERATION_PRODUCT_IDS.has(productId)) {
    return res.status(400).json({ error: "AI design generation is not available for this product yet. Please choose another product." })
  }
  if (!prompt && body?.productId !== "sds-128646") {
    return res.status(400).json({ error: "Please enter a design description before submitting." })
  }
  const isTumbler = body?.productId === "sds-128646"
  const isBlanket = productId === "sds-97226"
  const isBathMat = productId === "sds-138708"
  const isBeanie = productId === "sds-172647"
  const isShowerCurtain = productId === "vibeya-shower-curtain"
  if (isShowerCurtain && !["36x70.8in", "60x70.8in", "70.8x70.8in", "70.8x84in"].includes(size)) {
    return res.status(400).json({ error: "Choose one of the available shower curtain sizes before creating your design." })
  }
  if ((isBlanket || isBathMat || isBeanie || isShowerCurtain) && !productReference) {
    try {
      productReference = await getVibeyaProductReference(productId, color, size)
    } catch (error) {
      console.error("Unable to load the VIBEYA product print reference", error)
      return res.status(503).json({ error: isBeanie ? "The beanie print-area reference is not available right now. Please try again later." : "The product print reference is not available right now. Please try again later." })
    }
  }
  if (isTumbler && !productReference) {
    return res.status(400).json({ error: "The tumbler print-area reference is missing. Refresh the page and try again." })
  }
  if (isShowerCurtain && !productReference) {
    return res.status(400).json({ error: "The selected shower curtain size reference is missing. Refresh the page and try again." })
  }
  if (productReference && (productReference.length > (isBeanie || isShowerCurtain ? 32000 : 14000) || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(productReference))) {
    return res.status(400).json({ error: "The product print-area reference is invalid. Refresh the page and try again." })
  }
  const placement = isBlanket || isBathMat || isBeanie || isShowerCurtain ? "front" : body?.printPlacement
  const placementGuideCount = isBlanket || isBathMat || isBeanie || isShowerCurtain ? 0 : placement === "both" ? 2 : ["front", "back", "wrap"].includes(String(placement)) ? 1 : 0
  const maximumReferences = isTumbler || isBlanket || isBathMat || isBeanie || isShowerCurtain ? 6 : 2 + placementGuideCount + 6
  if (references.length > maximumReferences || references.some((item) => typeof item !== "string") || JSON.stringify(references).length > 300_000 || preserveBaseComposite.length > 150_000 || (preserveBaseComposite && !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(preserveBaseComposite))) {
    return res.status(400).json({ error: "The reference image is too large. Please compress it and try again." })
  }

  const service = serviceFor(req)
  const reservation = await withCustomerGenerationLock(customerId, async () => {
    const available = await getVibeyaDesignCredits(req.scope, customerId, service)
    if (available.remaining < 1) return { exhausted: true as const, credits: available }

    const job = await service.createVibeyaAiJobs({
      customer_id: customerId,
      status: "reservation_pending",
      prompt: typeof body?.prompt === "string" ? body.prompt : "",
      product_id: productId,
      color,
      size,
      print_placement: String(placement ?? ""),
      preserve_original_design: body?.preserveOriginalDesign === true,
      references: JSON.stringify({ images: references, preserveBaseComposite, productReference }),
    })
    const reconciled = await reconcileVibeyaDesignReservations(req.scope, customerId, service)
    if (!reconciled.acceptedJobIds.includes(job.id)) {
      return { exhausted: true as const, credits: reconciled.credits }
    }
    return { exhausted: false as const, job, credits: reconciled.credits }
  })
  if (reservation.exhausted) {
    return res.status(403).json({
      error: "You have used all available design generations.",
      credits: reservation.credits,
    })
  }

  return res.status(202).json({
    job: { id: reservation.job.id, status: reservation.job.status },
    credits: reservation.credits,
  })
}
