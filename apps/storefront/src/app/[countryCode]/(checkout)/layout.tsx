import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import Nav from "@modules/layout/templates/nav"
import { Metadata } from "next"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen w-full bg-[#fffdfa]">
      <Nav />
      <div className="border-b border-[#e9e3ea] bg-[#f8f1ff]">
        <nav className="content-container flex h-12 items-center justify-between">
          <LocalizedClientLink
            href="/cart"
            className="flex items-center gap-x-2 text-sm font-bold text-[#51376b] transition hover:text-[#8f60ed]"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={15} />
            <span>Back to cart</span>
          </LocalizedClientLink>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#796a84]">Secure checkout</span>
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
