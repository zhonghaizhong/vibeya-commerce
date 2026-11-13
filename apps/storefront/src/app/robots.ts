import { getSiteOrigin } from "@lib/util/site"
import type { MetadataRoute } from "next"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getSiteOrigin()
  const restrictedPaths = [
    "/*/cart",
    "/*/checkout",
    "/*/account",
    "/*/order/",
    "/buy/",
  ]

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: restrictedPaths,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: restrictedPaths,
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  }
}
