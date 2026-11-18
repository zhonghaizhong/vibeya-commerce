import { listCartOptions, retrieveCartForCountry } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { StoreCartShippingOption } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"
import { getLocale } from "@lib/data/locale-actions"

export default async function PageLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const [{ countryCode }, customer, currentLocale] = await Promise.all([
    props.params,
    retrieveCustomer(),
    getLocale(),
  ])
  const cart = await retrieveCartForCountry(countryCode)
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    try {
      const { shipping_options } = await listCartOptions()
      shippingOptions = shipping_options
    } catch (error) {
      // Shipping nudges are optional UI; a shipping-options failure must not
      // prevent account, cart, or product pages from rendering.
      console.error("Could not load cart shipping options", error)
    }
  }

  return (
    <>
      <Nav countryCode={countryCode} currentLocale={currentLocale} />
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}

      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {props.children}
      <Footer countryCode={countryCode} />
    </>
  )
}
