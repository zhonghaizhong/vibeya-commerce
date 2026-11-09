import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div
      className="flex-1 bg-[#fffdfa] text-[#160d24]"
      data-testid="account-page"
    >
      <div className="mx-auto w-full max-w-7xl px-5 py-8 small:px-10 small:py-14">
        <div className="mb-10 flex items-center justify-between border-b border-[#e9e3ea] pb-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#8f60ed]">
              VIBEYA / YOUR SPACE
            </p>
            <h1 className="font-display text-3xl font-black tracking-[-.05em] small:text-4xl">
              Your account
            </h1>
          </div>
          <span className="hidden rounded-full border border-[#e9e3ea] bg-white px-4 py-2 text-xs font-semibold small:inline-flex">
            MADE FOR YOU
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 small:grid-cols-[220px_minmax(0,1fr)] small:gap-14">
          <aside className="small:sticky small:top-24 small:self-start">
            {customer && <AccountNav customer={customer} />}
          </aside>
          <section className="min-w-0">{children}</section>
        </div>

        <div className="mt-14 flex flex-col gap-5 rounded-3xl bg-[#f1e5ff] p-6 small:flex-row small:items-center small:justify-between small:px-9 small:py-7">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-[#7251b4]">
              Here to help
            </p>
            <h2 className="font-display text-2xl font-extrabold tracking-[-.04em]">
              Need a hand with your order?
            </h2>
            <p className="mt-2 text-sm text-[#625c69]">
              Our team can help with delivery, order status, or an issue with a
              custom item.
            </p>
          </div>
          <UnderlineLink href="/contact">Contact VIBEYA ↗</UnderlineLink>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
