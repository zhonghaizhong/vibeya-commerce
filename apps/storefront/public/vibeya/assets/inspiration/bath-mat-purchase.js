document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("addDesignToBag")
  const sizeField = document.getElementById("bathMatSize")
  const status = document.getElementById("bathMatCartStatus")
  const prompt = document.getElementById("copySource")?.textContent?.trim() ?? ""
  const designName = "Duck Bubble Trouble"
  const artworkUrl = "/vibeya/assets/inspiration/duck-bubble-trouble-bath-mat-print.png"

  const makeWebpArtwork = async () => {
    const response = await fetch(artworkUrl, { credentials: "same-origin" })
    if (!response.ok) throw new Error("The approved print could not be attached. Please try again.")
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Your browser could not prepare the print. Please try again.")

    let scale = 1
    let artwork = ""
    do {
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      artwork = canvas.toDataURL("image/webp", 0.82)
      scale *= 0.8
    } while (artwork.length > 1_450_000 && scale > 0.25)

    bitmap.close()
    if (!artwork.startsWith("data:image/webp;base64,") || artwork.length > 1_500_000) {
      throw new Error("The approved print could not be attached. Please try again.")
    }
    return artwork
  }

  sizeField?.addEventListener("change", () => {
    const remixUrl = new URL(window.VIBEYA_CUSTOMIZE_URL, location.href)
    remixUrl.searchParams.set("size", sizeField.value)
    window.VIBEYA_CUSTOMIZE_URL = `${remixUrl.pathname}${remixUrl.search}`
  })

  button?.addEventListener("click", async () => {
    if (!sizeField || !status) return
    button.disabled = true
    status.textContent = "Adding your bath mat…"
    try {
      const generatedArtwork = await makeWebpArtwork()
      const response = await fetch("/api/vibeya/cart", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "sds-138708",
          color: "White",
          size: sizeField.value,
          print: "wrap",
          quantity: 1,
          designName,
          prompt,
          inspirationId: "duck-bubble-trouble",
          generatedArtwork,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not add this design to your bag. Please try again.")
      const count = (data.cart?.items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      const badge = document.getElementById("marketCartCount")
      if (badge) badge.textContent = String(count)
      status.textContent = "Added to your bag."
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Could not add this design to your bag. Please try again."
    } finally {
      button.disabled = false
    }
  })
})
