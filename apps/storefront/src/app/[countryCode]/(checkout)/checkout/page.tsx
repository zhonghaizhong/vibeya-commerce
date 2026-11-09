import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import styles from "./checkout.module.css"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <span>YOUR VIBEYA ORDER</span>
        <h1>Let’s make it yours.</h1>
        <p>Review your details and choose how you’d like to pay.</p>
      </div>
      <div className={styles.checkoutGrid}>
        <div className={styles.formColumn}>
          <PaymentWrapper cart={cart}>
            <CheckoutForm cart={cart} customer={customer} />
          </PaymentWrapper>
        </div>
        <div className={styles.summaryColumn}>
          <CheckoutSummary cart={cart} />
        </div>
      </div>
    </main>
  )
}
