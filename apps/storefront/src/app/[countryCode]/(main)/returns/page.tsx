import { Metadata } from "next"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { PolicyPage } from "@modules/policies/templates"
import { getMarketUiCopy } from "@lib/util/market-ui-copy"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await params
  const origin = await getSiteOrigin()
  const marketCopy = getMarketUiCopy(countryCode)
  const title = marketCopy?.returnsMeta ?? "Custom Order & Return Policy"
  const description = marketCopy?.returnsDescription ??
    "Read VIBEYA’s policy for returns, exchanges, and help with damaged or incorrect made-to-order clothing."

  return {
    title: `${title} | ${STORE_NAME}`,
    description,
    alternates: { canonical: `${origin}/${countryCode}/returns` },
    openGraph: {
      type: "website",
      title: `${title} | ${STORE_NAME}`,
      description,
      url: `${origin}/${countryCode}/returns`,
      siteName: STORE_NAME,
    },
  }
}

export default async function ReturnsPage({ params }: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await params
  const marketCopy = getMarketUiCopy(countryCode)
  if (marketCopy) {
    return (
      <PolicyPage title={marketCopy.returnsTitle} countryCode={countryCode}>
        <p>{marketCopy.madeToOrder}</p>
        <p>{marketCopy.noChangeReturns}</p>
        <p>{marketCopy.damagedOrder}</p>
      </PolicyPage>
    )
  }
  return (
    <PolicyPage title="Custom order policy">
      <p>
        Every VIBEYA item is made to order and personalized especially for you.
      </p>
      <p>
        Because each item is custom made, we cannot accept returns or exchanges
        for change of mind, or for a size, color, or design choice selected at
        checkout.
      </p>
      <p>
        If your order arrives damaged, has a manufacturing defect, or is
        different from what you ordered, contact us with your order number and
        photos so we can review the issue and help resolve it.
      </p>
    </PolicyPage>
  )
}
