import { HttpTypes } from "@medusajs/types"
import AccountCard from "../account-card"

type ProfileEmailProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfileEmail = ({ customer }: ProfileEmailProps) => (
  <AccountCard
    as="section"
    className="rounded-[22px] p-5 text-sm sm:p-6"
    data-testid="account-email-editor"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8f60ed]">
          Email
        </p>
        <p className="mt-2 break-all font-semibold text-[#160d24]" data-testid="current-info">
          {customer.email}
        </p>
      </div>
      <span className="inline-flex w-fit items-center rounded-full bg-[#f1e5ff] px-3 py-1.5 text-xs font-bold text-[#7251b4]">
        Used to sign in
      </span>
    </div>
  </AccountCard>
)

export default ProfileEmail
