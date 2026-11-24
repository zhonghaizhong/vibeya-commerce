import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createShippingOptionsWorkflow,
  updateProductsWorkflow,
  updateStockLocationsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  normalizeVibeyaProductDesigner,
  VIBEYA_PRODUCT_DESIGNER_METADATA_KEY,
} from "../../../../../lib/vibeya-product-designer"
import {
  normalizeVibeyaProductContentCopy,
  VIBEYA_PRODUCT_CONTENT_METADATA_KEY,
} from "../../../../../lib/vibeya-product-content"
import {
  getVibeyaCategoryContent,
  VIBEYA_CATEGORY_CONTENT_METADATA_KEY,
} from "../../../../../lib/vibeya-category-content"

const MARKET_MEDIA_KEY = "vibeya_product_market_media"
const FULFILLMENT_PRODUCTS_KEY = "vibeya_fulfillment_product_ids"
const AVAILABLE_COUNTRIES = new Set(["us", "ca", "mx", "jp"])
const COUNTRY_LOCALES: Record<string, string> = {
  us: "en-US",
  ca: "en-CA",
  mx: "es-MX",
  jp: "ja-JP",
}

type ImportImage = { url: string; alt?: string }
type ImportVariant = {
  title: string
  sku?: string
  manage_inventory?: boolean
  options: Record<string, string>
  prices: Array<{ amount: number; currency_code: string }>
}
type ImportCategory = {
  handle: string
  name: string
  createIfMissing?: boolean
  locales?: Record<string, { label?: string; seoTitle?: string; description?: string }>
}
type ImportProduct = {
  title: string
  handle: string
  subtitle?: string
  description: string
  images: ImportImage[]
  options: Array<{ title: string; values: string[] }>
  variants: ImportVariant[]
  category?: ImportCategory
  countries?: string[]
  marketMedia?: Record<string, string[]>
  fulfillmentLocationName?: string
  customizable?: boolean
  customizationType?: string
  printAreas?: string[]
  seoKeywords?: string[]
  content?: Record<string, unknown>
  designer?: unknown
  metadata?: Record<string, unknown>
  freeShipping?: boolean
}

type Region = { id: string; currency_code: string; countries?: Array<{ iso_2: string }> }
type Category = { id: string; handle: string; name: string }
type Store = { id: string; default_sales_channel_id?: string | null; metadata?: Record<string, unknown> | null }
type Location = {
  id: string
  name: string
  metadata?: Record<string, unknown> | null
  fulfillment_sets?: Array<{ service_zones?: Array<{ id?: string; geo_zones?: Array<{ country_code?: string }> }> }>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function validImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false
  if (/^https:\/\//i.test(value)) return true
  return /^\/(?:vibeya\/assets|static)\/[a-zA-Z0-9_./%-]+$/.test(value) && !value.includes("..")
}

function validateProduct(raw: unknown, index: number): { product?: ImportProduct; errors: string[] } {
  const errors: string[] = []
  if (!isObject(raw)) return { errors: [`products[${index}] must be an object`] }
  const product = raw as unknown as ImportProduct
  const prefix = `products[${index}]`
  if (typeof product.title !== "string" || !product.title.trim() || product.title.length > 200) errors.push(`${prefix}.title is required (max 200 characters)`)
  if (typeof product.handle !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.handle)) errors.push(`${prefix}.handle must be a lowercase URL slug`)
  if (typeof product.description !== "string" || !product.description.trim() || product.description.length > 10000) errors.push(`${prefix}.description is required (max 10000 characters)`)
  if (!Array.isArray(product.images) || !product.images.length || product.images.length > 30 || product.images.some((image) => !isObject(image) || !validImageUrl(image.url))) errors.push(`${prefix}.images must contain 1–30 public HTTPS or VIBEYA static image URLs`)
  if (!Array.isArray(product.options) || !product.options.length || product.options.length > 5 || product.options.some((option) => !isObject(option) || typeof option.title !== "string" || !option.title.trim() || !Array.isArray(option.values) || !option.values.length || option.values.some((value) => typeof value !== "string" || !value.trim()))) errors.push(`${prefix}.options must define one or more named product options and values`)
  if (!Array.isArray(product.variants) || !product.variants.length || product.variants.length > 100) errors.push(`${prefix}.variants must contain 1–100 variants`)
  else product.variants.forEach((variant, variantIndex) => {
    const variantPrefix = `${prefix}.variants[${variantIndex}]`
    if (!isObject(variant) || typeof variant.title !== "string" || !variant.title.trim()) errors.push(`${variantPrefix}.title is required`)
    if (!isObject(variant) || !isObject(variant.options)) errors.push(`${variantPrefix}.options must map option names to values`)
    if (!isObject(variant) || !Array.isArray(variant.prices) || !variant.prices.length || variant.prices.some((price) => !isObject(price) || !Number.isFinite(price.amount) || Number(price.amount) < 0 || !/^[a-z]{3}$/i.test(String(price.currency_code)))) errors.push(`${variantPrefix}.prices must include non-negative amounts and 3-letter currency codes`)
  })
  if (Array.isArray(product.options) && Array.isArray(product.variants)) {
    const optionNames = new Set(product.options.map((option) => option.title))
    if (optionNames.size !== product.options.length) errors.push(`${prefix}.options names must be unique`)
    product.variants.forEach((variant, variantIndex) => {
      if (!isObject(variant.options)) return
      for (const option of product.options) {
        const value = variant.options[option.title]
        if (typeof value !== "string" || !option.values.includes(value)) errors.push(`${prefix}.variants[${variantIndex}] must select a configured value for '${option.title}'`)
      }
      if (Object.keys(variant.options).some((name) => !optionNames.has(name))) errors.push(`${prefix}.variants[${variantIndex}] contains an undeclared option`)
    })
  }
  if (product.countries !== undefined && (!Array.isArray(product.countries) || !product.countries.length || product.countries.some((country) => typeof country !== "string" || !AVAILABLE_COUNTRIES.has(country.toLowerCase())))) errors.push(`${prefix}.countries must contain one or more of us, ca, mx, jp`)
  if (product.marketMedia !== undefined && (!isObject(product.marketMedia) || Object.entries(product.marketMedia).some(([country, urls]) => !AVAILABLE_COUNTRIES.has(country.toLowerCase()) || !Array.isArray(urls) || urls.length > 30 || urls.some((url) => !validImageUrl(url))))) errors.push(`${prefix}.marketMedia must map supported country codes to public image URLs`)
  if (product.category && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.category.handle) || !product.category.name?.trim())) errors.push(`${prefix}.category must include a valid handle and name`)
  if (product.content !== undefined && !isObject(product.content)) errors.push(`${prefix}.content must be an object keyed by locale`)
  if (isObject(product.content)) {
    const locales = new Set(["en-US", "en-CA", "es-MX", "ja-JP"])
    if (Object.keys(product.content).some((locale) => !locales.has(locale))) errors.push(`${prefix}.content contains an unsupported locale`)
  }
  if (product.metadata !== undefined && !isObject(product.metadata)) errors.push(`${prefix}.metadata must be an object`)
  return { product, errors }
}

async function loadReferenceData(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data: any[] }>
  }
  const [stores, profiles, regions, categories, products, locations] = await Promise.all([
    query.graph({ entity: "store", fields: ["id", "default_sales_channel_id", "metadata"] }),
    query.graph({ entity: "shipping_profile", fields: ["id", "name"] }),
    query.graph({ entity: "region", fields: ["id", "currency_code", "countries.iso_2"] }),
    query.graph({ entity: "product_category", fields: ["id", "handle", "name", "products.handle"], pagination: { take: 1000 } }),
    query.graph({ entity: "product", fields: ["id", "handle", "title"], pagination: { take: 1000 } }),
    query.graph({ entity: "stock_location", fields: ["id", "name", "metadata", "fulfillment_sets.service_zones.id", "fulfillment_sets.service_zones.geo_zones.country_code"], pagination: { take: 1000 } }),
  ])
  const { data: shippingOptions } = await query.graph({ entity: "shipping_option", fields: ["id", "name", "service_zone_id", "prices.amount"] })
  return {
    store: stores.data[0] as Store | undefined,
    profiles: profiles.data,
    regions: regions.data as Region[],
    categories: categories.data as Category[],
    products: products.data as Array<{ id: string; handle: string; title: string }>,
    locations: locations.data as Location[],
    shippingOptions: shippingOptions as Array<{ id: string; name: string; service_zone_id: string; prices?: Array<{ amount: number }> }>,
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { dryRun?: unknown; publish?: unknown; products?: unknown } | undefined
  if (!Array.isArray(body?.products) || !body.products.length || body.products.length > 25) {
    return res.status(400).json({ error: "products must contain 1–25 product records." })
  }
  const parsed = body.products.map(validateProduct)
  const errors = parsed.flatMap((entry) => entry.errors)
  const products = parsed.flatMap((entry) => entry.product ? [entry.product] : [])
  const handles = products.map((product) => product.handle)
  if (new Set(handles).size !== handles.length) errors.push("Each product handle must be unique within the batch.")
  if (errors.length) return res.status(400).json({ error: "Import validation failed.", errors })

  const dryRun = body?.dryRun !== false
  const publish = body?.publish === true

  try {
    const refs = await loadReferenceData(req)
    if (!refs.store || !refs.store.default_sales_channel_id || !refs.profiles[0]) {
      return res.status(409).json({ error: "Store defaults, sales channel, or shipping profile are not configured." })
    }
    const existingHandles = new Set(refs.products.map((product) => product.handle))
    const conflicts = handles.filter((handle) => existingHandles.has(handle))
    if (conflicts.length) return res.status(409).json({ error: "Products with these handles already exist; import never overwrites automatically.", conflicts })

    const prepared = products.map((product, index) => {
      const countries = [...new Set((product.countries ?? ["us", "ca", "mx", "jp"]).map((country) => country.toLowerCase()))]
      const countryRegions = countries.map((country) => ({
        country,
        region: refs.regions.find((entry) => entry.countries?.some((item) => item.iso_2.toLowerCase() === country)),
      }))
      const missingRegions = countryRegions.filter((item) => !item.region).map((item) => item.country)
      if (missingRegions.length) errors.push(`products[${index}] has no configured sales region for: ${missingRegions.join(", ")}`)
      const requiredCurrencies = countryRegions.flatMap((item) => item.region?.currency_code ? [item.region.currency_code.toLowerCase()] : [])
      const missingCurrencies = [...new Set(requiredCurrencies)].filter((currency) => !product.variants.every((variant) => variant.prices.some((price) => price.currency_code.toLowerCase() === currency)))
      if (missingCurrencies.length) errors.push(`products[${index}] is missing a price for: ${missingCurrencies.join(", ")}`)
      if (publish) {
        const localized = isObject(product.content) ? product.content : {}
        for (const locale of new Set(countries.map((country) => COUNTRY_LOCALES[country]))) {
          const copy = localized[locale]
          const requiredFields = ["name", "detailTitle", "intro", "productDetails", "productionDetails", "seoTitle", "seoDescription"]
          if (!isObject(copy) || requiredFields.some((field) => typeof copy[field] !== "string" || !String(copy[field]).trim())) {
            errors.push(`products[${index}].content.${locale} must include localized product and SEO copy before publishing.`)
          }
        }
        for (const country of countries) {
          if (country !== "ca" && !(product.marketMedia?.[country]?.length)) errors.push(`products[${index}] needs a localized carousel set in marketMedia.${country} before publishing.`)
        }
      }
      const category = product.category ? refs.categories.find((entry) => entry.handle === product.category?.handle) : undefined
      if (product.category && !category && !product.category.createIfMissing) errors.push(`products[${index}] category '${product.category.handle}' does not exist; set createIfMissing only after reviewing the new category.`)
      const coversCountries = (entry: Location) => {
        const served = new Set((entry.fulfillment_sets ?? []).flatMap((set) => (set.service_zones ?? []).flatMap((zone) => (zone.geo_zones ?? []).map((geo) => geo.country_code?.toLowerCase()).filter((value): value is string => Boolean(value)))))
        return countries.every((country) => served.has(country))
      }
      const location = product.fulfillmentLocationName
        ? refs.locations.find((entry) => entry.name === product.fulfillmentLocationName)
        : publish || product.freeShipping || product.countries?.length
          ? refs.locations.find((entry) => /china/i.test(entry.name) && coversCountries(entry))
          : undefined
      if (product.fulfillmentLocationName && !location) errors.push(`products[${index}] fulfillment location '${product.fulfillmentLocationName}' was not found.`)
      const locationCountries = new Set((location?.fulfillment_sets ?? []).flatMap((set) => (set.service_zones ?? []).flatMap((zone) => (zone.geo_zones ?? []).map((geo) => geo.country_code?.toLowerCase()).filter((value): value is string => Boolean(value)))))
      if (location && countries.some((country) => !locationCountries.has(country))) errors.push(`products[${index}] fulfillment location does not serve every requested country.`)
      if (publish && !location) errors.push(`products[${index}] must resolve a China fulfillment location before publishing to a market.`)
      if (product.freeShipping && !location) errors.push(`products[${index}] needs a China fulfillment location before configuring free shipping.`)
      if (product.freeShipping && location) {
        const zones = new Set((location.fulfillment_sets ?? []).flatMap((set) => (set.service_zones ?? []).map((zone) => zone.id).filter((id): id is string => Boolean(id))))
        const conflictingRate = refs.shippingOptions.find((option) => zones.has(option.service_zone_id) && option.name === "VIBEYA · Free Shipping" && option.prices?.some((price) => Number(price.amount) !== 0))
        if (conflictingRate) errors.push(`products[${index}] found a non-free shipping option named '${conflictingRate.name}' in the China fulfillment zone.`)
      }
      if (product.designer !== undefined) {
        const designer = normalizeVibeyaProductDesigner(product.designer)
        if (designer.enabled && !designer.references.length) errors.push(`products[${index}] enables the designer but has no valid reference images.`)
        if (designer.enabled && designer.mode === "full-surface" && !designer.references.some((reference) => reference.side === "surface")) errors.push(`products[${index}] needs a surface reference for full-surface printing.`)
      }
      return { product, countries, category, location }
    })
    if (errors.length) return res.status(400).json({ error: "Import validation failed.", errors })
    if (dryRun) return res.json({ dry_run: true, publish, validated: prepared.map(({ product, countries, category, location }) => ({ handle: product.handle, title: product.title, countries, category: category?.handle ?? product.category?.handle ?? null, will_create_category: Boolean(product.category?.createIfMissing && !category), fulfillment_location: location?.name ?? null, image_count: product.images.length, variant_count: product.variants.length })) })

    const categoryIds = new Map<string, string>()
    for (const { product, category } of prepared) {
      if (category) categoryIds.set(product.handle, category.id)
      else if (product.category?.createIfMissing) {
        const { result } = await createProductCategoriesWorkflow(req.scope).run({ input: { product_categories: [{ name: product.category.name, handle: product.category.handle, is_active: true }] } })
        const created = result[0] as Category | undefined
        if (!created) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Could not create category '${product.category.handle}'.`)
        categoryIds.set(product.handle, created.id)
      }
    }

    const productInputs = prepared.map(({ product, countries }) => {
      const designer = product.designer === undefined ? undefined : normalizeVibeyaProductDesigner(product.designer)
      const content = product.content && isObject(product.content)
        ? Object.fromEntries(Object.entries(product.content).map(([locale, copy]) => [locale, normalizeVibeyaProductContentCopy(copy)]))
        : undefined
      const metadata: Record<string, unknown> = {
        ...(product.metadata ?? {}),
        vibeya_available_countries: countries,
        ...(product.customizable ? { customizable: true, customization_type: product.customizationType ?? "prompt_and_upload" } : {}),
        ...(product.freeShipping ? { free_shipping: true } : {}),
        ...(product.printAreas?.length ? { print_areas: product.printAreas } : {}),
        ...(product.seoKeywords?.length ? { seo_primary_keyword: product.seoKeywords[0], seo_secondary_keywords: product.seoKeywords.slice(1, 30) } : {}),
        ...(content ? { [VIBEYA_PRODUCT_CONTENT_METADATA_KEY]: content } : {}),
        ...(designer ? { [VIBEYA_PRODUCT_DESIGNER_METADATA_KEY]: designer } : {}),
      }
      const images = product.images.map((image) => ({ url: image.url, ...(image.alt ? { metadata: { alt: image.alt.slice(0, 250) } } : {}) }))
      return {
        title: product.title,
        handle: product.handle,
        subtitle: product.subtitle,
        description: product.description,
        status: ProductStatus.DRAFT,
        thumbnail: images[0]?.url,
        images,
        metadata,
        shipping_profile_id: refs.profiles[0].id,
        sales_channels: [{ id: refs.store!.default_sales_channel_id! }],
        ...(categoryIds.get(product.handle) ? { category_ids: [categoryIds.get(product.handle)!] } : {}),
        options: product.options,
        variants: product.variants,
      }
    })
    if (errors.length) return res.status(400).json({ error: "Import validation failed.", errors })

    const { result: createdProducts } = await createProductsWorkflow(req.scope).run({ input: { products: productInputs } })
    const createdByHandle = new Map((createdProducts as Array<{ id: string; handle: string }>).map((product) => [product.handle, product]))

    const updatedStoreMetadata = { ...(refs.store.metadata ?? {}) }
    const currentMarketMedia = isObject(updatedStoreMetadata[MARKET_MEDIA_KEY]) ? updatedStoreMetadata[MARKET_MEDIA_KEY] as Record<string, Record<string, string[]>> : {}
    const nextMarketMedia = { ...currentMarketMedia }
    const fulfillmentIdsByLocation = new Map<string, { location: Location; ids: Set<string> }>()
    for (const { product, location } of prepared) {
      const created = createdByHandle.get(product.handle)
      if (!created) continue
      const marketMedia = Object.fromEntries(Object.entries(product.marketMedia ?? {}).map(([country, urls]) => [country.toLowerCase(), urls]))
      if (Object.keys(marketMedia).length) nextMarketMedia[created.id] = marketMedia
      if (location) {
        const entry = fulfillmentIdsByLocation.get(location.id) ?? {
          location,
          ids: new Set(Array.isArray(location.metadata?.[FULFILLMENT_PRODUCTS_KEY]) ? location.metadata[FULFILLMENT_PRODUCTS_KEY].filter((id): id is string => typeof id === "string") : []),
        }
        entry.ids.add(created.id)
        fulfillmentIdsByLocation.set(location.id, entry)
      }
    }
    if (Object.keys(nextMarketMedia).length !== Object.keys(currentMarketMedia).length || prepared.some(({ product }) => Object.keys(product.marketMedia ?? {}).length)) {
      updatedStoreMetadata[MARKET_MEDIA_KEY] = nextMarketMedia
      await updateStoresWorkflow(req.scope).run({ input: { selector: { id: refs.store.id }, update: { metadata: updatedStoreMetadata } } })
    }
    for (const { location, ids } of fulfillmentIdsByLocation.values()) {
      await updateStockLocationsWorkflow(req.scope).run({ input: { selector: { id: location.id }, update: { metadata: { ...(location.metadata ?? {}), [FULFILLMENT_PRODUCTS_KEY]: [...ids] } } } })
    }

    const freeShippingByLocation = new Map<string, { location: Location; entries: typeof prepared }>()
    for (const entry of prepared.filter(({ product, location }) => product.freeShipping && location)) {
      const location = entry.location!
      const group = freeShippingByLocation.get(location.id) ?? { location, entries: [] }
      group.entries.push(entry)
      freeShippingByLocation.set(location.id, group)
    }
    if (freeShippingByLocation.size) {
      for (const { location, entries } of freeShippingByLocation.values()) {
        const zones = new Map<string, { countries: Set<string> }>()
        for (const set of location.fulfillment_sets ?? []) {
          for (const zone of set.service_zones ?? []) {
            const zoneId = zone.id
            if (!zoneId) continue
            const zoneCountries = new Set((zone.geo_zones ?? []).map((geo) => geo.country_code?.toLowerCase()).filter((value): value is string => Boolean(value)))
            if (entries.some(({ countries }) => countries.some((country) => zoneCountries.has(country)))) zones.set(zoneId, { countries: zoneCountries })
          }
        }
        const newOptions = [...zones.entries()].flatMap(([serviceZoneId, zone]) => {
          if (refs.shippingOptions.some((option) => option.service_zone_id === serviceZoneId && option.name === "VIBEYA · Free Shipping")) return []
          const prices = refs.regions.flatMap((region) => {
            const included = region.countries?.some((country) => zone.countries.has(country.iso_2.toLowerCase()) && entries.some((entry) => entry.countries.includes(country.iso_2.toLowerCase())))
            return included ? [{ region_id: region.id, amount: 0 }] : []
          })
          if (!prices.length) return []
          return [{
            name: "VIBEYA · Free Shipping",
            price_type: "flat" as const,
            provider_id: "manual_manual",
            service_zone_id: serviceZoneId,
            shipping_profile_id: refs.profiles[0].id,
            type: { label: "Free Shipping", description: "Free shipping to the selected market", code: `vibeya-free-${serviceZoneId.slice(-12)}` },
            prices,
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
              { attribute: "is_return", value: "false", operator: "eq" as const },
            ],
          }]
        })
        if (newOptions.length) await createShippingOptionsWorkflow(req.scope).run({ input: newOptions })
      }
    }

    const categoryCopyUpdates = prepared.flatMap(({ product }) => product.category?.locales ? [{ product, category: product.category }] : [])
    if (categoryCopyUpdates.length) {
      const { data: stores } = await (req.scope.resolve(ContainerRegistrationKeys.QUERY) as any).graph({ entity: "store", fields: ["id", "metadata"] })
      const store = stores[0] as Store | undefined
      if (store) {
        const { data: nativeCategories } = await (req.scope.resolve(ContainerRegistrationKeys.QUERY) as any).graph({ entity: "product_category", fields: ["handle", "name", "products.handle"], pagination: { take: 1000 } })
        const categoryContent = getVibeyaCategoryContent(store.metadata?.[VIBEYA_CATEGORY_CONTENT_METADATA_KEY], nativeCategories.map((category: any) => ({ handle: category.handle, name: category.name, productHandles: (category.products ?? []).map((item: any) => item.handle) })))
        for (const { product, category } of categoryCopyUpdates) {
          const entry = categoryContent[category.handle]
          if (!entry) continue
          for (const [locale, copy] of Object.entries(category.locales ?? {})) {
            if (!Object.values(COUNTRY_LOCALES).includes(locale)) continue
            entry.locales[locale as keyof typeof entry.locales] = {
              label: typeof copy.label === "string" ? copy.label.slice(0, 200) : category.name,
              seoTitle: typeof copy.seoTitle === "string" ? copy.seoTitle.slice(0, 300) : "",
              description: typeof copy.description === "string" ? copy.description.slice(0, 1000) : "",
            }
          }
          const productHandles = new Set(entry.productHandles)
          productHandles.add(product.handle)
          entry.productHandles = [...productHandles]
        }
        await updateStoresWorkflow(req.scope).run({ input: { selector: { id: store.id }, update: { metadata: { ...(store.metadata ?? {}), [VIBEYA_CATEGORY_CONTENT_METADATA_KEY]: categoryContent } } } })
      }
    }

    if (publish) {
      await updateProductsWorkflow(req.scope).run({
        input: {
          products: prepared.flatMap(({ product }) => {
            const created = createdByHandle.get(product.handle)
            return created ? [{ id: created.id, status: ProductStatus.PUBLISHED }] : []
          }),
        },
      })
    }

    return res.status(201).json({ dry_run: false, published: publish, products: prepared.map(({ product }) => ({ id: createdByHandle.get(product.handle)?.id, handle: product.handle, title: product.title })) })
  } catch (error) {
    console.error("Unable to import VIBEYA products", error)
    const message = error instanceof Error ? error.message : "Import failed"
    return res.status(500).json({ error: `Product import failed: ${message}` })
  }
}
