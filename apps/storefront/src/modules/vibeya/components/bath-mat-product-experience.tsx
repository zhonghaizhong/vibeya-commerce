"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type BathMatProductExperienceProps = {
  countryCode: string
}

export default function BathMatProductExperience({
  countryCode,
}: BathMatProductExperienceProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return
      }

      if (event.data?.type === "vibeya:request-studio") {
        const selection: Record<string, string> = {}
        for (const key of ["product", "color", "size", "print", "areas", "prompt"]) {
          const value = event.data[key]
          if (typeof value === "string" && value) selection[key] = value
        }

        // Open the studio in this product page's existing iframe. A session
        // check here can fail transiently and incorrectly close the experience;
        // authentication is enforced when the customer submits a design.
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
        const targetPath = event.data.hash === "#shop"
          ? `/${countryCode}/products`
          : `/${countryCode}/`
        const target = new URL(targetPath, window.location.origin)
        router.push(`${target.pathname}${target.search}${target.hash}`)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [countryCode, router])

  return (
    <div className="bath-mat-product-experience">
      <iframe
        ref={frameRef}
        src="/vibeya/index.html?standalone=1&v=independent-pages-20261117-2#product-sds-138708?color=White"
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
