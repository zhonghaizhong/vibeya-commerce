"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type LongSleeveProductExperienceProps = {
  countryCode: string
}

const COLORS = new Set(["Black", "White", "Red", "Gray", "LightGray", "Cream", "Navy"])

export default function LongSleeveProductExperience({
  countryCode,
}: LongSleeveProductExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const router = useRouter()

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const applySelectedColor = () => {
      const requestedColor = new URLSearchParams(window.location.search).get("color")
      const color = requestedColor && COLORS.has(requestedColor) ? requestedColor : "Black"
      frame.contentWindow?.postMessage(
        {
          type: "vibeya:set-route",
          hash: `#product-sds-167256?color=${encodeURIComponent(color)}`,
        },
        window.location.origin
      )
    }

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.contentWindow
      ) {
        return
      }

      if (event.data?.type === "vibeya:request-studio") {
        const selection: Record<string, string> = {}
        for (const key of ["product", "color", "size", "print", "areas", "prompt"]) {
          const value = event.data[key]
          if (typeof value === "string" && value) selection[key] = value
        }

        frame.contentWindow?.postMessage(
          { type: "vibeya:open-studio", ...selection },
          window.location.origin
        )
        return
      }

      if (
        event.data?.type === "vibeya:route" &&
        typeof event.data.hash === "string" &&
        ["#top", "#shop"].includes(event.data.hash)
      ) {
        router.push(`/${countryCode}${event.data.hash}`)
      }
    }

    frame.addEventListener("load", applySelectedColor)
    window.addEventListener("message", handleMessage)

    return () => {
      frame.removeEventListener("load", applySelectedColor)
      window.removeEventListener("message", handleMessage)
    }
  }, [countryCode, router])

  return (
    <div className="long-sleeve-product-experience">
      <iframe
        ref={frameRef}
        src="/vibeya/index.html?standalone=1&v=independent-pages-20261117-1#product-sds-167256?color=Black"
        title="Custom long sleeve T-shirt product details and design studio"
      />
      <style>{`
        .long-sleeve-product-experience {
          position: fixed;
          z-index: 100;
          inset: 0;
          background: #fffdfb;
        }

        .long-sleeve-product-experience iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
    </div>
  )
}
