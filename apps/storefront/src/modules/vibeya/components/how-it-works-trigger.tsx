"use client"

import type { ReactNode } from "react"

export default function HowItWorksTrigger({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      onClick={(event) => {
        event.stopPropagation()
        window.dispatchEvent(new Event("vibeya:open-how-it-works"))
      }}
    >
      {children}
    </button>
  )
}
