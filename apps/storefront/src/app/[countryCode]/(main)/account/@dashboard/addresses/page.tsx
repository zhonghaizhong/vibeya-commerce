import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import AccountPageHeading from "@modules/account/components/account-page-heading"
import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer, syncOrderAddressesToAddressBook } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Addresses",
  description: "View your addresses",
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ add?: string }>
}) {
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const { countryCode } = params
  // Backfill addresses from existing orders before loading the address book.
  // If syncing is unavailable, keep the account page usable as usual.
  await syncOrderAddressesToAddressBook().catch(() => undefined)
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <AccountPageHeading
        eyebrow="DELIVERY DETAILS"
        title="Your addresses"
        description="Save a delivery address for a quicker, smoother checkout."
        trailing={
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e9e3ea] bg-white px-4 py-2 text-sm font-semibold text-[#625c69]">
            <span className="h-2 w-2 rounded-full bg-[#dcfc60]" aria-hidden="true" />
            {customer.addresses?.length ?? 0} saved
          </span>
        }
      />
      <AddressBook
        customer={customer}
        region={region}
        openAddAddress={searchParams.add === "1"}
      />
    </div>
  )
}
