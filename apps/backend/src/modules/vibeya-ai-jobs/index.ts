import { Module } from "@medusajs/framework/utils"
import VibeyaAiJobsService from "./service"

export const VIBEYA_AI_JOBS_MODULE = "vibeyaAiJobs"

export default Module(VIBEYA_AI_JOBS_MODULE, {
  service: VibeyaAiJobsService,
})
