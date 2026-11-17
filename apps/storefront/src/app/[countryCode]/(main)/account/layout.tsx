import { retrieveCustomer } from "@lib/data/customer"
import { Metadata } from "next"
// TODO: Re-add Toaster component when needed
import AccountLayout from "@modules/account/templates/account-layout"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AccountPageLayout({
  dashboard,
  login,
  params,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const [{ countryCode }, customer] = await Promise.all([
    params,
    retrieveCustomer().catch(() => null),
  ])
  return (
    <AccountLayout customer={customer} countryCode={countryCode}>
      {customer ? dashboard : login}
      {/* TODO: Re-add Toaster component when needed */}
    </AccountLayout>
  )
}
