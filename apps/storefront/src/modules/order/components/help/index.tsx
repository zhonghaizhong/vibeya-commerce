import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#7251b4]">
            HERE TO HELP
          </p>
          <Heading className="mt-1 font-display text-xl font-extrabold tracking-[-.03em] text-[#160d24]">
            Need a hand?
          </Heading>
        </div>
        <ul className="flex flex-wrap gap-2">
          <li>
            <LocalizedClientLink
              href="/contact"
              className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-bold text-[#160d24] transition hover:bg-[#dcfc60]"
            >
              Contact us ↗
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink
              href="/returns"
              className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-bold text-[#160d24] transition hover:bg-[#dcfc60]"
            >
              Returns & exchanges ↗
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
