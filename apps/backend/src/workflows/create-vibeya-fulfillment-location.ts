import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  createFulfillmentSets,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"

type CreateVibeyaFulfillmentLocationInput = {
  name: string
  address: {
    address_1: string
    address_2?: string
    city: string
    province?: string
    postal_code?: string
    country_code: string
  }
  metadata: Record<string, unknown>
  regionId: string
  salesChannelId?: string
  shippingProfileId: string
}

type CreateLocationLinksInput = {
  stockLocationId: string
  fulfillmentSetId: string
  salesChannelId?: string
}

type LinkDefinition = Record<string, Record<string, string>>

type VibeyaLinkService = {
  create(links: LinkDefinition[]): Promise<unknown>
  dismiss(links: LinkDefinition[]): Promise<unknown>
}

const createLocationLinksStep = createStep(
  "create-location-links",
  async (input: CreateLocationLinksInput, { container }) => {
    const links: Record<string, Record<string, string>>[] = [
      {
        [Modules.STOCK_LOCATION]: { stock_location_id: input.stockLocationId },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      },
      {
        [Modules.STOCK_LOCATION]: { stock_location_id: input.stockLocationId },
        [Modules.FULFILLMENT]: { fulfillment_set_id: input.fulfillmentSetId },
      },
    ]
    if (input.salesChannelId) {
      links.push({
        [Modules.STOCK_LOCATION]: { stock_location_id: input.stockLocationId },
        [Modules.SALES_CHANNEL]: { sales_channel_id: input.salesChannelId },
      })
    }

    await container.resolve<VibeyaLinkService>(ContainerRegistrationKeys.LINK).create(links)
    return new StepResponse(undefined, links)
  },
  async (createdLinks, { container }) => {
    if (!createdLinks) return
    await container.resolve<VibeyaLinkService>(ContainerRegistrationKeys.LINK).dismiss(createdLinks)
  }
)

const createVibeyaFulfillmentLocationWorkflow = createWorkflow(
  "create-vibeya-fulfillment-location",
  (input: CreateVibeyaFulfillmentLocationInput) => {
    const locations = createStockLocationsWorkflow.runAsStep({
      input: {
        locations: [{ name: input.name, address: input.address, metadata: input.metadata }],
      },
    })
    const location = locations[0]

    const fulfillmentSetName = transform(input, (data) => `${data.name} Shipping`)
    const fulfillmentSets = createFulfillmentSets([{
      name: fulfillmentSetName,
      type: "shipping",
    }])
    const fulfillmentSet = fulfillmentSets[0]

    createLocationLinksStep({
      stockLocationId: location.id,
      fulfillmentSetId: fulfillmentSet.id,
      salesChannelId: input.salesChannelId,
    })

    const serviceZoneData = transform(input, (data) => ({
      name: `${data.name} ${data.address.country_code.toUpperCase()} Shipping Zone`,
      countryCode: data.address.country_code.toLowerCase(),
    }))
    const serviceZones = createServiceZonesWorkflow.runAsStep({
      input: {
        data: [{
          name: serviceZoneData.name,
          fulfillment_set_id: fulfillmentSet.id,
          geo_zones: [{ type: "country", country_code: serviceZoneData.countryCode }],
        }],
      },
    })
    const serviceZone = serviceZones[0]

    createShippingOptionsWorkflow.runAsStep({
      input: ["USPS", "GOFO Parcel"].map((name) => ({
        name,
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: serviceZone.id,
        shipping_profile_id: input.shippingProfileId,
        type: {
          label: name,
          description: "Free shipping in the United States",
          code: name === "USPS" ? "ydl-usps-ga" : "gofo-parcel-mix",
        },
        prices: [{ region_id: input.regionId, amount: 0 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })),
    })

    return new WorkflowResponse(location)
  }
)

export default createVibeyaFulfillmentLocationWorkflow
