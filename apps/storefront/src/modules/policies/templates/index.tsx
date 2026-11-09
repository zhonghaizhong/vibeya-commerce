import { convertToLocale } from "@lib/util/money"
import { formatDayRange, StorePolicies } from "@lib/util/store-policies"

export const formatShippingRate = (rate: number, currencyCode: string) =>
  rate === 0
    ? "Free"
    : convertToLocale({ amount: rate, currency_code: currencyCode })

export const PolicyPage = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div
    className="mx-auto w-full max-w-7xl px-5 py-10 text-[#160d24] small:px-10 small:py-14"
    data-testid="policy-page"
  >
    <div className="grid gap-8 small:grid-cols-[.8fr_1.2fr] small:items-start">
      <header className="rounded-[28px] bg-[#160d24] p-7 text-white small:sticky small:top-28 small:p-9">
        <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#dcfc60]">
          VIBEYA / CUSTOMER CARE
        </p>
        <h1 className="font-display text-4xl font-black tracking-[-.06em]">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/70">
          Clear information about shopping with VIBEYA.
        </p>
      </header>
      <div className="flex flex-col gap-5 rounded-[28px] border border-[#e9e3ea] bg-white p-6 text-sm leading-7 text-[#625c69] small:p-9">
        {children}
      </div>
    </div>
  </div>
)

export const PoliciesUnavailable = () => (
  <p className="text-[#625c69]">
    Shipping details for this location are not available yet. Please contact
    VIBEYA before placing an order.
  </p>
)

export const ShippingSummary = ({
  policies,
  currencyCode,
}: {
  policies: StorePolicies
  currencyCode: string
}) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
    <dt className="text-[#625c69]">Shipping rate</dt>
    <dd>{formatShippingRate(policies.shippingRate, currencyCode)}</dd>
    <dt className="text-[#625c69]">Processing time</dt>
    <dd>{formatDayRange(policies.handlingDays)} business days</dd>
    <dt className="text-[#625c69]">Delivery time</dt>
    <dd>{formatDayRange(policies.transitDays)} business days after dispatch</dd>
  </dl>
)

export const PlaceholderNotice = () => (
  <p className="text-[#625c69]" data-testid="policy-placeholder">
    This information is being prepared. For questions about an order, contact
    VIBEYA through the email used for your order confirmation.
  </p>
)
