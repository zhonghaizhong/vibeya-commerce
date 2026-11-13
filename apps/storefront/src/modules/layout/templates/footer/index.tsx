import { STORE_NAME } from "@lib/util/site"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Footer() {
  return (
    <footer className="mt-8 w-full border-t border-[#e9e3ea] bg-[#fffdfa] text-[#160d24]">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 small:grid-cols-[1.4fr_1fr_1fr] small:px-10 small:py-16">
        <div className="max-w-sm">
          <LocalizedClientLink
            href="/"
            className="font-display text-3xl font-black tracking-[-.08em]"
          >
            VIBEYA<span className="text-[#8f60ed]">.</span>
          </LocalizedClientLink>
          <p className="mt-4 text-sm leading-6 text-[#625c69]">
            Turn your ideas into one-of-a-kind things. Made for the way you see
            the world.
          </p>
          <div className="mt-5 flex items-center gap-3" aria-label="Follow VIBEYA">
            <a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5d4f7] text-[#5b35a0] transition hover:border-[#8f60ed] hover:bg-[#f1e5ff]" href="https://www.facebook.com/profile.php?id=61596154035820" target="_blank" rel="noopener noreferrer" aria-label="VIBEYA on Facebook" title="Facebook">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8h3.4Z" /></svg>
            </a>
            <a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5d4f7] text-[#5b35a0] transition hover:border-[#8f60ed] hover:bg-[#f1e5ff]" href="https://www.instagram.com/vibeya.studio/" target="_blank" rel="noopener noreferrer" aria-label="VIBEYA on Instagram" title="Instagram">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.7" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
            </a>
          </div>
          <p className="mt-7 text-xs text-[#77717d]">
            © {new Date().getFullYear()} {STORE_NAME}. Made for you.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-xs font-extrabold uppercase tracking-[.16em]">
            Explore
          </h2>
          <ul className="space-y-3 text-sm text-[#625c69]">
            <li>
              <LocalizedClientLink
                className="hover:text-[#8f60ed]"
                href="/#shop"
              >
                Shop all
              </LocalizedClientLink>
            </li>
            <li>
              <LocalizedClientLink
                className="hover:text-[#8f60ed]"
                href="/?openStudio=1"
              >
                Design your look
              </LocalizedClientLink>
            </li>
            <li>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                className="hover:text-[#8f60ed]"
                href="/vibeya/inspiration/index.html"
              >
                Inspiration
              </a>
            </li>
            <li>
              <LocalizedClientLink
                className="hover:text-[#8f60ed]"
                href="/#how-it-works"
              >
                How it works
              </LocalizedClientLink>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-[#f1e5ff] p-5">
          <h2 className="text-xs font-extrabold uppercase tracking-[.16em]">
            Customer care
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#625c69]">
            Every item is made especially for you. If there is a problem with
            your order, we are here to help.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
            <LocalizedClientLink
              className="hover:text-[#8f60ed]"
              href="/shipping"
            >
              Shipping
            </LocalizedClientLink>
            <LocalizedClientLink
              className="hover:text-[#8f60ed]"
              href="/returns"
            >
              Custom order policy
            </LocalizedClientLink>
            <LocalizedClientLink
              className="hover:text-[#8f60ed]"
              href="/contact"
            >
              Contact
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
