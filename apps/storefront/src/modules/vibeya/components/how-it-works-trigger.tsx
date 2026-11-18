"use client"

import type { ReactNode } from "react"

export default function HowItWorksTrigger({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        event.preventDefault()
        window.dispatchEvent(new Event("vibeya:open-how-it-works"))
      }}
    >
      {children}
    </a>
  )
}
