import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import Nav from "@modules/layout/templates/nav"
import { Metadata } from "next"
import { getLocale } from "@lib/data/locale-actions"
import { getMarketUiCopy } from "@lib/util/market-ui-copy"
import { isSupportedMarketCountry } from "@lib/vibeya/markets"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function CheckoutLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  if (!isSupportedMarketCountry(countryCode)) notFound()

  const currentLocale = await getLocale()
  const marketCopy = getMarketUiCopy(countryCode)
  return (
    <div className="relative min-h-screen w-full bg-[#fffdfa]">
      <Nav countryCode={countryCode} currentLocale={currentLocale} />
      <div className="border-b border-[#e9e3ea] bg-[#f8f1ff]">
        <nav className="content-container flex h-12 items-center justify-between">
          <LocalizedClientLink
            href="/cart"
            className="flex items-center gap-x-2 text-sm font-bold text-[#51376b] transition hover:text-[#8f60ed]"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={15} />
            <span>{marketCopy?.backToCart ?? "Back to cart"}</span>
          </LocalizedClientLink>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#796a84]">{marketCopy?.secureCheckout ?? "Secure checkout"}</span>
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
