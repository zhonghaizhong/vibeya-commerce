import { Metadata } from "next"
import MarketNotFound from "./market-not-found"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return <MarketNotFound />
}
