import React from "react"

type AccountPageHeadingProps = {
  eyebrow: string
  title: string
  description: string
  trailing?: React.ReactNode
}

const AccountPageHeading = ({
  eyebrow,
  title,
  description,
  trailing,
}: AccountPageHeadingProps) => (
  <div className="mb-7 flex flex-col gap-4 border-b border-[#eee9ef] pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8f60ed]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-black tracking-[-.05em] text-[#160d24] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#77717d]">{description}</p>
    </div>
    {trailing && <div className="shrink-0">{trailing}</div>}
  </div>
)

export default AccountPageHeading
