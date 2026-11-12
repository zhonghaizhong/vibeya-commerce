import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type CustomerQuery = {
  graph: (input: Record<string, unknown>) => Promise<{ data: Array<{ id: string; email?: string | null }> }>
}

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
    auth_identity_id?: string
    auth_provider?: string
  }
}

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

export const POST = async (req: AuthenticatedRequest, res: MedusaResponse) => {
  const identityId = req.auth_context?.auth_identity_id
  const provider = req.auth_context?.auth_provider
  if (!identityId || !["emailpass", "google", "paypal"].includes(provider || "")) {
    return res.status(403).json({ error: "This sign-in method cannot be linked to a customer account." })
  }

  const auth = req.scope.resolve(Modules.AUTH) as IAuthModuleService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as CustomerQuery
  const [identity, providerIdentities] = await Promise.all([
    auth.retrieveAuthIdentity(identityId),
    auth.listProviderIdentities(
      { auth_identity_id: identityId },
      { select: ["provider", "entity_id", "user_metadata"] }
    ),
  ])

  const providerIdentity = providerIdentities.find((item) => item.provider === provider)
  const email = normalizeEmail(
    provider === "emailpass"
      ? providerIdentity?.entity_id
      : providerIdentity?.user_metadata?.email
  )
  if (!email) {
    return res.status(403).json({ error: "The sign-in provider did not supply an email address." })
  }

  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { email: { $ilike: email } },
  })
  const matchingCustomers = data.filter((customer) => normalizeEmail(customer.email) === email)
  if (matchingCustomers.length === 0) return res.json({ linked: false })
  if (matchingCustomers.length > 1) {
    return res.status(409).json({ error: "More than one customer record uses this email. Please contact support." })
  }

  const customerId = matchingCustomers[0].id
  const appMetadata = identity.app_metadata || {}
  const linkedCustomerId = appMetadata.customer_id
  if (linkedCustomerId && linkedCustomerId !== customerId) {
    return res.status(409).json({ error: "This sign-in is already linked to a different customer account." })
  }

  if (linkedCustomerId !== customerId) {
    await auth.updateAuthIdentities({
      id: identity.id,
      app_metadata: { ...appMetadata, customer_id: customerId },
    })
  }

  return res.json({ linked: true })
}
