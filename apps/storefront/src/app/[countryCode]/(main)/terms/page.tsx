import { Metadata } from "next"

import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { PolicyPage } from "@modules/policies/templates"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
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
  const title = marketCopy?.termsMeta ?? `${STORE_NAME} Terms of Service`
  const description = marketCopy?.termsDescription ?? `Review the purchase, payment, shipping, and custom-order terms for shopping at ${STORE_NAME}.`

  return {
    title,
    description,
    alternates: { canonical: `${origin}/${countryCode}/terms` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${origin}/${countryCode}/terms`,
      siteName: STORE_NAME,
    },
  }
}

export default async function TermsPage({ params }: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await params
  const marketCopy = getMarketUiCopy(countryCode)
  return (
    <PolicyPage title={marketCopy?.termsTitle ?? "Terms of service"} countryCode={countryCode}>
      {marketCopy ? (
        <>
          <p>{marketCopy.termsIntro}</p>
          <p>
            {marketCopy.termsPayment}{" "}
            <LocalizedClientLink
              className="font-semibold text-[#7251b4]"
              href="/returns"
            >
              {marketCopy.returnsTitle}
            </LocalizedClientLink>
          </p>
        </>
      ) : (
        <>
          <p>
            By placing an order with {STORE_NAME} you agree to these terms. Prices,
            product availability and shipping options are shown on the product pages
            and at checkout, and may change without notice.
          </p>
          <p>
            Orders are confirmed by email once payment is received. Custom-made
            products cannot be returned or exchanged. If an order arrives damaged or
            incorrect, contact us so we can review the issue under our{" "}
            <LocalizedClientLink
              className="font-semibold text-[#7251b4]"
              href="/returns"
            >
              custom order policy
            </LocalizedClientLink>
            .
          </p>
        </>
      )}
    </PolicyPage>
  )
}
