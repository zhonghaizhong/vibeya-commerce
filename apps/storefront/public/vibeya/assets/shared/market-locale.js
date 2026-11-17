(() => {
  const marketCatalog = window.VIBEYA_MARKET_TRANSLATIONS
  const defaults = Object.fromEntries(Object.entries(marketCatalog.markets).map(([market, config]) => [market, config.defaultLocale]))
  const supportedLocales = Object.fromEntries(Object.entries(marketCatalog.markets).map(([market, config]) => [market, config.locales]))
  const readCountry = () => {
    const queryCountry = new URLSearchParams(location.search).get("country")
    if (queryCountry) return queryCountry.toLowerCase()
    try { return window.parent.location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i)?.[1]?.toLowerCase() || "us" } catch { return "us" }
  }
  const readLocale = market => {
    const requested = new URLSearchParams(location.search).get("locale")
    return (supportedLocales[market] || supportedLocales.us).includes(requested) ? requested : defaults[market] || "en-US"
  }
  let country = readCountry()
  let locale = readLocale(country)
  document.documentElement.lang = locale
  const localizedInspirationRoute = location.pathname.startsWith("/vibeya/inspiration/") && (locale === "ja-JP" || locale === "es-MX")
  if (localizedInspirationRoute) document.documentElement.style.visibility = "hidden"
  const syncLocaleLinks = root => {
    const anchors = []
    if (root instanceof HTMLAnchorElement) anchors.push(root)
    root.querySelectorAll?.("a[href]").forEach(anchor => anchors.push(anchor))
    anchors.forEach(anchor => {
      try {
        const url = new URL(anchor.href, location.href)
        if (url.origin !== location.origin) return
        if (url.pathname.startsWith("/vibeya/")) {
          url.searchParams.set("country", country)
          url.searchParams.set("locale", locale)
        } else if (/^\/(us|ca|jp|mx)(?=\/|$)/i.test(url.pathname)) {
          url.pathname = url.pathname.replace(/^\/(us|ca|jp|mx)(?=\/|$)/i, `/${country}`)
          url.searchParams.set("locale", locale)
        } else {
          return
        }
        if (url.href !== anchor.href) anchor.href = url.href
      } catch { /* Ignore non-navigation links. */ }
    })
  }
  const startLocaleLinkSync = () => {
    if (!document.body) return
    syncLocaleLinks(document.body)
    new MutationObserver(records => records.forEach(record => {
      if (record.type === "attributes") syncLocaleLinks(record.target)
      record.addedNodes.forEach(node => {
        if (node instanceof Element) syncLocaleLinks(node)
      })
    })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] })
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startLocaleLinkSync, { once: true })
  else startLocaleLinkSync()
  // Keep translations attached to the existing UI so market changes never alter layout or styling.
  const copy = marketCatalog?.phrases || {}
  const ideaInputLabels = marketCatalog?.ideaInputLabels || {}
  const normalize = value => value.replace(/\s+/g, " ").trim()
  let dictionary = {}
  let dictionaryPhrases = []
  const originalText = new WeakMap()
  const appliedText = new WeakMap()
  const trackedText = new Set()
  const originalAttributes = new WeakMap()
  const appliedAttributes = new WeakMap()
  const trackedAttributes = new Set()
  let originalTitle = document.title
  let appliedTitle = null
  const originalDescriptions = new WeakMap()
  const trackedDescriptions = new Set()
  const setDictionary = nextLocale => {
    const sourceDictionary = { ...(copy[nextLocale] || {}) }
    if (ideaInputLabels[nextLocale]) sourceDictionary["Describe an idea"] = ideaInputLabels[nextLocale]
    dictionary = Object.fromEntries(Object.entries(sourceDictionary).map(([key, value]) => [normalize(key), value]))
    dictionaryPhrases = Object.entries(dictionary).filter(([key]) => key.length >= 8 && key.trim().split(/\s+/).length >= 2).sort((a, b) => b[0].length - a[0].length)
  }
  setDictionary(locale)
  const translateValue = value => {
    const normalized = normalize(value)
    if (dictionary[normalized]) return dictionary[normalized]
    const translatePart = part => {
      if (dictionary[normalize(part)]) return dictionary[normalize(part)]
      return Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length).reduce((result, [source, target]) => {
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        return result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), target)
      }, part)
    }
    const details = normalized.match(/^View details for (.+) in (.+)$/i)
    const view = normalized.match(/^View (.+) in (.+)$/i)
    const preview = normalized.match(/^Preview (.+) colors$/i)
    const previewColor = normalized.match(/^Preview (.+)$/i)
    const colorAvailability = normalized.match(/^(.+?) · (\d+) colors available$/i)
    const productImageAlt = normalized.match(/^(.+) — product gallery image (\d+)$/i)
    const galleryImageLabel = normalized.match(/^View (.+?) image (\d+): (.+)$/i)
    if (locale === "ja-JP" && productImageAlt) return `${translatePart(productImageAlt[1])}・商品画像${productImageAlt[2]}`
    if (locale === "es-MX" && productImageAlt) return `${translatePart(productImageAlt[1])} — imagen del producto ${productImageAlt[2]}`
    if (locale === "fr-CA" && productImageAlt) return `${translatePart(productImageAlt[1])} — image du produit ${productImageAlt[2]}`
    if (galleryImageLabel && locale === "ja-JP") return `${translatePart(galleryImageLabel[1])}・画像${galleryImageLabel[2]}：${translatePart(galleryImageLabel[3])}`
    if (galleryImageLabel && locale === "es-MX") return `Ver imagen ${galleryImageLabel[2]} de ${translatePart(galleryImageLabel[1])}: ${translatePart(galleryImageLabel[3])}`
    if (galleryImageLabel && locale === "fr-CA") return `Voir l’image ${galleryImageLabel[2]} de ${translatePart(galleryImageLabel[1])} : ${translatePart(galleryImageLabel[3])}`
    if (locale === "ja-JP" && details) return `${translatePart(details[1])}（${translatePart(details[2])}）の詳細を見る`
    if (locale === "ja-JP" && view) return `${translatePart(view[1])}（${translatePart(view[2])}）を見る`
    if (locale === "ja-JP" && preview) return `${translatePart(preview[1])}のカラーを確認`
    if (locale === "es-MX" && details) return `Ver detalles de ${translatePart(details[1])} en ${translatePart(details[2])}`
    if (locale === "es-MX" && view) return `Ver ${translatePart(view[1])} en ${translatePart(view[2])}`
    if (locale === "es-MX" && preview) return `Ver colores de ${translatePart(preview[1])}`
    if (locale === "fr-CA" && details) return `Voir les détails de ${translatePart(details[1])} en ${translatePart(details[2])}`
    if (locale === "fr-CA" && view) return `Voir ${translatePart(view[1])} en ${translatePart(view[2])}`
    if (locale === "fr-CA" && preview) return `Voir les couleurs de ${translatePart(preview[1])}`
    if (locale === "ja-JP" && previewColor) return `${translatePart(previewColor[1])}のカラーをプレビュー`
    if (locale === "es-MX" && previewColor) return `Vista previa de colores: ${translatePart(previewColor[1])}`
    if (locale === "fr-CA" && previewColor) return `Aperçu des couleurs : ${translatePart(previewColor[1])}`
    if (colorAvailability) {
      const [, color, count] = colorAvailability
      const localizedColor = translatePart(color)
      if (locale === "ja-JP") return `${localizedColor} · ${count}色`
      if (locale === "es-MX") return `${localizedColor} · ${count} ${Number(count) === 1 ? "color disponible" : "colores disponibles"}`
      if (locale === "fr-CA") return `${localizedColor} · ${count} ${Number(count) === 1 ? "couleur offerte" : "couleurs offertes"}`
    }
    const galleryHint = normalized.match(/^Choose any of the (\d+) main images\. Color, size and print placement stay linked to your product\.$/i)
    const uploadedCount = normalized.match(/^(\d+) \/ 6 uploaded$/i)
    const creditBalance = normalized.match(/^(\d+) free designs? remaining · (\d+) added per paid item\.$/i)
    if (uploadedCount && locale === "ja-JP") return `${uploadedCount[1]} / 6 枚アップロード済み`
    if (uploadedCount && locale === "es-MX") return `${uploadedCount[1]} de 6 imágenes subidas`
    if (uploadedCount && locale === "fr-CA") return `${uploadedCount[1]} / 6 images téléversées`
    if (creditBalance && locale === "ja-JP") return `無料デザイン残り${creditBalance[1]}回 · 有料商品1点につき${creditBalance[2]}回追加`
    if (creditBalance && locale === "es-MX") return `Te quedan ${creditBalance[1]} diseños gratis · se agregan ${creditBalance[2]} por cada artículo pagado.`
    if (creditBalance && locale === "fr-CA") return `Il vous reste ${creditBalance[1]} créations gratuites · ${creditBalance[2]} ajoutées par article payé.`
    if (galleryHint && locale === "ja-JP") return `${galleryHint[1]}枚の商品画像から選べます。カラー、サイズ、プリント位置は商品に連動します。`
    if (galleryHint && locale === "es-MX") return `Elige cualquiera de las ${galleryHint[1]} imágenes principales. El color, la talla y la ubicación del diseño se mantienen vinculados al producto.`
    if (galleryHint && locale === "fr-CA") return `Choisissez parmi les ${galleryHint[1]} images principales. La couleur, la taille et l’emplacement de l’imprimé restent associés à l’article.`
    const productPhoto = normalized.match(/^Product photo (\d+) \/ (\d+) · (.+?) · (.+?)\. These are example promotional images\.$/i)
    if (productPhoto && locale === "ja-JP") return `商品画像 ${productPhoto[1]} / ${productPhoto[2]} · ${translatePart(productPhoto[3])} · ${translatePart(productPhoto[4])}。こちらは参考用の画像です。`
    if (productPhoto && locale === "es-MX") return `Imagen del producto ${productPhoto[1]} / ${productPhoto[2]} · ${translatePart(productPhoto[3])} · ${translatePart(productPhoto[4])}. Estas imágenes son ejemplos promocionales.`
    if (productPhoto && locale === "fr-CA") return `Image de l’article ${productPhoto[1]} / ${productPhoto[2]} · ${translatePart(productPhoto[3])} · ${translatePart(productPhoto[4])}. Ces images sont des exemples promotionnels.`
    const previewTitle = normalized.match(/^(.+?) · (.+)$/)
    if (previewTitle && dictionary[previewTitle[2]]) return `${translatePart(previewTitle[1])} · ${dictionary[previewTitle[2]]}`
    const productCount = normalized.match(/^Showing\s+(\d+)\s+of\s+(\d+)\s+products?$/i)
    if (productCount) {
      const [, shown, total] = productCount
      if (locale === "ja-JP") return Number(total) === 0 ? "表示できる商品はありません" : `${total}件中${shown}件の商品を表示`
      if (locale === "es-MX") return Number(total) === 0 ? "No hay productos para mostrar" : `Se muestran ${shown} de ${total} productos`
      if (locale === "fr-CA") return Number(total) === 0 ? "Aucun article à afficher" : `${shown} ${Number(shown) === 1 ? "article affiché" : "articles affichés"} sur ${total}`
    }
    // Translate whole messages only; partial phrase replacement corrupts long policy copy.
    if (normalized.length > 80) return null
    const startingPrice = normalized.match(/^From\s+((?:US\$|CA\$|MX\$|¥|\$|€|£)?\s?\d[\d,.]*)(?:\s+[A-Z]{3})?$/)
    if (startingPrice) {
      const amount = startingPrice[1]
      if (locale === "ja-JP") return `${amount}から`
      if (locale === "es-MX") return `Desde ${amount}`
      if (locale === "fr-CA") return `À partir de ${amount}`
    }
    let translated = normalized
    for (const [source, target] of dictionaryPhrases) {
      if (!translated.includes(source)) continue
      const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      translated = translated.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu"), target)
    }
    return translated === normalized ? null : translated
  }
  const translateText = node => {
    if (node.nodeType !== Node.TEXT_NODE) return
    if (!originalText.has(node)) { originalText.set(node, node.nodeValue || ""); trackedText.add(node) }
    else if (node.nodeValue !== appliedText.get(node)) originalText.set(node, node.nodeValue || "")
    const source = originalText.get(node) || ""
    const translated = translateValue(source)
    const leading = source.match(/^\s*/)?.[0] || ""
    const trailing = source.match(/\s*$/)?.[0] || ""
    const result = translated ? `${leading}${translated}${trailing}` : source
    appliedText.set(node, result)
    if (node.nodeValue !== result) node.nodeValue = result
  }
  const translateElement = element => {
    if (!(element instanceof Element) || element.closest("script,style,[data-locale-ignore]")) return
    element.childNodes.forEach(translateText)
    for (const attribute of ["placeholder", "aria-label", "title", "alt", "value"]) {
      const value = element.getAttribute(attribute)
      if (value === null) continue
      let originals = originalAttributes.get(element)
      let applied = appliedAttributes.get(element)
      if (!originals) { originals = new Map(); originalAttributes.set(element, originals); trackedAttributes.add(element) }
      if (!applied) { applied = new Map(); appliedAttributes.set(element, applied) }
      if (!originals.has(attribute)) originals.set(attribute, value)
      else if (value !== applied.get(attribute)) originals.set(attribute, value)
      const source = originals.get(attribute)
      let translated = translateValue(source)
      if (!translated && attribute === "alt") {
        translated = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length).reduce((result, [key, target]) => {
          const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          return result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), target)
        }, source)
        if (translated === source) translated = null
      }
      const result = translated || source
      applied.set(attribute, result)
      if (value !== result) element.setAttribute(attribute, result)
    }
  }
  const translateTree = root => {
    if (root instanceof Element) translateElement(root)
    root.querySelectorAll?.("*").forEach(translateElement)
  }
  const restoreOriginalCopy = () => {
    trackedText.forEach(node => { if (!node.isConnected) trackedText.delete(node); else node.nodeValue = originalText.get(node) })
    trackedAttributes.forEach(element => { if (!element.isConnected) trackedAttributes.delete(element); else originalAttributes.get(element)?.forEach((value, attribute) => element.setAttribute(attribute, value)) })
    trackedDescriptions.forEach(meta => { if (!meta.isConnected) trackedDescriptions.delete(meta); else meta.content = originalDescriptions.get(meta) })
    if (appliedTitle !== null && document.title !== appliedTitle) originalTitle = document.title
    document.title = originalTitle
  }
  const translateDocumentCopy = () => {
    restoreOriginalCopy()
    originalTitle = document.title
    const translatedTitle = translateValue(originalTitle)
    if (translatedTitle) document.title = translatedTitle
    appliedTitle = translatedTitle || originalTitle
    document.querySelectorAll('meta[name="description"]').forEach(meta => {
      if (!originalDescriptions.has(meta)) { originalDescriptions.set(meta, meta.content); trackedDescriptions.add(meta) }
      const translated = translateValue(originalDescriptions.get(meta))
      if (translated) meta.content = translated
    })
    translateTree(document.body)
  }
  const updateRouteLocale = () => {
    const nextCountry = readCountry()
    const nextLocale = readLocale(nextCountry)
    if (nextCountry === country && nextLocale === locale) return
    country = nextCountry
    locale = nextLocale
    document.documentElement.lang = locale
    setDictionary(locale)
    translateDocumentCopy()
    syncLocaleLinks(document.body)
  }
  const start = () => {
    if (!document.body) return
    translateDocumentCopy()
    new MutationObserver(records => records.forEach(record => {
      if (record.type === "characterData") translateText(record.target)
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) translateText(node)
        else if (node instanceof Element) translateTree(node)
      })
    })).observe(document.body, { childList: true, characterData: true, subtree: true })
    new MutationObserver(records => records.forEach(record => {
      if (record.target instanceof Element) translateElement(record.target)
    })).observe(document.body, {
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title", "alt", "value"],
      subtree: true,
    })
    new MutationObserver(() => {
      const nextTitle = document.title
      if (nextTitle === appliedTitle) return
      originalTitle = nextTitle
      const translated = translateValue(nextTitle)
      document.title = translated || nextTitle
      appliedTitle = translated || nextTitle
    }).observe(document.head, { childList: true, characterData: true, subtree: true })
    window.addEventListener("popstate", updateRouteLocale)
    window.addEventListener("pageshow", updateRouteLocale)
    for (const method of ["pushState", "replaceState"]) {
      const originalMethod = history[method].bind(history)
      history[method] = (...args) => {
        const result = originalMethod(...args)
        queueMicrotask(updateRouteLocale)
        return result
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true })
  else start()
})()
