"use client"

import { useRouter } from "next/navigation"
import ProductExplorer from "./product-explorer"

type StandaloneProductPageProps = {
  countryCode: string
}

export default function StandaloneProductPage({ countryCode }: StandaloneProductPageProps) {
  const router = useRouter()

  const navigate = (hash: string) => {
    router.push(`/${countryCode}${hash}`)
  }

  const customize = (selection: { product: string; color: string; size: string }) => {
    const params = new URLSearchParams({
      openStudio: "1",
      product: selection.product,
      color: selection.color,
      size: selection.size,
    })
    router.push(`/${countryCode}?${params.toString()}#top`)
  }

  return (
    <>
      <style>{`
        body:has(.vibeya-product-detail-frame) > main > [data-vibeya-shell-announcement],
        body:has(.vibeya-product-detail-frame) > main > header[data-vibeya-shell-nav],
        body:has(.vibeya-product-detail-frame) > main > footer {
          display: none !important;
        }
        body:has(.vibeya-product-detail-frame) > main {
          min-height: 100vh;
          overflow: hidden;
        }
      `}</style>
      <div className="vibeya-product-detail-frame">
        <ProductExplorer
          productId="mg8014061"
          standaloneProduct
          initialColor="Black"
          onNavigate={navigate}
          onCustomize={customize}
        />
      </div>
    </>
  )
}
