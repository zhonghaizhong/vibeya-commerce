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
