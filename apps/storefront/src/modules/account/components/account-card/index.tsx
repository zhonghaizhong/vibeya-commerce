import clsx from "clsx"
import type { HTMLAttributes } from "react"

type AccountCardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section"
}

const AccountCard = ({
  as: Element = "div",
  className,
  ...props
}: AccountCardProps) => (
  <Element
    className={clsx("border border-[#e9e3ea] bg-white", className)}
    {...props}
  />
)

export default AccountCard
