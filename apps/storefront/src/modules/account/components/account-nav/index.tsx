"use client"

import { useParams, usePathname } from "next/navigation"

import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const isOverview = route === `/${countryCode}/account`

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const links = [
    {
      label: "Overview",
      href: "/account",
      testId: "overview-link",
      icon: <User size={18} />,
    },
    {
      label: "Profile",
      href: "/account/profile",
      testId: "profile-link",
      icon: <User size={18} />,
    },
    {
      label: "Addresses",
      href: "/account/addresses",
      testId: "addresses-link",
      icon: <MapPin size={18} />,
    },
    {
      label: "Orders",
      href: "/account/orders",
      testId: "orders-link",
      icon: <Package size={18} />,
    },
  ]

  const navLinks = (mobile = false) => (
    <ul className={mobile ? "space-y-1" : "space-y-1"}>
      {links.map(({ label, href, testId, icon }) => {
        const active = route.split(`/${countryCode}`)[1] === href
        return (
          <li key={href}>
            <LocalizedClientLink
              href={href}
              data-testid={testId}
              className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f60ed] ${
                active
                  ? "bg-[#dcfc60] font-extrabold text-[#160d24]"
                  : "text-[#625c69] hover:bg-[#fffdfa] hover:text-[#160d24]"
              }`}
            >
              <span className="flex items-center gap-3">
                {icon}
                <span>{label}</span>
              </span>
              {mobile && <ChevronDown className="-rotate-90" />}
            </LocalizedClientLink>
          </li>
        )
      })}
      <li className="mt-2 border-t border-[#eee9ef] pt-2">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#8a3442] transition-colors hover:bg-[#fff5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f60ed]"
          onClick={handleLogout}
          data-testid="logout-button"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ↪
          </span>
          <span>Log out</span>
        </button>
      </li>
    </ul>
  )

  return (
    <>
      <div
        className="overflow-hidden rounded-2xl border border-[#e9e3ea] bg-white small:hidden"
        data-testid="mobile-account-nav"
      >
        {isOverview ? (
          <>
            <div className="bg-[#160d24] px-5 py-5 text-white">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#dcfc60]">
                YOUR VIBEYA
              </p>
              <p className="font-display text-xl font-extrabold">
                Hello{customer?.first_name ? `, ${customer.first_name}` : ""}
              </p>
            </div>
            <div className="px-3 py-3">{navLinks(true)}</div>
          </>
        ) : (
          <LocalizedClientLink
            href="/account"
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold"
            data-testid="account-main-link"
          >
            <ChevronDown className="rotate-90" /> Back to your account
          </LocalizedClientLink>
        )}
      </div>

      <nav
        className="hidden rounded-3xl border border-[#e9e3ea] bg-white p-4 small:block"
        data-testid="account-nav"
        aria-label="Account navigation"
      >
        <div className="mb-4 border-b border-[#eee9ef] px-3 pb-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#8f60ed]">
            VIBEYA
          </p>
          <h2 className="font-display text-lg font-extrabold tracking-[-.04em]">
            Your account
          </h2>
        </div>
        {navLinks()}
      </nav>
    </>
  )
}

export default AccountNav
