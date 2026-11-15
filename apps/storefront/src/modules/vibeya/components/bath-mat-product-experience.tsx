"use client"

import { useEffect, useRef } from "react"

type BathMatProductExperienceProps = {
  countryCode: string
}

export default function BathMatProductExperience({
  countryCode,
}: BathMatProductExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return
      }

      if (event.data?.type === "vibeya:request-studio") {
        const params = new URLSearchParams({ openStudio: "1" })
        for (const key of ["product", "color", "size", "print", "areas", "prompt"]) {
          const value = event.data[key]
          if (typeof value === "string" && value) params.set(key, value)
        }
        window.location.assign(`/${countryCode}?${params.toString()}#top`)
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

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [countryCode])

  return (
    <div className="bath-mat-product-experience">
      <iframe
        ref={frameRef}
        src="/vibeya/index.html?v=canonical-bath-mat-product#product-sds-138708?color=White"
        title="Custom 3D Bath Mat product details and design studio"
      />
      <style>{`
        .bath-mat-product-experience {
          position: fixed;
          z-index: 100;
          inset: 0;
          background: #fffdfb;
        }

        .bath-mat-product-experience iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
    </div>
  )
}
