import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url") || ""
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const internalBackendUrl = process.env.MEDUSA_INTERNAL_BACKEND_URL?.trim()
  let target: URL
  try {
    target = new URL(source, backendUrl)
    const allowedOrigins = new Set([new URL(backendUrl).origin])
    const cloudStorageHost = process.env.MEDUSA_CLOUD_S3_HOSTNAME?.trim()
    if (cloudStorageHost) {
      const normalizedHost = cloudStorageHost.replace(/^https?:\/\//, "").replace(/\/$/, "")
      allowedOrigins.add(`https://${normalizedHost}`)
    }
    if (!allowedOrigins.has(target.origin) || !["http:", "https:"].includes(target.protocol)) throw new Error("Origin is not allowed")
  } catch {
    return NextResponse.json({ error: "Invalid product image URL" }, { status: 400 })
  }

  try {
    // In production the public API hostname may resolve through Caddy or an
    // external load balancer from inside the storefront container. Fetching
    // the same host can fail (hairpin routing), even though the image is
    // available to the backend on the private Docker network. Keep the public
    // URL allowlist above, but prefer the configured internal backend for
    // backend-hosted assets such as /static/*.
    const internalTarget = internalBackendUrl
      && target.origin === new URL(backendUrl).origin
      && target.pathname.startsWith("/static/")
      ? new URL(`${target.pathname}${target.search}`, internalBackendUrl)
      : null
    let response: Response
    if (internalTarget) {
      try {
        response = await fetch(internalTarget, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
        if (!response.ok || !(response.headers.get("content-type") || "").startsWith("image/")) {
          response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
        }
      } catch {
        response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
      }
    } else {
      response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
    }
    const contentType = response.headers.get("content-type") || ""
    const contentLength = Number(response.headers.get("content-length") || 0)
    if (!response.ok || !contentType.startsWith("image/") || contentLength > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Product image is unavailable" }, { status: 404 })
    }
    const image = await response.arrayBuffer()
    if (image.byteLength > 8 * 1024 * 1024) return NextResponse.json({ error: "Product image is too large" }, { status: 413 })
    return new NextResponse(image, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } })
  } catch {
    return NextResponse.json({ error: "Product image is unavailable" }, { status: 502 })
  }
}
