document.addEventListener("DOMContentLoaded", async () => {
  const nodes = [...document.querySelectorAll("[data-vibeya-price]")]
  if (!nodes.length) return

  try {
    const response = await fetch("/api/vibeya/catalog", { credentials: "same-origin" })
    if (!response.ok) return

    const { products = [] } = await response.json()
    for (const node of nodes) {
      const product = products.find((item) => item.handle === node.dataset.vibeyaPrice)
      if (!product || !Number.isFinite(Number(product.price))) continue

      const currency = (product.currency_code || "usd").toUpperCase()
      const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency })
        .format(Number(product.price))
      node.textContent = `${formatted} ${currency}`

      document.querySelectorAll('[data-vibeya-spec="size"]').forEach((spec) => {
        if (Array.isArray(product.sizes) && product.sizes.length) {
          spec.textContent = product.sizes.join(", ")
        }
      })
      document.querySelectorAll('[data-vibeya-spec="color"]').forEach((spec) => {
        if (Array.isArray(product.colors) && product.colors.length) {
          spec.textContent = product.colors.includes("NightGarden")
            ? "White"
            : product.colors.join(", ")
        }
      })
    }
  } catch (error) {
    console.warn("VIBEYA price sync unavailable", error)
  }
})
