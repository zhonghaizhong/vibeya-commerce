import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const VIBEYA_DESIGN_CREDITS_METADATA_KEY = "vibeya_design_credits"
export const VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY = "vibeya_design_credit_adjustment"
export const DEFAULT_VIBEYA_DESIGN_CREDITS_START_AT = "2026-11-08T00:00:00.000Z"

export const DEFAULT_VIBEYA_DESIGN_CREDITS = {
  initialDesigns: 30,
  perPaidProductDesigns: 50,
}

export type VibeyaDesignCreditConfig = typeof DEFAULT_VIBEYA_DESIGN_CREDITS
export type VibeyaDesignCreditSummary = VibeyaDesignCreditConfig & {
  paidProductCount: number
  total: number
  used: number
  remaining: number
}

export function toVibeyaCustomerCreditAdjustment(value: unknown): number {
  const adjustment = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN
  return Number.isSafeInteger(adjustment) ? adjustment : 0
}

type RequestScope = { resolve: (key: string) => unknown }
type CreditJob = { id: string; status: string; created_at?: string | Date }
type CreditJobService = {
  listVibeyaAiJobs(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<CreditJob[]>
  updateVibeyaAiJobs(data: Record<string, unknown>): Promise<CreditJob>
}
type CreditQuery = {
  graph(input: Record<string, unknown>): Promise<{
    data: Array<{
      id?: string
      email?: string | null
      customer_id?: string | null
      created_at?: string
      metadata?: Record<string, unknown> | null
      payment_status?: string
      total?: number | string
      payment_collections?: Array<{
        status?: string
        captured_amount?: number | string | null
      }>
      items?: Array<{ quantity?: number | string }>
    }>
  }>
}

const timestampOf = (value: unknown): number | null => {
  const timestamp = value instanceof Date
    ? value.getTime()
    : typeof value === "number"
      ? value
      : typeof value === "string"
        ? Date.parse(value)
        : Number.NaN
  return Number.isFinite(timestamp) ? timestamp : null
}

export function isVibeyaOrderPaid(order: {
  payment_status?: string | null
  total?: number | string | null
  payment_collections?: Array<{
    status?: string | null
    captured_amount?: number | string | null
  }> | null
}): boolean {
  if (["refunded", "partially_refunded", "canceled", "not_paid"].includes(String(order.payment_status ?? ""))) return false
  if (order.payment_status === "captured") return true

  const total = Number(order.total)
  return (order.payment_collections ?? []).some((collection) => {
    if (collection.status === "captured") return true
    const captured = Number(collection.captured_amount)
    return Number.isFinite(total) && total > 0 && Number.isFinite(captured) && captured >= total - 0.01
  })
}

async function loadCreditState(scope: RequestScope, customerId: string, service: CreditJobService) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as CreditQuery
  const [storeResult, customerResult, jobs] = await Promise.all([
    query.graph({ entity: "store", fields: ["metadata"] }),
    query.graph({
      entity: "customer",
      fields: ["id", "email", "metadata"],
      filters: { id: customerId },
      pagination: { take: 1 },
    }),
    service.listVibeyaAiJobs(
      { customer_id: customerId },
      { select: ["id", "status", "created_at"], take: 100000 }
    ),
  ])
  const customer = customerResult.data[0]
  const customerEmail = typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : ""
  const orderFields = ["id", "email", "customer_id", "created_at", "payment_status", "total", "payment_collections.status", "payment_collections.captured_amount", "items.quantity"]
  const [customerOrders, emailOrders] = await Promise.all([
    query.graph({
      entity: "order",
      fields: orderFields,
      filters: { customer_id: customerId },
      pagination: { skip: 0, take: 10000, order: { created_at: "DESC" } },
    }),
    customerEmail
      ? query.graph({
          entity: "order",
          fields: orderFields,
          filters: { email: { $ilike: customerEmail } },
          pagination: { skip: 0, take: 10000, order: { created_at: "DESC" } },
        })
      : Promise.resolve({ data: [] }),
  ])
  const ordersById = new Map<string, (typeof customerOrders.data)[number]>()
  for (const order of [...customerOrders.data, ...emailOrders.data]) {
    if (order.id) ordersById.set(order.id, order)
  }
  const orders = [...ordersById.values()].filter((order) =>
    order.customer_id === customerId ||
    (customerEmail && typeof order.email === "string" && order.email.trim().toLowerCase() === customerEmail)
  )
  const storedConfig = storeResult.data[0]?.metadata?.[VIBEYA_DESIGN_CREDITS_METADATA_KEY]
  const config = toVibeyaDesignCreditConfig(storedConfig)
  const storedActivation = storedConfig && typeof storedConfig === "object"
    ? (storedConfig as Record<string, unknown>).activatedAt
    : null
  const activatedAt = typeof storedActivation === "string" && Number.isFinite(Date.parse(storedActivation))
    ? Date.parse(storedActivation)
    : Date.parse(DEFAULT_VIBEYA_DESIGN_CREDITS_START_AT)
  const paidProductCount = orders.reduce((total, order) => {
    if (!isVibeyaOrderPaid(order) || (timestampOf(order.created_at) ?? Number.NEGATIVE_INFINITY) < activatedAt) return total
    return total + (order.items ?? []).reduce((quantity, item) => quantity + Math.max(0, Number(item.quantity) || 0), 0)
  }, 0)
  const storedAdjustment = customer?.metadata?.[VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY]
  const adjustment = toVibeyaCustomerCreditAdjustment(storedAdjustment)
  const total = Math.max(0, config.initialDesigns + paidProductCount * config.perPaidProductDesigns + adjustment)
  const eligibleJobs = jobs.filter((job) =>
    (timestampOf(job.created_at) ?? Number.NEGATIVE_INFINITY) >= activatedAt
  )
  const used = eligibleJobs.filter((job) =>
    ["reservation_pending", "queued", "processing", "completed", "deleted"].includes(job.status)
  ).length

  return {
    summary: {
      ...config,
      paidProductCount,
      total,
      used,
      remaining: Math.max(0, total - used),
    },
    activatedAt,
    eligibleJobs,
  }
}

export async function getVibeyaDesignCredits(
  scope: RequestScope,
  customerId: string,
  service: CreditJobService
): Promise<VibeyaDesignCreditSummary> {
  return (await loadCreditState(scope, customerId, service)).summary
}

/**
 * Finalize durable credit reservations in database order. Concurrent requests
 * may both create a pending row, but only the earliest rows fitting the current
 * balance transition to queued; excess reservations are refunded.
 */
export async function reconcileVibeyaDesignReservations(
  scope: RequestScope,
  customerId: string,
  service: CreditJobService
): Promise<{ credits: VibeyaDesignCreditSummary; acceptedJobIds: string[] }> {
  const state = await loadCreditState(scope, customerId, service)
  const activeJobs = state.eligibleJobs.filter((job) =>
    ["queued", "processing", "completed", "deleted"].includes(job.status)
  )
  const pendingJobs = state.eligibleJobs
    .filter((job) => job.status === "reservation_pending")
    .sort((first, second) => {
      const firstTime = timestampOf(first.created_at) ?? 0
      const secondTime = timestampOf(second.created_at) ?? 0
      return firstTime - secondTime || first.id.localeCompare(second.id)
    })
  const acceptedJobs = pendingJobs.slice(0, Math.max(0, state.summary.total - activeJobs.length))
  const acceptedJobIds = acceptedJobs.map((job) => job.id)
  const accepted = new Set(acceptedJobIds)

  await Promise.all(pendingJobs.map((job) => {
    const isAccepted = accepted.has(job.id)
    const update: Record<string, unknown> = {
      id: job.id,
      status: isAccepted ? "queued" : "deleted-failed",
      error: isAccepted ? "" : "You have used all available design generations.",
    }
    if (!isAccepted) {
      update.prompt = ""
      update.references = "[]"
    }
    return service.updateVibeyaAiJobs(update)
  }))

  const used = activeJobs.length + acceptedJobs.length
  return {
    credits: { ...state.summary, used, remaining: Math.max(0, state.summary.total - used) },
    acceptedJobIds,
  }
}

export function toVibeyaDesignCreditConfig(value: unknown): VibeyaDesignCreditConfig {
  if (!value || typeof value !== "object") return DEFAULT_VIBEYA_DESIGN_CREDITS

  const config = value as Record<string, unknown>
  const initialDesigns = Number(config.initialDesigns)
  const perPaidProductDesigns = Number(config.perPaidProductDesigns ?? config.perOrderDesigns)

  return {
    initialDesigns: Number.isInteger(initialDesigns) && initialDesigns >= 0 ? initialDesigns : DEFAULT_VIBEYA_DESIGN_CREDITS.initialDesigns,
    perPaidProductDesigns: Number.isInteger(perPaidProductDesigns) && perPaidProductDesigns >= 0 ? perPaidProductDesigns : DEFAULT_VIBEYA_DESIGN_CREDITS.perPaidProductDesigns,
  }
}
