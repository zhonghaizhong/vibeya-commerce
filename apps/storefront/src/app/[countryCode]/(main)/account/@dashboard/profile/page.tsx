import { Metadata } from "next"

import AccountPageHeading from "@modules/account/components/account-page-heading"
import ProfilePhone from "@modules/account/components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your VIBEYA profile.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  if (!customer) return null

  const regions = await listRegions()

  if (!regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <AccountPageHeading
        eyebrow="YOUR DETAILS"
        title="Profile"
        description="Keep your contact information and billing details up to date."
      />
      <div className="flex w-full flex-col gap-4">
        <ProfileName customer={customer} />
        <ProfileEmail customer={customer} />
        <ProfilePhone customer={customer} />
        <ProfileBillingAddress customer={customer} regions={regions} />
      </div>
    </div>
  )
}
