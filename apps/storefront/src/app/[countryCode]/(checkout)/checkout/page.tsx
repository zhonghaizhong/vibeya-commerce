import { retrieveCartForCountry } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import styles from "./checkout.module.css"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getMarketUiCopy } from "@lib/util/market-ui-copy"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout({ params }: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await params
  const marketCopy = getMarketUiCopy(countryCode)
  const cart = await retrieveCartForCountry(countryCode)

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <span>{marketCopy?.checkoutEyebrow ?? "YOUR VIBEYA ORDER"}</span>
        <h1>{marketCopy?.checkoutTitle ?? "Let’s make it yours."}</h1>
        <p>{marketCopy?.checkoutIntro ?? "Review your details and choose how you’d like to pay."}</p>
      </div>
      <div className={styles.checkoutGrid}>
        <div className={styles.formColumn}>
          <PaymentWrapper cart={cart}>
            <CheckoutForm cart={cart} customer={customer} countryCode={countryCode} />
          </PaymentWrapper>
        </div>
        <div className={styles.summaryColumn}>
          <CheckoutSummary cart={cart} />
        </div>
      </div>
    </main>
  )
}
