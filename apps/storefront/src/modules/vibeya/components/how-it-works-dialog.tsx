"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import styles from "./how-it-works-dialog.module.css"

const COPY = {
  "en-US": {
    title: "How It Works",
    intro: "Turn your ideas into one-of-a-kind things. Just describe it, get creative, and make it yours.",
    steps: [
      ["Describe your idea", "Tell us what you imagine."],
      ["Preview & customize", "See it on your favorite product."],
      ["Make it yours", "Approve it, then we make it."],
    ],
    close: "Close",
  },
  "en-CA": {
    title: "How It Works",
    intro: "Turn your ideas into one-of-a-kind things. Just describe it, get creative, and make it yours.",
    steps: [
      ["Describe your idea", "Tell us what you imagine."],
      ["Preview & customize", "See it on your favourite product."],
      ["Make it yours", "Approve it, then we make it."],
    ],
    close: "Close",
  },
  "ja-JP": {
    title: "ご利用方法",
    intro: "アイデアを、あなただけのアイテムに。デザインを説明して、プレビューで確認しましょう。",
    steps: [
      ["アイデアを伝える", "作りたいデザインを入力します。"],
      ["プレビューして調整", "商品に反映されたデザインを確認します。"],
      ["注文する", "仕上がりを確認して注文します。"],
    ],
    close: "閉じる",
  },
  "es-MX": {
    title: "Cómo funciona",
    intro: "Convierte tus ideas en algo único. Describe tu diseño, personalízalo y hazlo tuyo.",
    steps: [
      ["Describe tu idea", "Cuéntanos qué diseño imaginas."],
      ["Previsualiza y personaliza", "Mira cómo queda en tu producto favorito."],
      ["Hazlo tuyo", "Confirma el diseño y nosotros lo fabricamos."],
    ],
    close: "Cerrar",
  },
} as const

export default function HowItWorksDialog({
  locale,
  open,
  onClose,
}: {
  locale: string
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const copy = COPY[locale as keyof typeof COPY] ?? COPY["en-US"]

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== "Tab" || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      ))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", onKeyDown)
      previousFocus?.focus()
    }
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
        aria-describedby="how-it-works-intro"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div>
            <h2 id="how-it-works-title">{copy.title}</h2>
            <p id="how-it-works-intro">{copy.intro}</p>
          </div>
          <button ref={closeRef} className={styles.close} type="button" onClick={onClose} aria-label={copy.close}>×</button>
        </div>
        <div className={styles.steps}>
          {copy.steps.map(([title, description], index) => (
            <article className={styles.step} key={title}>
              <span className={styles.number} aria-hidden="true">0{index + 1}</span>
              <h3>{index + 1}. {title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className={styles.footer}>
          <button className={styles.done} type="button" onClick={onClose}>{copy.close}</button>
        </div>
      </section>
    </div>,
    document.body
  )
}
