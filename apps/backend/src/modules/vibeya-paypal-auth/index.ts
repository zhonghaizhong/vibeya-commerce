import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import VibeyaPayPalAuthService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [VibeyaPayPalAuthService],
})
