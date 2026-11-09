import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import AccountCard from "../account-card"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const firstName = customer?.first_name?.trim()
  const recentOrders = orders?.slice(0, 4) ?? []
  const addressCount = customer?.addresses?.length ?? 0

  return (
    <div className="space-y-7" data-testid="overview-page-wrapper">
      <section className="relative overflow-hidden rounded-[28px] bg-[#160d24] px-7 py-8 text-white small:px-10 small:py-10">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-[#8f60ed]/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-40 w-40 rounded-full bg-[#dcfc60]/20 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-[#dcfc60]">
            WELCOME BACK
          </p>
          <h2
            className="font-display text-4xl font-black tracking-[-.06em] small:text-5xl"
            data-testid="welcome-message"
            data-value={customer?.first_name}
          >
            {firstName ? `Hello, ${firstName}.` : "Hello, creator."}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
            Your ideas, your orders, your VIBEYA. Keep everything you love in
            one place.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/"
              className="inline-flex min-h-12 items-center rounded-full bg-[#dcfc60] px-6 text-sm font-extrabold text-[#160d24] transition-transform hover:-translate-y-0.5"
            >
              Explore the store{" "}
              <span className="ml-2" aria-hidden="true">
                ↗
              </span>
            </LocalizedClientLink>
            <span
              className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-5 text-sm text-white/80"
              data-testid="customer-email"
              data-value={customer?.email}
            >
              {customer?.email}
            </span>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-5 right-7 hidden font-display text-8xl font-black tracking-[-.1em] text-white/[.06] small:block"
        >
          V.
        </span>
      </section>

      <div className="grid grid-cols-1 gap-4 small:grid-cols-3">
        <SummaryCard
          eyebrow="PROFILE"
          value={`${getProfileCompletion(customer)}%`}
          detail="of your account completed"
          href="/account/profile"
          action="Complete your profile"
          accent="bg-[#f1e5ff]"
          testId="customer-profile-completion"
        />
        <SummaryCard
          eyebrow="ORDERS"
          value={String(orders?.length ?? 0)}
          detail={
            orders?.length
              ? "orders placed with VIBEYA"
              : "Your next favorite starts here"
          }
          href="/account/orders"
          action="View orders"
          accent="bg-[#dcfc60]"
          testId="orders-count"
        />
        <SummaryCard
          eyebrow="ADDRESSES"
          value={String(addressCount)}
          detail={
            addressCount === 1
              ? "saved delivery address"
              : "saved delivery addresses"
          }
          href="/account/addresses?add=1"
          action={addressCount ? "Manage addresses" : "Add an address"}
          accent="bg-[#dcfc60]"
          testId="addresses-count"
        />
      </div>

      <AccountCard as="section" className="rounded-[24px] p-6 small:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#8f60ed]">
              YOUR HISTORY
            </p>
            <h3 className="font-display text-2xl font-extrabold tracking-[-.04em]">
              Recent orders
            </h3>
          </div>
          {recentOrders.length > 0 && (
            <LocalizedClientLink
              href="/account/orders"
              className="text-sm font-bold text-[#7251b4] hover:text-[#160d24]"
            >
              All orders ↗
            </LocalizedClientLink>
          )}
        </div>
        {recentOrders.length ? (
          <ul
            className="divide-y divide-[#eee9ef]"
            data-testid="orders-wrapper"
          >
            {recentOrders.map((order) => (
              <li
                key={order.id}
                data-testid="order-wrapper"
                data-value={order.id}
              >
                <LocalizedClientLink
                  href={`/account/orders/details/${order.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div>
                    <p
                      className="text-sm font-extrabold"
                      data-testid="order-id"
                      data-value={order.display_id}
                    >
                      Order #{order.display_id}
                    </p>
                    <p
                      className="mt-1 text-xs text-[#77717d]"
                      data-testid="order-created-date"
                    >
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold"
                    data-testid="order-amount"
                  >
                    {convertToLocale({
                      amount: order.total,
                      currency_code: order.currency_code,
                    })}
                  </span>
                  <span
                    className="text-sm font-bold text-[#8f60ed] transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="rounded-2xl bg-[#fffdfa] px-5 py-7 text-center"
            data-testid="no-orders-message"
          >
            <span
              className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#f1e5ff] text-lg"
              aria-hidden="true"
            >
              ✳
            </span>
            <p className="font-bold">No orders just yet</p>
            <p className="mt-1 text-sm text-[#77717d]">
              When you find something you love, it will show up here.
            </p>
          </div>
        )}
      </AccountCard>
    </div>
  )
}

const SummaryCard = ({
  eyebrow,
  value,
  detail,
  href,
  action,
  accent,
  testId,
}: {
  eyebrow: string
  value: string
  detail: string
  href: string
  action: string
  accent: string
  testId: string
}) => (
  <LocalizedClientLink
    href={href}
    className="group block rounded-[24px] border border-[#e9e3ea] bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(35,17,56,.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f60ed] small:p-7"
  >
    <div className="flex items-start justify-between">
      <p className="text-[11px] font-bold tracking-[.17em] text-[#77717d]">
        {eyebrow}
      </p>
      <span
        className={`grid h-9 w-9 place-items-center rounded-full ${accent} text-[#160d24] transition-transform group-hover:rotate-12`}
        aria-hidden="true"
      >
        ↗
      </span>
    </div>
    <p
      className="mt-6 font-display text-5xl font-black tracking-[-.07em]"
      data-testid={testId}
      data-value={value}
    >
      {value}
    </p>
    <p className="mt-2 text-sm text-[#77717d]">{detail}</p>
    <p className="mt-6 text-sm font-extrabold">
      {action}
      <span className="ml-2 text-[#8f60ed]" aria-hidden="true">
        →
      </span>
    </p>
  </LocalizedClientLink>
)

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  if (!customer) return 0

  const completed = [
    Boolean(customer.email),
    Boolean(customer.first_name && customer.last_name),
    Boolean(customer.phone),
    Boolean(customer.addresses?.some((address) => address.is_default_billing)),
  ].filter(Boolean).length

  return (completed / 4) * 100
}

export default Overview
