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
  const title = marketCopy?.privacyMeta ?? `${STORE_NAME} Privacy Policy`
  const description = marketCopy?.privacyDescription ?? `Learn how ${STORE_NAME} collects, uses, and protects personal information when you shop online.`

  return {
    title,
    description,
    alternates: { canonical: `${origin}/${countryCode}/privacy` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${origin}/${countryCode}/privacy`,
      siteName: STORE_NAME,
    },
  }
}

export default async function PrivacyPage({ params }: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await params
  const marketCopy = getMarketUiCopy(countryCode)
  return (
    <PolicyPage title={marketCopy?.privacyTitle ?? "Privacy policy"} countryCode={countryCode}>
      {marketCopy ? (
        <>
          <p>{marketCopy.privacyOrder}</p>
          <p>{marketCopy.privacyPayment}</p>
        </>
      ) : (
        <>
          <p>
            {STORE_NAME} collects the information you provide at checkout, such as
            your name, email address and shipping address, to process and deliver
            your order.
          </p>
          <p>
            Payment details are handled by our payment provider and are not stored
            by VIBEYA. Cookies are used to keep your cart and sign-in session.
          </p>
        </>
      )}
    </PolicyPage>
  )
}
