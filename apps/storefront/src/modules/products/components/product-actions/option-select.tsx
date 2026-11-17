import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"
import { getProductMarketCopy, translateProductOption, translateProductOptionValue } from "@modules/products/market-copy"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  name: string
  disabled: boolean
  countryCode?: string
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  name,
  "data-testid": dataTestId,
  disabled,
  countryCode = "us",
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)
  const marketCopy = getProductMarketCopy(countryCode)

  return (
    <fieldset className="flex flex-col gap-y-3" disabled={disabled}>
      <legend className="text-sm mb-3">{marketCopy ? `${marketCopy.select} ${translateProductOption(countryCode, title)}` : `Select ${title}`}</legend>
      <div
        className="flex flex-wrap justify-between gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          const id = `${name}-${v}`.replace(/[^A-Za-z0-9_-]/g, "-")
          return (
            <div key={v} className="flex-1">
              <input
                type="radio"
                id={id}
                name={name}
                value={v}
                checked={v === current}
                onChange={() => updateOption(option.id, v)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={clx(
                  "flex items-center justify-center cursor-pointer border-ui-border-base bg-ui-bg-subtle border text-small-regular h-10 rounded-rounded p-2 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-disabled:cursor-not-allowed",
                  {
                    "border-ui-border-interactive": v === current,
                    "hover:shadow-elevation-card-rest transition-shadow ease-in-out duration-150":
                      v !== current,
                  }
                )}
                data-testid="option-button"
              >
                {translateProductOptionValue(countryCode, title, v)}
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

export default OptionSelect
