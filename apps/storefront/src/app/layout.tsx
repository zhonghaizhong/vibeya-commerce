import { Metadata } from "next"
import { getSiteOrigin } from "@lib/util/site"
import "styles/globals.css"

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getSiteOrigin()),
  }
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
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
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
