"use client"

import { useEffect, useRef } from "react"

type VibeyaProductExperienceProps = {
  countryCode: string
  productId: string
  initialColor?: string
}

export default function VibeyaProductExperience({
  countryCode,
  productId,
  initialColor,
}: VibeyaProductExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const applyRequestedColor = () => {
      const color =
        initialColor || new URLSearchParams(window.location.search).get("color")
      if (!color) return

      frame.contentWindow?.postMessage(
        {
          type: "vibeya:set-route",
          hash: `#product-${encodeURIComponent(productId)}?color=${encodeURIComponent(color)}`,
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

        frameRef.current?.contentWindow?.postMessage(
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
        window.location.assign(`/${countryCode}${event.data.hash}`)
      }
    }

    frame.addEventListener("load", applyRequestedColor)
    window.addEventListener("message", handleMessage)
    return () => {
      frame.removeEventListener("load", applyRequestedColor)
      window.removeEventListener("message", handleMessage)
    }
  }, [countryCode, initialColor, productId])

  const colorQuery = initialColor
    ? `?color=${encodeURIComponent(initialColor)}`
    : ""

  return (
    <div className="vibeya-product-experience">
      <iframe
        ref={frameRef}
        src={`/vibeya/index.html?v=canonical-product-detail-curtain-gallery-fix-20261116-1#product-${encodeURIComponent(productId)}${colorQuery}`}
        title="VIBEYA custom product details and design studio"
      />
      <style>{`
        .vibeya-product-experience {
          position: fixed;
          z-index: 100;
          inset: 0;
          background: #fffdfb;
        }

        .vibeya-product-experience iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
    </div>
  )
}
