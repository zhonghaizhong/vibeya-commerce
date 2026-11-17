import { Metadata } from "next"
import Script from "next/script"
import { getSiteOrigin } from "@lib/util/site"
import "styles/globals.css"
import { getLocale } from "@lib/data/locale-actions"
import { getMarketLocale } from "@lib/util/market-locale"
import { cookies, headers } from "next/headers"

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getSiteOrigin()),
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const [locale, cookieStore, requestHeaders] = await Promise.all([getLocale(), cookies(), headers()])
  const countryCode = requestHeaders.get("x-vibeya-country-code") || cookieStore.get("vibeya_destination_country")?.value || "us"
  const htmlLocale = getMarketLocale(countryCode, locale || undefined)
  return (
    <html lang={htmlLocale} data-mode="light">
      <head>
        <link rel="ucp" href="/.well-known/ucp" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Script src="/vibeya/assets/shared/market-translations.generated.js?v=market-copy-1" strategy="beforeInteractive" />
        <Script src="/vibeya/assets/shared/market-locale.js?v=site-locale-copy-28" strategy="afterInteractive" />
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
