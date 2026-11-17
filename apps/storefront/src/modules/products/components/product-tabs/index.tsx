"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"
import { getProductMarketCopy, translateProductAttribute } from "@modules/products/market-copy"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

const ProductTabs = ({ product, countryCode }: ProductTabsProps) => {
  const marketCopy = getProductMarketCopy(countryCode)
  const tabs = [
    {
      label: marketCopy?.productInformation ?? "Product Information",
      component: <ProductInfoTab product={product} countryCode={countryCode} />,
    },
    {
      label: marketCopy?.shippingReturns ?? "Shipping & Returns",
      component: <ShippingInfoTab countryCode={countryCode} />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductInfoTab = ({ product, countryCode }: ProductTabsProps) => {
  const marketCopy = getProductMarketCopy(countryCode)
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-2 gap-x-8">
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">{marketCopy?.material ?? "Material"}</span>
            <p>{product.material ? translateProductAttribute(countryCode, "material", product.material) : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">{marketCopy?.origin ?? "Country of origin"}</span>
            <p>{product.origin_country ? translateProductAttribute(countryCode, "origin", product.origin_country) : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">{marketCopy?.type ?? "Type"}</span>
            <p>{product.type ? translateProductAttribute(countryCode, "type", product.type.value) : "-"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">{marketCopy?.weight ?? "Weight"}</span>
            <p>{product.weight ? `${product.weight} g` : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">{marketCopy?.dimensions ?? "Dimensions"}</span>
            <p>
              {product.length && product.width && product.height
                ? `${product.length}L x ${product.width}W x ${product.height}H`
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ShippingInfoTab = ({ countryCode }: { countryCode: string }) => {
  const marketCopy = getProductMarketCopy(countryCode)
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">{marketCopy?.fastDelivery ?? "Fast delivery"}</span>
            <p className="max-w-sm">
              {marketCopy?.deliveryDescription ?? "Your package will arrive in 3-5 business days at your pick up location or in the comfort of your home."}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">{marketCopy?.simpleExchanges ?? "Simple exchanges"}</span>
            <p className="max-w-sm">
              {marketCopy?.exchangeDescription ?? "Is the fit not quite right? No worries - we&apos;ll exchange your product for a new one."}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Back />
          <div>
            <span className="font-semibold">{marketCopy?.easyReturns ?? "Easy returns"}</span>
            <p className="max-w-sm">
              {marketCopy?.returnDescription ?? "Just return your product and we&apos;ll refund your money. No questions asked – we&apos;ll do our best to make sure your return is hassle-free."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
