import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"
import { VIBEYA_AI_JOBS_MODULE } from "../../../../modules/vibeya-ai-jobs"
import {
  DEFAULT_VIBEYA_DESIGN_CREDITS_START_AT,
  VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY,
  toVibeyaCustomerCreditAdjustment,
  toVibeyaDesignCreditConfig,
  VIBEYA_DESIGN_CREDITS_METADATA_KEY,
  isVibeyaOrderPaid,
} from "../../../../lib/vibeya-design-credits"

type CustomerRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  registered_at: string | null
  is_registered: boolean
  has_active_cart: boolean
  cart_item_count: number
  cart_updated_at: string | null
  order_count: number
  paid_order_count: number
  last_order_at: string | null
  last_paid_order_at: string | null
  design_total: number | null
  design_used: number | null
  design_remaining: number | null
}

type JobService = {
  listVibeyaAiJobs(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<Array<{
    customer_id: string
    status: string
    created_at?: string | Date
  }>>
}

const normalizedEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const newestDate = (current: string | null, candidate: unknown) => {
  if (typeof candidate !== "string" || !Number.isFinite(Date.parse(candidate))) return current
  return !current || Date.parse(candidate) > Date.parse(current) ? candidate : current
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

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data: any[] }>
  }
  const jobService = req.scope.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as JobService

  try {
    const [{ data: customers }, { data: carts }, { data: orders }, { data: stores }, jobs] = await Promise.all([
      query.graph({
        entity: "customer",
        fields: ["id", "email", "first_name", "last_name", "phone", "created_at", "has_account", "metadata"],
        pagination: { take: 10000, order: { created_at: "DESC" } },
      }),
      query.graph({
        entity: "cart",
        fields: ["id", "customer_id", "email", "created_at", "updated_at", "completed_at", "items.id", "items.quantity"],
        filters: { completed_at: null },
        pagination: { take: 10000, order: { updated_at: "DESC" } },
      }),
      query.graph({
        entity: "order",
        fields: ["id", "customer_id", "email", "created_at", "payment_status", "total", "payment_collections.status", "payment_collections.captured_amount", "items.quantity", "shipping_address.first_name", "shipping_address.last_name", "shipping_address.phone"],
        pagination: { take: 10000, order: { created_at: "DESC" } },
      }),
      query.graph({ entity: "store", fields: ["metadata"] }),
      jobService.listVibeyaAiJobs({}, { select: ["id", "customer_id", "status", "created_at"], take: 100000 }),
    ])

    const storedConfig = stores[0]?.metadata?.[VIBEYA_DESIGN_CREDITS_METADATA_KEY]
    const creditConfig = toVibeyaDesignCreditConfig(storedConfig)
    const storedActivation = storedConfig && typeof storedConfig === "object"
      ? (storedConfig as Record<string, unknown>).activatedAt
      : null
    const activatedAt = typeof storedActivation === "string" && Number.isFinite(Date.parse(storedActivation))
      ? Date.parse(storedActivation)
      : Date.parse(DEFAULT_VIBEYA_DESIGN_CREDITS_START_AT)
    const postActivationOrdersByCustomerId = new Map<string, Map<string, any>>()
    const postActivationOrdersByEmail = new Map<string, Map<string, any>>()
    for (const order of orders) {
      if (typeof order.id !== "string") continue
      if (typeof order.customer_id === "string") {
        const customerOrders = postActivationOrdersByCustomerId.get(order.customer_id) ?? new Map<string, any>()
        customerOrders.set(order.id, order)
        postActivationOrdersByCustomerId.set(order.customer_id, customerOrders)
      }
      const email = normalizedEmail(order.email)
      if (email) {
        const emailOrders = postActivationOrdersByEmail.get(email) ?? new Map<string, any>()
        emailOrders.set(order.id, order)
        postActivationOrdersByEmail.set(email, emailOrders)
      }
    }

    const paidProductsForCustomer = (customerId: string, emailValue: unknown) => {
      const matchingOrders = new Map<string, any>()
      for (const order of postActivationOrdersByCustomerId.get(customerId)?.values() ?? []) matchingOrders.set(order.id, order)
      const email = normalizedEmail(emailValue)
      for (const order of postActivationOrdersByEmail.get(email)?.values() ?? []) matchingOrders.set(order.id, order)
      return Array.from(matchingOrders.values()).reduce((total, order) => {
        if (!isVibeyaOrderPaid(order)) return total
        if ((timestampOf(order.created_at) ?? Number.NEGATIVE_INFINITY) < activatedAt) return total
        const quantity = Array.isArray(order.items)
          ? order.items.reduce((count: number, item: { quantity?: number }) => count + Math.max(0, Number(item.quantity) || 0), 0)
          : 0
        return total + quantity
      }, 0)
    }
    const usedDesigns = new Map<string, number>()
    for (const job of jobs) {
      if (!job.customer_id || !["reservation_pending", "queued", "processing", "completed", "deleted"].includes(job.status)) continue
      if ((timestampOf(job.created_at) ?? Number.NEGATIVE_INFINITY) < activatedAt) continue
      usedDesigns.set(job.customer_id, (usedDesigns.get(job.customer_id) ?? 0) + 1)
    }

    const rows = new Map<string, CustomerRow>()
    const byCustomerId = new Map<string, CustomerRow>()
    const byEmail = new Map<string, CustomerRow>()

    const getOrCreate = (customerId: unknown, emailValue: unknown): CustomerRow | null => {
      const customerIdValue = typeof customerId === "string" ? customerId : ""
      const email = normalizedEmail(emailValue)
      let row = customerIdValue ? byCustomerId.get(customerIdValue) : undefined
      if (!customerIdValue) row ??= email ? byEmail.get(email) : undefined
      if (!row && !customerIdValue && !email) return null

      if (!row) {
        const id = customerIdValue || `guest:${email}`
        row = {
          id,
          email,
          first_name: "",
          last_name: "",
          phone: "",
          registered_at: null,
          is_registered: false,
          has_active_cart: false,
          cart_item_count: 0,
          cart_updated_at: null,
          order_count: 0,
          paid_order_count: 0,
          last_order_at: null,
          last_paid_order_at: null,
          design_total: null,
          design_used: null,
          design_remaining: null,
        }
        rows.set(id, row)
      }

      if (customerIdValue) byCustomerId.set(customerIdValue, row)
      if (email) {
        row.email ||= email
        byEmail.set(email, row)
      }
      return row
    }

    const registeredCustomers = customers.filter((customer: any) => customer.has_account)
    const guestCustomers = customers.filter((customer: any) => !customer.has_account)

    for (const customer of registeredCustomers) {
      const row = getOrCreate(customer.id, customer.email)
      if (!row) continue
      row.is_registered = true
      row.registered_at = customer.created_at ?? row.registered_at
      row.first_name = customer.first_name ?? row.first_name
      row.last_name = customer.last_name ?? row.last_name
      row.phone = customer.phone ?? row.phone
      const designUsed = usedDesigns.get(customer.id) ?? 0
      const storedAdjustment = customer.metadata?.[VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY]
      const adjustment = toVibeyaCustomerCreditAdjustment(storedAdjustment)
      const paidProductCount = paidProductsForCustomer(customer.id, customer.email)
      const designTotal = Math.max(0, creditConfig.initialDesigns + paidProductCount * creditConfig.perPaidProductDesigns + adjustment)
      row.design_total = designTotal
      row.design_used = designUsed
      row.design_remaining = Math.max(0, designTotal - designUsed)
    }

    for (const customer of guestCustomers) {
      const row = getOrCreate(null, customer.email)
      if (!row) continue
      byCustomerId.set(customer.id, row)
      row.first_name ||= customer.first_name ?? ""
      row.last_name ||= customer.last_name ?? ""
      row.phone ||= customer.phone ?? ""
    }

    for (const cart of carts) {
      if (cart.completed_at || !Array.isArray(cart.items) || cart.items.length === 0) continue
      const row = getOrCreate(cart.customer_id, cart.email)
      if (!row) continue
      row.has_active_cart = true
      row.cart_item_count += cart.items.reduce(
        (count: number, item: { quantity?: number }) => count + Math.max(1, Number(item.quantity) || 1),
        0
      )
      row.cart_updated_at = newestDate(row.cart_updated_at, cart.updated_at ?? cart.created_at)
    }

    for (const order of orders) {
      const row = getOrCreate(order.customer_id, order.email)
      if (!row) continue
      row.order_count += 1
      row.last_order_at = newestDate(row.last_order_at, order.created_at)
      if (isVibeyaOrderPaid(order)) {
        row.paid_order_count += 1
        row.last_paid_order_at = newestDate(row.last_paid_order_at, order.created_at)
      }
      row.first_name ||= order.shipping_address?.first_name ?? ""
      row.last_name ||= order.shipping_address?.last_name ?? ""
      row.phone ||= order.shipping_address?.phone ?? ""
    }

    const result = Array.from(rows.values()).sort((first, second) => {
      const firstActivity = Math.max(
        first.last_order_at ? Date.parse(first.last_order_at) : 0,
        first.cart_updated_at ? Date.parse(first.cart_updated_at) : 0,
        first.registered_at ? Date.parse(first.registered_at) : 0
      )
      const secondActivity = Math.max(
        second.last_order_at ? Date.parse(second.last_order_at) : 0,
        second.cart_updated_at ? Date.parse(second.cart_updated_at) : 0,
        second.registered_at ? Date.parse(second.registered_at) : 0
      )
      return secondActivity - firstActivity
    })

    return res.json({
      customers: result,
      summary: {
        total: result.length,
        registered: result.filter((customer) => customer.is_registered).length,
        withCart: result.filter((customer) => customer.has_active_cart).length,
        ordered: result.filter((customer) => customer.order_count > 0).length,
        paid: result.filter((customer) => customer.paid_order_count > 0).length,
      },
      cartDefinition: "Customers with an identifiable email/customer record and at least one item in an open cart.",
    })
  } catch (error) {
    console.error("Unable to load VIBEYA customer segments", error)
    return res.status(500).json({ error: "客户数据暂时无法读取，请稍后重试。" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { customerId?: unknown; designRemaining?: unknown } | undefined
  const customerId = typeof body?.customerId === "string" ? body.customerId : ""
  const designRemaining = Number(body?.designRemaining)
  if (!customerId || !Number.isInteger(designRemaining) || designRemaining < 0 || designRemaining > 10000) {
    return res.status(400).json({ error: "剩余设计次数必须是 0 到 10,000 之间的整数。" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data: any[] }>
  }
  const jobService = req.scope.resolve(VIBEYA_AI_JOBS_MODULE) as unknown as JobService
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "has_account", "metadata"],
    filters: { id: customerId },
    pagination: { take: 1 },
  })
  let customer = customers[0] as { id: string; email?: string | null; has_account?: boolean; metadata?: Record<string, unknown> | null } | undefined
  if (customer && !customer.has_account && customer.email) {
    const { data: sameEmailCustomers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "has_account", "metadata"],
      filters: { email: customer.email },
      pagination: { take: 100 },
    })
    customer = sameEmailCustomers.find((entry: any) => entry.has_account) ?? customer
  }
  if (!customer) return res.status(404).json({ error: "没有找到这位已注册客户。" })
  if (!customer.has_account) return res.status(400).json({ error: "只能修改已注册客户的设计次数。" })

  const [{ data: stores }, { data: orders }, jobs] = await Promise.all([
    query.graph({ entity: "store", fields: ["metadata"] }),
    query.graph({ entity: "order", fields: ["id", "created_at", "payment_status", "total", "payment_collections.status", "payment_collections.captured_amount", "items.quantity"], filters: { customer_id: customer.id }, pagination: { take: 10000 } }),
    jobService.listVibeyaAiJobs({ customer_id: customer.id }, { select: ["id", "status", "created_at"], take: 100000 }),
  ])

  const storedConfig = stores[0]?.metadata?.[VIBEYA_DESIGN_CREDITS_METADATA_KEY]
  const creditConfig = toVibeyaDesignCreditConfig(storedConfig)
  const storedActivation = storedConfig && typeof storedConfig === "object"
    ? (storedConfig as Record<string, unknown>).activatedAt
    : null
  const activatedAt = typeof storedActivation === "string" && Number.isFinite(Date.parse(storedActivation))
    ? Date.parse(storedActivation)
    : Date.parse(DEFAULT_VIBEYA_DESIGN_CREDITS_START_AT)
  const paidProductCount = orders.reduce((total, order) => {
    if (!isVibeyaOrderPaid(order) || (timestampOf(order.created_at) ?? Number.NEGATIVE_INFINITY) < activatedAt) return total
    const quantity = Array.isArray(order.items)
      ? order.items.reduce((count: number, item: { quantity?: number }) => count + Math.max(0, Number(item.quantity) || 0), 0)
      : 0
    return total + quantity
  }, 0)
  const designUsed = jobs.filter((job) =>
    ["reservation_pending", "queued", "processing", "completed", "deleted"].includes(job.status) &&
    (timestampOf(job.created_at) ?? Number.NEGATIVE_INFINITY) >= activatedAt
  ).length
  const baseTotal = creditConfig.initialDesigns + paidProductCount * creditConfig.perPaidProductDesigns
  const adjustment = designRemaining + designUsed - baseTotal

  try {
    const { result: savedCustomers } = await updateCustomersWorkflow(req.scope).run({
      input: {
        selector: { id: customer.id },
        update: {
          metadata: {
            ...(customer.metadata ?? {}),
            [VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY]: adjustment,
          },
        },
      },
    })

    const savedCustomer = savedCustomers.find((entry) => entry.id === customer.id)
    const workflowAdjustment = savedCustomer?.metadata?.[VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY]
    const { data: persistedCustomers } = await query.graph({
      entity: "customer",
      fields: ["id", "metadata"],
      filters: { id: customer.id },
      pagination: { take: 1 },
    })
    const persistedAdjustment = persistedCustomers[0]?.metadata?.[VIBEYA_CUSTOMER_DESIGN_CREDIT_ADJUSTMENT_KEY]
    if (Number(workflowAdjustment) !== adjustment || Number(persistedAdjustment) !== adjustment) {
      return res.status(500).json({ error: "设计次数没有写入成功，请刷新后台后重试。" })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "后台保存流程未完成。"
    return res.status(500).json({ error: `设计次数保存失败：${message}` })
  }

  return res.json({ customerId: customer.id, designTotal: designUsed + designRemaining, designUsed, designRemaining })
}
