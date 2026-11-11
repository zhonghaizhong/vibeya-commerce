import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import VibeyaGoogleAuthService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [VibeyaGoogleAuthService],
})
