import type { ExecArgs } from "@medusajs/framework/types"
import configureVibeyaMadeToOrderInventory from "../scripts/configure-vibeya-made-to-order-inventory"
import configureVibeyaUsMarket from "../scripts/configure-vibeya-us-market"
import seedVibeyaFulfillmentLocations from "../scripts/seed-vibeya-fulfillment-locations"
import seedVibeyaHomeProducts from "../scripts/seed-vibeya-home-products"

export default async function seedVibeyaCustomShowerCurtain({ container }: ExecArgs) {
  await seedVibeyaHomeProducts({ container } as ExecArgs)
  await configureVibeyaUsMarket({ container } as ExecArgs)
  await configureVibeyaMadeToOrderInventory({ container } as ExecArgs)
  await seedVibeyaFulfillmentLocations({ container } as ExecArgs)
}
