import clsx from "clsx"
import type { ButtonHTMLAttributes, ComponentProps } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const baseClassName =
  "inline-flex items-center justify-center rounded-full border border-[#e9e3ea] bg-white px-4 text-sm font-bold text-[#160d24] transition hover:border-[#8f60ed] hover:bg-[#f1e5ff]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f60ed]"

type AccountActionSize = "default" | "large"

type AccountActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: AccountActionSize
}

export const AccountActionButton = ({
  className,
  size = "default",
  ...props
}: AccountActionButtonProps) => (
  <button
    className={clsx(
      baseClassName,
      size === "large" ? "min-h-11" : "min-h-10",
      className
    )}
    {...props}
  />
)

type AccountActionLinkProps = ComponentProps<typeof LocalizedClientLink> & {
  size?: AccountActionSize
}

export const AccountActionLink = ({
  className,
  size = "default",
  ...props
}: AccountActionLinkProps) => (
  <LocalizedClientLink
    className={clsx(
      baseClassName,
      size === "large" ? "min-h-11" : "min-h-10",
      className
    )}
    {...props}
  />
)
