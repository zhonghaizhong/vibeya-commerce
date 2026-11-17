import { Metadata } from "next"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"

import { PolicyPage } from "@modules/policies/templates"
import { getMarketUiCopy } from "@lib/util/market-ui-copy"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await params
  const origin = await getSiteOrigin()
  const marketCopy = getMarketUiCopy(countryCode)
  const title = marketCopy?.shippingMeta ?? "U.S. Shipping & Delivery"
  const description =
    marketCopy?.shippingDescription ?? "Learn where VIBEYA ships, how delivery works, and why shipping is free on custom graphic apparel orders in the United States."

  return {
    title: `${title} | ${STORE_NAME}`,
    description,
    alternates: { canonical: `${origin}/${countryCode}/shipping` },
    openGraph: {
      type: "website",
      title: `${title} | ${STORE_NAME}`,
      description,
      url: `${origin}/${countryCode}/shipping`,
      siteName: STORE_NAME,
    },
  }
}

export default async function ShippingPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const marketCopy = getMarketUiCopy(countryCode)
  const shipsToUs = countryCode.toLowerCase() === "us"
  const supportedMarket = ["jp", "mx"].includes(countryCode.toLowerCase())

  return (
    <PolicyPage title={marketCopy?.shippingTitle ?? "Shipping information"} countryCode={countryCode}>
      {shipsToUs ? (
        <>
          <p>VIBEYA custom products ship to U.S. addresses only.</p>
          <p>Shipping is free within the United States.</p>
          <p>
            Choose USPS or GOFO Parcel at checkout. Both delivery options are
            available for U.S. orders.
          </p>
        </>
      ) : supportedMarket ? (
        <>
          <p>{marketCopy?.shippingMarket}</p>
          <p>{marketCopy?.shippingMethods}</p>
        </>
      ) : (
        <p>
          This custom product is currently available for delivery to U.S.
          addresses only. Orders to other destinations are not available yet.
        </p>
      )}
    </PolicyPage>
  )
}
