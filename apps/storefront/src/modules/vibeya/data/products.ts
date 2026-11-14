export type VibeyaColor = {
  id: string
  name: string
  hex: string
  folder: string
}

export type VibeyaProduct = {
  id: string
  handle: string
  catalogOnly?: boolean
  catalogImage?: string | null
  category?: string
  priceUnavailable?: boolean
  name: string
  short: string
  price: number
  currency: string
  colors: VibeyaColor[]
  sizes: string[]
  sizePrices?: Record<string, number>
  sizeLabels?: Record<string, string>
  defaultSize?: string
  gallery: string[]
  highlights: string[]
  intro: string
  eyebrow: string
  sizeGuide: string
  sizeRows: (string | number)[][]
  sizeNote: string
  services: [string, string][]
  variantSummary?: string
  colorOptionLabel?: string
  sizeOptionLabel?: string
  measurementRows?: [string, string][]
}

const longSleeveGallery = [
  "01-brand-lifestyle.webp",
  "02-make-it-personal.webp",
  "03-cotton-comfort.webp",
  "04-wear-it-your-way.webp",
  "05-attention-to-detail.webp",
  "06-idea-to-outfit.webp",
  "07-make-it-yours.webp",
]

const hoodieGallery = [
  "01-brand-lifestyle.png",
  "02-make-it-personal.png",
  "03-400g-washed-comfort.png",
  "04-wear-it-your-way.png",
  "05-attention-to-detail.png",
  "06-idea-to-outfit.png",
  "07-make-it-yours.png",
]

const tumblerGallery = [
  "01-main-image.jpg",
  "02-buying-reasons-user.png",
  "03-need-solution-car-fit.jpg",
  "04-product-structure.jpg",
  "05-detail-evidence.jpg",
  "06-usage-scene.jpg",
  "07-artwork-selling-points-user.png",
  "08-specifications.jpg",
]

const bathMatGallery = [
  "01-main-image.png",
  "02-print-design.png",
  "03-supplier-sample.jpg",
  "04-material-details.jpg",
]

const blanketGallery = [
  "01-main-image.png",
  "02-core-reason.png",
  "03-need-solution.png",
  "04-product-structure.png",
  "05-detail-evidence.png",
  "06-usage-scene.png",
  "07-choice-reasons.png",
  "08-size-guide.png",
]

const beanieGallery = [
  "01-hero.png",
  "02-custom-print-model.png",
  "03-lifestyle-product.png",
  "04-front-back.png",
  "05-knit-print-detail.png",
  "06-model-lifestyle.png",
  "07-color-options.png",
  "08-size-specs.png",
]

const tankiniGallery = [
  "01-main-image.jpg",
  "02-prompt-preview.jpg",
  "03-fabric-fit.jpg",
  "04-two-piece.jpg",
  "05-sizes.jpg",
  "06-care.jpg",
  "07-customize.jpg",
]

const basketballUniformGallery = Array.from(
  { length: 7 },
  (_, index) => `${String(index + 1).padStart(2, "0")}-carousel.jpg`
)

const longSleeveColors: VibeyaColor[] = [
  { id: "Black", name: "Black", hex: "#17171b", folder: "" },
  { id: "White", name: "White", hex: "#ffffff", folder: "white" },
  { id: "Red", name: "Red", hex: "#e52537", folder: "red" },
  { id: "Gray", name: "Heather Gray", hex: "#64666c", folder: "gray" },
  { id: "LightGray", name: "Light Heather Gray", hex: "#d7d7d9", folder: "light-gray" },
  { id: "Cream", name: "Cream", hex: "#f2e4cf", folder: "cream" },
  { id: "Navy", name: "Navy", hex: "#283456", folder: "navy" },
]

const hoodieColors: VibeyaColor[] = [
  { id: "Khaki", name: "Brown", hex: "#79675a", folder: "brown" },
  { id: "Gray", name: "Light Gray", hex: "#c9c8c8", folder: "light-gray" },
  { id: "Black", name: "Washed Black", hex: "#28282a", folder: "black" },
  { id: "Green", name: "Muted Green", hex: "#747d71", folder: "muted-green" },
  { id: "Pink", name: "Pink", hex: "#c95178", folder: "pink" },
  { id: "Purple", name: "Lavender", hex: "#776b86", folder: "lavender" },
]

export const vibeyaProducts: VibeyaProduct[] = [
  {
    id: "sds-167256",
    handle: "vibeya-custom-cotton-long-sleeve-tee",
    name: "VIBEYA Custom Cotton Long Sleeve Tee",
    short: "Cotton long sleeve tee",
    price: 19.99,
    currency: "USD",
    colors: longSleeveColors,
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    gallery: longSleeveGallery,
    eyebrow: "VIBEYA / FIRST COLLECTION",
    intro: "Your vibe, your rules. Choose from seven colors, then create your own front, back, or double-sided artwork.",
    highlights: ["100% Cotton", "Custom Front / Back"],
    sizeGuide: "cm",
    sizeRows: [
      ["XS", 69, 81, 52, 62], ["S", 71, 91, 53, 63], ["M", 75, 102, 54, 64],
      ["L", 79, 112, 55, 65], ["XL", 81, 122, 56, 66], ["2XL", 84, 132, 57, 67],
      ["3XL", 85, 141, 58, 68],
    ],
    sizeNote: "Supplier measurements in centimeters. Manual measurement may vary by 1–2 cm.",
    services: [
      ["Made in the USA", "Manufactured in the United States."],
      ["Ships within 24 hours", "Dispatched from the USA."],
      ["Free U.S. shipping", "Shipping to U.S. addresses only."],
    ],
  },
  {
    id: "vibeya-washed-hoodie",
    handle: "vibeya-washed-vintage-hooded-sweatshirt",
    name: "VIBEYA Washed Vintage Hooded Sweatshirt",
    short: "Washed vintage hoodie",
    price: 29.99,
    currency: "USD",
    colors: hoodieColors,
    sizes: ["S", "M", "L", "XL", "2XL"],
    gallery: hoodieGallery,
    eyebrow: "VIBEYA / CUSTOM COLLECTION",
    intro: "A heavyweight washed hoodie with original double-sided artwork. Choose a color and size, then make the design your own.",
    highlights: ["400g washed fleece", "60% cotton · 40% polyester", "Custom Front / Back"],
    sizeGuide: "cm / in",
    sizeRows: [
      ["S", 70, 120, 56.5, 56], ["M", 72, 124, 58, 57.5], ["L", 74, 128, 59.5, 59],
      ["XL", 76, 132, 61, 60.5], ["2XL", 78, 136, 62.5, 62],
    ],
    sizeNote: "Garment measurements in centimeters / inches. Manual measurement may vary by 1–2 cm.",
    services: [
      ["Made in the USA", "Manufactured in the United States."],
      ["Ships within 24 hours", "Dispatched from the USA."],
      ["Free U.S. shipping", "Shipping to U.S. addresses only."],
    ],
  },
  {
    id: "sds-172647",
    handle: "vibeya-custom-knitted-beanie",
    category: "Apparel",
    name: "VIBEYA Custom Knitted Beanie",
    short: "Custom knitted beanie",
    price: 14.99,
    currency: "USD",
    colors: [
      { id: "Black", name: "Black", hex: "#17171b", folder: "black" },
      { id: "Red", name: "Red", hex: "#cf273b", folder: "red" },
      { id: "Gray", name: "Medium Gray", hex: "#77777b", folder: "gray" },
    ],
    sizes: ["One Size"],
    defaultSize: "One Size",
    gallery: beanieGallery,
    eyebrow: "VIBEYA / CUSTOM APPAREL",
    intro: "A soft 100% acrylic knit beanie, made personal with your own design printed on the folded front cuff. The artwork shown is only a sample.",
    highlights: ["100% Acrylic · 300g", "Custom Front Cuff Print", "One Size"],
    sizeGuide: "in",
    sizeRows: [],
    sizeNote: "Supplier measurements are approximate and may vary slightly.",
    variantSummary: "Design or upload artwork · 3 colors · One Size",
    colorOptionLabel: "Color",
    sizeOptionLabel: "Size",
    measurementRows: [
      ["Beanie height", "8.3 in"],
      ["Beanie width", "7.9 in"],
      ["Folded cuff height", "2.8 in"],
      ["Weight", "300 g"],
    ],
    services: [
      ["Ships within 24 hours", "Dispatched from the U.S. warehouse."],
      ["Custom front print", "Your design prints on the folded front cuff."],
      ["Free U.S. shipping", "Shipping to U.S. addresses only."],
    ],
  },
  {
    id: "sds-128646",
    handle: "vibeya-custom-20oz-stainless-steel-tumbler",
    name: "VIBEYA Custom 20 oz Stainless Steel Tumbler",
    short: "Custom 20 oz tumbler",
    price: 19.99,
    currency: "USD",
    colors: [{ id: "White", name: "White", hex: "#ffffff", folder: "" }],
    sizes: ["20 oz"],
    gallery: tumblerGallery,
    eyebrow: "VIBEYA / CUSTOM DRINKWARE",
    intro: "Make this 20 oz stainless steel tumbler your own. Describe a design or upload your artwork for a full-wrap print; the cat-and-moon gallery art is only a sample. Includes a clear sliding lid and a separate straw.",
    highlights: ["20 oz", "304 Stainless Steel", "Custom Full-wrap Print"],
    sizeGuide: "cm / in",
    sizeRows: [],
    sizeNote: "Supplier dimensions; measurements may vary slightly.",
    variantSummary: "Design or upload artwork · 20 oz",
    colorOptionLabel: "Color",
    sizeOptionLabel: "Capacity",
    measurementRows: [
      ["Body height", "21 cm / 8.3 in"],
      ["Straw length", "23 cm / 9.1 in"],
      ["Top diameter", "7.8 cm / 3.1 in"],
      ["Base diameter", "7.2 cm / 2.8 in"],
    ],
    services: [
      ["Made in the USA", "Manufactured in the United States."],
      ["Ships within 24 hours", "Dispatched from the USA."],
      ["Free U.S. shipping", "Shipping to U.S. addresses only."],
    ],
  },
  {
    id: "sds-138708",
    handle: "vibeya-custom-3d-bath-mat",
    name: "VIBEYA Custom 3D Optical Illusion Bath Mat",
    short: "Custom 3D bath mat",
    price: 19.99,
    currency: "USD",
    colors: [{ id: "White", name: "White", hex: "#ffffff", folder: "" }],
    sizes: ["40x60cm", "50x80cm", "60x90cm"],
    sizePrices: { "40x60cm": 19.99, "50x80cm": 21.99, "60x90cm": 23.99 },
    sizeLabels: {
      "40x60cm": "15.7 × 23.6 in",
      "50x80cm": "19.7 × 31.5 in",
      "60x90cm": "23.6 × 35.4 in",
    },
    defaultSize: "40x60cm",
    gallery: bathMatGallery,
    eyebrow: "VIBEYA / CUSTOM HOME",
    intro: "Add a little absurdity to your daily reset. This custom bath mat features a playful 3D optical-illusion print, with artwork printed across the full surface and edges.",
    highlights: ["Full-surface print", "Thickened design", "Short pile", "Non-slip design"],
    sizeGuide: "in",
    sizeRows: [],
    sizeNote: "Approximate dimensions converted from supplier sizes.",
    variantSummary: "Custom full-surface print · 3 sizes",
    colorOptionLabel: "Print design",
    sizeOptionLabel: "Size",
    measurementRows: [
      ["Small", "15.7 × 23.6 in"],
      ["Medium", "19.7 × 31.5 in"],
      ["Large", "23.6 × 35.4 in"],
    ],
    services: [
      ["Made in the USA", "Manufactured in the United States."],
      ["Ships within 24 hours", "Dispatched from the USA."],
      ["Free U.S. shipping", "Shipping to U.S. addresses only."],
    ],
  },
  {
    id: "sds-97226",
    handle: "vibeya-custom-flannel-throw-blanket",
    name: "VIBEYA Custom Flannel Throw Blanket",
    short: "Custom flannel throw blanket",
    price: 14.99,
    currency: "USD",
    colors: [{ id: "White", name: "White", hex: "#ffffff", folder: "" }],
    sizes: ["30x40", "40x50", "50x60", "60x80"],
    sizePrices: { "30x40": 14.99, "40x50": 16.99, "50x60": 18.99, "60x80": 20.99 },
    sizeLabels: {
      "30x40": "30 × 40 in",
      "40x50": "40 × 50 in",
      "50x60": "50 × 60 in",
      "60x80": "60 × 80 in",
    },
    defaultSize: "30x40",
    gallery: blanketGallery,
    eyebrow: "VIBEYA / CUSTOM HOME",
    intro: "Make a cozy throw your own with a custom full-surface print. The printed front reaches the edges; the reverse is soft white flannel.",
    highlights: ["Full-surface front print", "Soft flannel", "White plush reverse"],
    sizeGuide: "in",
    sizeRows: [],
    sizeNote: "Approximate dimensions; slight variations may occur.",
    variantSummary: "Custom full-surface print · 4 sizes",
    colorOptionLabel: "Blanket color",
    sizeOptionLabel: "Size",
    measurementRows: [
      ["30 × 40 in", "$14.99 USD"],
      ["40 × 50 in", "$16.99 USD"],
      ["50 × 60 in", "$18.99 USD"],
      ["60 × 80 in", "$20.99 USD"],
    ],
    services: [
      ["Made in the USA", "Manufactured in the United States."],
      ["Ships within 24 hours", "Dispatched from the USA."],
      ["Free U.S. shipping", "Shipping to U.S. addresses only."],
    ],
  },
  {
    id: "vibeya-shower-curtain",
    handle: "vibeya-custom-shower-curtain",
    category: "Home & Bath",
    name: "VIBEYA Custom Shower Curtain",
    short: "Custom shower curtain",
    price: 17.99,
    currency: "USD",
    colors: [{ id: "White", name: "White", hex: "#ffffff", folder: "" }],
    sizes: ["36x70.8in", "60x70.8in", "70.8x70.8in", "70.8x84in"],
    sizePrices: { "36x70.8in": 17.99, "60x70.8in": 19.99, "70.8x70.8in": 21.99, "70.8x84in": 23.99 },
    sizeLabels: {
      "36x70.8in": "36 × 70.8 in",
      "60x70.8in": "60 × 70.8 in",
      "70.8x70.8in": "70.8 × 70.8 in",
      "70.8x84in": "70.8 × 84 in",
    },
    defaultSize: "36x70.8in",
    gallery: ["36x70.8in.webp", "60x70.8in.webp", "70.8x70.8in.png", "70.8x84in.webp"],
    eyebrow: "VIBEYA / CUSTOM HOME",
    intro: "Create a custom shower curtain with a single-sided, edge-to-edge print. Choose from four sizes; your finished design is shown hanging naturally against a white background.",
    highlights: ["Single-sided full-surface print", "Four size options", "White-background hanging preview"],
    sizeGuide: "in / cm",
    sizeRows: [],
    sizeNote: "Measurements are taken from the supplied product references.",
    variantSummary: "Custom full-surface print · 4 sizes",
    colorOptionLabel: "Color",
    sizeOptionLabel: "Size",
    measurementRows: [
      ["36 × 70.8 in", "90 × 180 cm"],
      ["60 × 70.8 in", "152 × 180 cm"],
      ["70.8 × 70.8 in", "180 × 180 cm"],
      ["70.8 × 84 in", "180 × 213 cm"],
    ],
    services: [
      ["Single-sided full print", "Artwork covers the visible curtain face edge to edge."],
      ["Hanging product preview", "Shown on a rod with natural fabric folds."],
      ["Free U.S. shipping", "Shipping to U.S. addresses only."],
    ],
  },
  {
    id: "sds-137892",
    handle: "vibeya-custom-womens-tankini-swimsuit-set",
    category: "Apparel",
    name: "VIBEYA Custom Women's Tankini Swimsuit Set",
    short: "Custom women's tankini swimsuit",
    price: 19.99,
    currency: "USD",
    colors: [
      { id: "Black", name: "Black", hex: "#17171b", folder: "black" },
      { id: "Red", name: "Red", hex: "#ec4329", folder: "red" },
      { id: "Pink", name: "Pink", hex: "#ec4c91", folder: "pink" },
      { id: "Blue", name: "Blue", hex: "#3859d7", folder: "blue" },
      { id: "Cyan", name: "Cyan", hex: "#22c3d7", folder: "cyan" },
    ],
    sizes: ["S", "M", "L", "XL"],
    gallery: tankiniGallery,
    eyebrow: "VIBEYA / CUSTOM SWIMWEAR",
    intro: "Design a swimsuit that feels like yours. Describe a print or upload your artwork, preview it on this two-piece tankini, then choose your color and size. Each gallery print is only a sample.",
    highlights: ["Two-piece tankini set", "Halter swim top + side-tie shorts", "80% nylon · 20% spandex", "Custom front print"],
    sizeGuide: "in",
    sizeRows: [],
    sizeNote: "Supplier measurements are approximate. Check the size guide images before ordering; fit may vary by 1–2 cm.",
    variantSummary: "Design or upload artwork · 5 colors · Sizes S–XL",
    colorOptionLabel: "Base color",
    sizeOptionLabel: "Size",
    measurementRows: [
      ["S", "18.3 in length · 14.2 in half chest · 32.3 in hip"],
      ["M", "18.7 in length · 15.0 in half chest · 33.9 in hip"],
      ["L", "19.3 in length · 15.9 in half chest · 35.8 in hip"],
      ["XL", "19.9 in length · 16.9 in half chest · 37.8 in hip"],
    ],
    services: [
      ["Made for your design", "Create a print from a prompt or upload your own artwork."],
      ["Two-piece tankini", "Includes a halter-style swim top and separate side-tie shorts."],
      ["U.S. shipping", "Shipping options and delivery estimates appear at checkout."],
    ],
  },
  {
    id: "sds-233939",
    handle: "vibeya-custom-kids-basketball-uniform",
    category: "Apparel",
    name: "VIBEYA Custom Kids' Basketball Uniform",
    short: "Custom kids' basketball jersey and shorts set",
    price: 19.99,
    currency: "USD",
    colors: [
      { id: "Black", name: "Black", hex: "#17171b", folder: "black" },
      { id: "White", name: "White", hex: "#ffffff", folder: "white" },
      { id: "Red", name: "Red", hex: "#e52d3d", folder: "red" },
      { id: "Sapphire Blue", name: "Sapphire Blue", hex: "#315ad8", folder: "blue" },
      { id: "Pure yellow", name: "Pure Yellow", hex: "#ffe100", folder: "yellow" },
    ],
    sizes: ["100CM", "110CM", "120CM", "130CM", "140CM"],
    gallery: basketballUniformGallery,
    eyebrow: "VIBEYA / CUSTOM BASKETBALL",
    intro: "Create a kids' basketball uniform from a text prompt. Customize the jersey front, jersey back, and shorts as three separate print areas, then mix and match your artwork for a one-of-a-kind set. The gallery design is only an example.",
    highlights: ["Custom jersey + shorts set", "3 independently customizable print areas", "100% polyester · 140 GSM", "Sizes 100–140 cm"],
    sizeGuide: "cm / in",
    sizeRows: [],
    sizeNote: "Supplier garment measurements. Manual measurement may vary by 1–2 cm.",
    variantSummary: "Design with a prompt · 5 colors · 5 sizes · 3 print areas",
    colorOptionLabel: "Base color",
    sizeOptionLabel: "Size",
    measurementRows: [
      ["100 cm", "Top length 42 cm · chest 65 cm · shorts length 27 cm · hip 72 cm · waist 17 cm"],
      ["110 cm", "Top length 44 cm · chest 69 cm · shorts length 29 cm · hip 76 cm · waist 20 cm"],
      ["120 cm", "Top length 47 cm · chest 73 cm · shorts length 31 cm · hip 80 cm · waist 23 cm"],
      ["130 cm", "Top length 50 cm · chest 77 cm · shorts length 33 cm · hip 84 cm · waist 25 cm"],
      ["140 cm", "Top length 53 cm · chest 81 cm · shorts length 35 cm · hip 88 cm · waist 27 cm"],
    ],
    services: [
      ["Made for your design", "Describe your artwork with a text prompt and personalize the set."],
      ["Mix three print areas", "Customize the jersey front, jersey back, and shorts independently, then combine designs your way."],
      ["U.S. shipping", "Shipping options and delivery estimates appear at checkout."],
    ],
  },
]

export function getVibeyaImage(product: VibeyaProduct, color: VibeyaColor, index = 0) {
  const file = product.gallery[index] ?? product.gallery[0]
  if (product.id === "sds-128646") {
    return `/vibeya/assets/products/sds-128646/${file}`
  }
  if (product.id === "sds-138708") {
    return `/vibeya/assets/products/sds-138708/${file}`
  }
  if (product.id === "sds-97226") {
    return `/vibeya/assets/products/sds-97226/${file}`
  }
  if (product.id === "vibeya-shower-curtain") {
    return `/vibeya/assets/products/vibeya-shower-curtain/${file}`
  }
  if (product.id === "sds-137892") {
    return `/vibeya/assets/products/mg8011024/${color.folder}/${file}`
  }
  if (product.id === "sds-233939") {
    return `/vibeya/assets/products/sds-233939/${color.folder}/${file}`
  }
  if (product.id === "sds-172647") {
    const colorGallery = color.id === "Black"
      ? product.gallery.map((item, position) => position === 0 ? product.gallery[1] : position === 1 ? product.gallery[0] : item)
      : product.gallery
    const colorFile = colorGallery[index] ?? colorGallery[0]
    const refreshed = color.id === "Black" && index < 2 ? "?rev=2" : ""
    return `/vibeya/assets/products/sds-172647/${color.folder}/${colorFile}${refreshed}`
  }
  if (product.id === "vibeya-washed-hoodie") {
    return `/vibeya/assets/products/mg8003077/${color.folder}/${file}`
  }
  const directory = color.folder ? `${color.folder}/` : ""
  const extension = color.id === "Gray" ? file.replace(".webp", ".jpg") : file
  return `/vibeya/assets/products/sds-167256/${directory}${extension}`
}
