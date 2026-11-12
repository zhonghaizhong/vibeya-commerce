import { Metadata } from "next"
import PayPalCallback from "./paypal-callback"

export const metadata: Metadata = {
  title: "Sign-in Confirmation | VIBEYA",
  robots: { index: false, follow: false },
}

export default async function PayPalCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ countryCode }, search] = await Promise.all([params, searchParams])
  const query = Object.fromEntries(
    Object.entries(search).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]]
    )
  )

  return <PayPalCallback countryCode={countryCode} query={query} />
}
