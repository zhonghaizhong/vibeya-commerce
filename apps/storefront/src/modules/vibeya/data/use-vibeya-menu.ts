"use client"


export type VibeyaMenuTarget =
  | "home"
  | "shop"
  | "create"
  | "inspiration"
  | "how-it-works"
  | "custom"

export type VibeyaMenuItem = {
  id: string
  label: string
  target: VibeyaMenuTarget
  customHref?: string
  enabled: boolean
  featured: boolean
}

const DEFAULT_MENU: VibeyaMenuItem[] = [
  { id: "home", label: "Home", target: "home", enabled: true, featured: false },
  { id: "shop", label: "Shop All", target: "shop", enabled: true, featured: false },
  { id: "create", label: "Create with AI", target: "create", enabled: true, featured: true },
  { id: "inspiration", label: "Inspiration", target: "inspiration", enabled: true, featured: false },
  { id: "how-it-works", label: "How It Works", target: "how-it-works", enabled: true, featured: false },
]

export function getVibeyaMenuHref(item: VibeyaMenuItem): string {
  switch (item.target) {
    case "home": return "/"
    case "shop": return "/#shop"
    case "create": return "/?openStudio=1"
    case "inspiration": return "/vibeya/inspiration/index.html"
    case "how-it-works": return "/#how-it-works"
    case "custom":
      return item.customHref?.startsWith("#")
        ? `/${item.customHref}`
        : item.customHref || "/"
  }
}

export function useVibeyaMenu() {
  return DEFAULT_MENU
}
