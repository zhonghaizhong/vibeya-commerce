"use client"

import { useParams } from "next/navigation"
import { getMarketUiCopy } from "@lib/util/market-ui-copy"
import InteractiveLink from "@modules/common/components/interactive-link"

export default function MarketNotFound() {
  const { countryCode } = useParams<{ countryCode?: string }>()
  const marketCopy = getMarketUiCopy(countryCode)

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl-semi text-ui-fg-base">
        {marketCopy?.pageNotFound ?? "Page not found"}
      </h1>
      <p className="text-small-regular text-ui-fg-base">
        {marketCopy?.pageNotFoundDescription ?? "The page you tried to access does not exist."}
      </p>
      <InteractiveLink href="/">
        {marketCopy?.goHome ?? "Go to frontpage"}
      </InteractiveLink>
    </div>
  )
}
