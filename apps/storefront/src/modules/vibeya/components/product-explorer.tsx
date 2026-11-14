"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import {
  getVibeyaImage,
  type VibeyaProduct,
} from "../data/products"
import styles from "./product-explorer.module.css"
import { useVibeyaProducts } from "../data/use-vibeya-products"
import { useVibeyaMenu } from "../data/use-vibeya-menu"

type ProductExplorerProps = {
  productId?: string
  initialColor?: string
  onNavigate: (hash: string) => void
  onCustomize: (selection: { product: string; color: string; size: string }) => void
}

type ProductCardProps = {
  product: VibeyaProduct
  onSelect: (product: VibeyaProduct, color: string) => void
  countryCode?: string
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price)
}

function ProductCard({ product, onSelect, countryCode = "us" }: ProductCardProps) {
  const [colorId, setColorId] = useState(product.colors[0]?.id ?? "")

  if (product.catalogOnly) {
    const href = `/${countryCode}/products/${encodeURIComponent(product.handle)}`
    return (
      <article className={`${styles.card} product-card`} aria-label={product.name}>
        <a className={`${styles.cardImageButton} product-card-media`} href={href} target="_top" aria-label={`View ${product.name}`}>
          <span className={`${styles.cardArrow} card-plus`} aria-hidden="true">↗</span>
          <div className="photo">
            {product.catalogImage
              ? <img className={styles.cardImage} src={product.catalogImage} alt={product.name} loading="lazy" />
              : <div className={styles.cardPlaceholder}>VIBEYA<br /><span>Product image coming soon</span></div>}
          </div>
        </a>
        <p className={`${styles.cardVariant} card-color-caption`}>{product.category || "New arrival"}</p>
        <a className={`${styles.cardInfo} product-card-info`} href={href} target="_top" aria-label={`View details for ${product.name}`}>
          <h3>{product.name}</h3>
          <p>{product.priceUnavailable ? "Price unavailable" : formatPrice(product.price, product.currency)}</p>
        </a>
      </article>
    )
  }

  const color = product.colors.find((option) => option.id === colorId) ?? product.colors[0]

  return (
    <article className={`${styles.card} product-card`} aria-label={product.name}>
      <button
        className={`${styles.cardImageButton} product-card-media`}
        type="button"
        onClick={() => onSelect(product, color.id)}
        aria-label={`View ${product.name} in ${color.name}`}
      >
        <span className={`${styles.cardArrow} card-plus`} aria-hidden="true">↗</span>
        <div className="photo"><img className={styles.cardImage} src={getVibeyaImage(product, color)} alt={`${color.name} ${product.short}`} /></div>
      </button>
      <div className={`${styles.swatches} card-color-options`} role="group" aria-label={`${product.short} colors`}>
        {product.colors.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.swatch} card-swatch ${colorId === option.id ? styles.swatchSelected : ""}`}
            style={{ "--swatch-color": option.hex, "--card-swatch-color": option.hex } as CSSProperties}
            onClick={() => setColorId(option.id)}
            aria-label={`Preview ${option.name}`}
            aria-pressed={colorId === option.id}
          />
        ))}
      </div>
      <p className={`${styles.cardVariant} card-color-caption`}>{product.variantSummary ?? `${color.name} · ${product.colors.length} colors · Sizes ${product.sizes[0]}–${product.sizes.at(-1)}`}</p>
      <button className={`${styles.cardInfo} product-card-info`} type="button" onClick={() => onSelect(product, color.id)} aria-label={`View details for ${product.name} in ${color.name}`}>
        <h3>{product.name}</h3>
        <p>{product.priceUnavailable ? "Price to be confirmed" : product.sizePrices ? `From ${formatPrice(product.price, product.currency)}` : formatPrice(product.price, product.currency)}</p>
      </button>
    </article>
  )
}

export function ProductCards({ onSelect, countryCode = "us" }: { onSelect: ProductCardProps["onSelect"]; countryCode?: string }) {
  const products = useVibeyaProducts()
  const ordered = [...products.filter((product) => product.catalogOnly), ...products.filter((product) => !product.catalogOnly)]
  const pinned = ["sds-137892", "sds-97226", "sds-233939"]
    .map((id) => ordered.find((product) => product.id === id))
    .filter((product): product is VibeyaProduct => Boolean(product))
  const featured = [...pinned, ...ordered.filter((product) => !pinned.includes(product))].slice(0, 6)
  return <>{featured.map((product) => <ProductCard key={product.id} product={product} onSelect={onSelect} countryCode={countryCode} />)}</>
}

function ProductGrid({ onSelect }: { onSelect: ProductCardProps["onSelect"] }) {
  const [query, setQuery] = useState("")
  const productList = useVibeyaProducts()
  const products = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return productList.filter((product) =>
      !term || `${product.name} ${product.short}`.toLocaleLowerCase().includes(term)
    )
  }, [productList, query])

  return (
    <>
      <div className={styles.catalogIntro}>
        <div>
          <span className={styles.eyebrow}>THE VIBEYA COLLECTION</span>
          <h1>Made by you.</h1>
          <p>Choose a piece, pick your color, and make it yours.</p>
        </div>
        <label className={styles.searchLabel}>
          <span className={styles.visuallyHidden}>Search products</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" type="search" />
        </label>
      </div>
      {products.length ? (
        <div className={styles.grid}>
          {products.map((product) => <ProductCard key={product.id} product={product} onSelect={onSelect} />)}
        </div>
      ) : <p className={styles.empty}>No products match that search.</p>}
    </>
  )
}

function ProductDetail({
  product,
  initialColor,
  onBack,
  onCustomize,
}: {
  product: VibeyaProduct
  initialColor?: string
  onBack: () => void
  onCustomize: ProductExplorerProps["onCustomize"]
}) {
  const [colorId, setColorId] = useState(initialColor ?? product.colors[0].id)
  const [size, setSize] = useState(product.defaultSize ?? "")
  const [imageIndex, setImageIndex] = useState(0)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const color = product.colors.find((option) => option.id === colorId) ?? product.colors[0]

  useEffect(() => {
    setColorId(initialColor && product.colors.some((option) => option.id === initialColor) ? initialColor : product.colors[0].id)
    setSize(product.defaultSize ?? "")
    setImageIndex(0)
    setShowSizeGuide(false)
  }, [initialColor, product])

  return (
    <>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <button type="button" onClick={() => onBack()}>Shop all</button><span>/</span><strong>{product.name}</strong>
      </nav>
      <div className={styles.detail}>
        <section className={styles.gallery} aria-label={`${product.name} photos`}>
          <div className={styles.heroImage}>
            <img src={getVibeyaImage(product, color, imageIndex)} alt={`${color.name} ${product.short}, image ${imageIndex + 1}`} />
            <button type="button" className={`${styles.galleryArrow} ${styles.previous}`} onClick={() => setImageIndex((imageIndex + product.gallery.length - 1) % product.gallery.length)} aria-label="Previous image">‹</button>
            <button type="button" className={`${styles.galleryArrow} ${styles.next}`} onClick={() => setImageIndex((imageIndex + 1) % product.gallery.length)} aria-label="Next image">›</button>
            <span className={styles.imageCount}>{String(imageIndex + 1).padStart(2, "0")} / {String(product.gallery.length).padStart(2, "0")}</span>
          </div>
          <div className={styles.thumbnails}>
            {product.gallery.map((_, index) => (
              <button key={index} type="button" className={imageIndex === index ? styles.thumbnailActive : ""} onClick={() => setImageIndex(index)} aria-label={`View image ${index + 1}`} aria-pressed={imageIndex === index}>
                <img src={getVibeyaImage(product, color, index)} alt="" />
              </button>
            ))}
          </div>
        </section>
        <section className={styles.productInfo}>
          <span className={styles.eyebrow}>{product.eyebrow}</span>
          <h1>{product.name}</h1>
          <p className={styles.intro}>{product.intro}</p>
          <p className={styles.price}>{product.priceUnavailable ? "Price to be confirmed" : formatPrice(product.sizePrices?.[size] ?? product.price, product.currency)}</p>
          <div className={styles.optionBlock}>
            <div className={styles.optionHeading}><strong>{product.colorOptionLabel ?? "Color"}</strong><span>{color.name}</span></div>
            <div className={styles.swatches} role="group" aria-label="Choose a color">
              {product.colors.map((option) => (
                <button key={option.id} type="button" className={`${styles.swatch} ${colorId === option.id ? styles.swatchSelected : ""}`} style={{ "--swatch-color": option.hex } as CSSProperties} onClick={() => { setColorId(option.id); setImageIndex(0) }} aria-label={option.name} aria-pressed={colorId === option.id} />
              ))}
            </div>
          </div>
          <div className={styles.optionBlock}>
            <div className={styles.optionHeading}><strong>{product.sizeOptionLabel ?? "Size"}</strong><button type="button" className={styles.textButton} onClick={() => setShowSizeGuide((open) => !open)} aria-expanded={showSizeGuide}>{product.measurementRows ? "Dimensions" : "Size guide"} ({product.sizeGuide})</button></div>
            <div className={styles.sizes} role="group" aria-label="Choose a size">
              {product.sizes.map((option) => <button key={option} type="button" className={size === option ? styles.sizeSelected : ""} onClick={() => setSize(option)} aria-pressed={size === option}>{product.sizeLabels?.[option] ?? option}</button>)}
            </div>
            {showSizeGuide && (
              <div className={styles.sizeGuide}>
                <div className={styles.tableScroll}><table><thead><tr>{product.measurementRows ? <><th>Measurement</th><th>Specification</th></> : <><th>Size</th><th>Length</th><th>Bust</th><th>Shoulder</th><th>Sleeve</th></>}</tr></thead><tbody>{product.measurementRows ? product.measurementRows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>) : product.sizeRows.map((row) => <tr key={String(row[0])}>{row.map((cell, index) => index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>
                <p>{product.sizeNote}</p>
              </div>
            )}
          </div>
          <button type="button" className={styles.customize} onClick={() => onCustomize({ product: product.id, color: color.id, size })}>✦&nbsp; START CUSTOMIZING <span>↗</span></button>
          <p className={styles.shipping}>Free U.S. shipping · U.S. addresses only</p>
          <div className={styles.highlights}>{product.highlights.map((item) => <span key={item}>{item}</span>)}</div>
          <div className={styles.services}>
            {product.services.map(([title, copy], index) => (
              <div key={title}>
                <span className={styles.serviceIcon} aria-hidden="true">{["✦", "◷", "↗"][index]}</span>
                <div><strong>{title}</strong><p>{copy}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

export default function ProductExplorer({ productId, initialColor, onNavigate, onCustomize }: ProductExplorerProps) {
  const products = useVibeyaProducts()
  const navigation = useVibeyaMenu()
  const selectedProduct = products.find((product) => product.id === productId)
  const onSelect = (product: VibeyaProduct, color: string) => onNavigate(`#product-${product.id}?color=${encodeURIComponent(color)}`)

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button className={styles.brand} type="button" onClick={() => onNavigate("#top")}>VIBEYA<span>.</span></button>
        <nav aria-label="Main navigation">
          {navigation.map((item) => {
            if (item.target === "inspiration") {
              return <Link key={item.id} href="/vibeya/inspiration/index.html" className={item.featured ? styles.navFeatured : undefined}>{item.label}</Link>
            }
            if (item.target === "custom") {
              return <a key={item.id} href={item.customHref || "/"} className={item.featured ? styles.navFeatured : undefined}>{item.label}</a>
            }
            const hash = item.target === "shop"
              ? "#shop"
              : item.target === "create"
                ? "#create"
                : item.target === "how-it-works"
                  ? "#how-it-works"
                  : "#top"
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(hash)}
                className={item.featured ? styles.navFeatured : undefined}
              >
                {item.target === "create" && "✦  "}{item.label}
              </button>
            )
          })}
        </nav>
        <span className={styles.headerNote}>DESIGNED BY YOU</span>
      </header>
      <main className={styles.main}>
        {selectedProduct ? (
          <ProductDetail key={selectedProduct.id} product={selectedProduct} initialColor={initialColor} onBack={() => onNavigate("#shop")} onCustomize={onCustomize} />
        ) : <ProductGrid onSelect={onSelect} />}
      </main>
      <footer className={styles.footer}><span>© 2026 VIBEYA</span><span>Designed for expression. Made to be yours.</span></footer>
    </div>
  )
}
