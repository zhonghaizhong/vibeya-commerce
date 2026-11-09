"use client"

import { useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getVibeyaMenuHref, useVibeyaMenu } from "@modules/vibeya/data/use-vibeya-menu"
import styles from "./nav.module.css"

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigation = useVibeyaMenu()

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <div className={styles.announcement} data-vibeya-shell-announcement>
        YOUR IDEA, YOUR VIBE, YOURS TO KEEP. <strong>✳ MADE JUST FOR YOU</strong>
      </div>
      <header data-vibeya-shell-nav className={styles.header}>
        <nav className={styles.topnav} aria-label="Main navigation">
          <LocalizedClientLink href="/" onClick={closeMenu} className={styles.logo} data-testid="nav-store-link">
            VIBEYA<span>.</span>
          </LocalizedClientLink>

          <div className={`${styles.navigation} ${menuOpen ? styles.open : ""}`} id="main-navigation">
            {navigation.map((item) => {
              const href = getVibeyaMenuHref(item)
              const className = item.featured ? styles.featured : styles.link
              const content = <>{item.target === "create" && "✦  "}{item.target === "create" ? "Design your look" : item.label}</>

              return item.target === "inspiration" || href.startsWith("/vibeya/") ? (
                <a key={item.id} href={href} onClick={closeMenu} className={className}>
                  {content}
                </a>
              ) : (
                <LocalizedClientLink key={item.id} href={href} onClick={closeMenu} className={className}>
                  {content}
                </LocalizedClientLink>
              )
            })}
            <LocalizedClientLink href="/#my-designs" onClick={closeMenu} className={styles.link}>
              My Designs
            </LocalizedClientLink>
            <LocalizedClientLink href="/account" onClick={closeMenu} className={`${styles.link} ${styles.accountMenuLink}`}>
              Account
            </LocalizedClientLink>
          </div>

          <div className={styles.actions}>
            <LocalizedClientLink href="/?openSearch=1" className={styles.iconButton} aria-label="Search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16.2 16.2 5 5" /></svg>
            </LocalizedClientLink>
            <LocalizedClientLink href="/?viewCart=1" className={styles.iconButton} aria-label="Shopping bag" data-testid="nav-cart-link">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.3 11.5h11.9L22 7H6" /><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /></svg>
            </LocalizedClientLink>
            <LocalizedClientLink href="/account" className={styles.accountLink} data-testid="nav-account-link">
              Account
            </LocalizedClientLink>
            <button
              type="button"
              className={styles.menuButton}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
            </button>
          </div>
        </nav>
      </header>
    </>
  )
}
