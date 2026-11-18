export type ShopCopy = {
  title: string
  description: string
  heading: string
  intro: string
  all: string
  search: string
  sort: string
  featured: string
  name: string
  priceLow: string
  priceHigh: string
  countPrefix: string
  countSuffix: string
  empty: string
  priceUnavailable: string
}

export const SHOP_COPY: Record<string, ShopCopy> = {
  "en-US": {
    title: "Shop Custom Products: Personalized Apparel, Home & Gifts | VIBEYA",
    description: "Shop custom apparel, tumblers, blankets, bath products, and home decor. Browse products available in the United States and create a design made for you.",
    heading: "Shop custom products",
    intro: "Browse customizable apparel, drinkware, and home products available in the United States.",
    all: "All products",
    search: "Search products",
    sort: "Sort products",
    featured: "Featured",
    name: "Name: A to Z",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    countPrefix: "Showing ",
    countSuffix: " products",
    empty: "No products match your search.",
    priceUnavailable: "See product for pricing",
  },
  "en-CA": {
    title: "Shop Custom Products in Canada | VIBEYA",
    description: "Shop custom apparel, drinkware, blankets, and home products available in Canada. Browse the collection and make a design your own.",
    heading: "Shop custom products",
    intro: "Browse customizable apparel, drinkware, and home products available in Canada.",
    all: "All products",
    search: "Search products",
    sort: "Sort products",
    featured: "Featured",
    name: "Name: A to Z",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    countPrefix: "Showing ",
    countSuffix: " products",
    empty: "No products match your search.",
    priceUnavailable: "See product for pricing",
  },
  "ja-JP": {
    title: "カスタム商品一覧｜オリジナルウェア・ギフト | VIBEYA",
    description: "日本で購入できるカスタムウェア、タンブラー、ブランケット、ホーム用品をご覧ください。自分だけのデザインを作成できます。",
    heading: "カスタム商品一覧",
    intro: "日本で購入できるカスタムウェア、ドリンクウェア、ホーム用品をご覧ください。",
    all: "すべての商品",
    search: "商品を検索",
    sort: "並び替え",
    featured: "おすすめ順",
    name: "名前順：A～Z",
    priceLow: "価格の安い順",
    priceHigh: "価格の高い順",
    countPrefix: "",
    countSuffix: " 件の商品",
    empty: "検索条件に一致する商品はありません。",
    priceUnavailable: "価格は商品ページをご確認ください",
  },
  "es-MX": {
    title: "Productos personalizados | Ropa, hogar y regalos | VIBEYA",
    description: "Compra ropa, vasos, mantas y artículos para el hogar personalizables disponibles en México. Explora los productos y crea un diseño propio.",
    heading: "Productos personalizados",
    intro: "Explora ropa, vasos y artículos para el hogar personalizables disponibles en México.",
    all: "Todos los productos",
    search: "Buscar productos",
    sort: "Ordenar productos",
    featured: "Destacados",
    name: "Nombre: A a Z",
    priceLow: "Precio: menor a mayor",
    priceHigh: "Precio: mayor a menor",
    countPrefix: "",
    countSuffix: " productos",
    empty: "No hay productos que coincidan con la búsqueda.",
    priceUnavailable: "Consulta el precio en el producto",
  },
}
