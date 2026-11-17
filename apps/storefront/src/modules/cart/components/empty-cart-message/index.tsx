import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"
import { getMarketUiCopy } from "@lib/util/market-ui-copy"

const EmptyCartMessage = ({ countryCode }: { countryCode: string }) => {
  const marketCopy = getMarketUiCopy(countryCode)
  return (
    <div
      className="py-48 px-2 flex flex-col justify-center items-start"
      data-testid="empty-cart-message"
    >
      <Heading
        level="h1"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
      >
        {marketCopy?.cart ?? "Cart"}
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        {marketCopy?.emptyCart ?? "You don't have anything in your cart. Let's change that, use the link below to start browsing our products."}
      </Text>
      <div>
        <InteractiveLink href="/products">{marketCopy?.explore ?? "Explore VIBEYA"}</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
