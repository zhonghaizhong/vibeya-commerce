import { model } from "@medusajs/framework/utils"

const VibeyaAiJob = model.define("vibeya_ai_job", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  status: model.text(),
  prompt: model.text(),
  product_id: model.text(),
  color: model.text(),
  size: model.text().default(""),
  print_placement: model.text(),
  preserve_original_design: model.boolean().default(false),
  references: model.text(),
  image: model.text().default(""),
  error: model.text().default(""),
  provider_task_id: model.text().default(""),
})

export default VibeyaAiJob
