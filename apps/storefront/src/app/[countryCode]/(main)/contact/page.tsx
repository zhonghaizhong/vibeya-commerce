import { Metadata } from "next"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { PolicyPage } from "@modules/policies/templates"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await params
  const origin = await getSiteOrigin()
  const title = "VIBEYA Customer Support"
  const description =
    "Contact VIBEYA for help with a custom apparel order, delivery, damaged items, or product questions."

  return {
    title: `${title} | ${STORE_NAME}`,
    description,
    alternates: { canonical: `${origin}/${countryCode}/contact` },
    openGraph: {
      type: "website",
      title: `${title} | ${STORE_NAME}`,
      description,
      url: `${origin}/${countryCode}/contact`,
      siteName: STORE_NAME,
    },
  }
}

export default function ContactPage() {
  return (
    <PolicyPage title="We're here to help">
      <p>
        Need help with a custom item or delivery? Reply to your order
        confirmation email and include your order number and a short description
        of the issue.
      </p>
      <p>
        If your item arrived damaged or different from what you ordered, please
        include a clear photo so we can review it.
      </p>
      <div className="flex flex-wrap gap-4 pt-2">
        <LocalizedClientLink
          href="/account/orders"
          className="rounded-full bg-[#dcfc60] px-5 py-3 text-sm font-bold text-[#160d24]"
        >
          View my orders
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/"
          className="rounded-full border border-[#e9e3ea] bg-white px-5 py-3 text-sm font-bold text-[#160d24]"
        >
          Back to VIBEYA
        </LocalizedClientLink>
      </div>
    </PolicyPage>
  )
}
