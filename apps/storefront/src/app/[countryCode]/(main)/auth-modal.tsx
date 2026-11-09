"use client"

import { login, signup } from "@lib/data/customer"
import GoogleSignInButton from "@modules/account/components/google-sign-in-button"
import { useActionState, useCallback, useEffect, useState } from "react"

type AuthModalProps = {
  countryCode: string
  onClose: () => void
  redirectTo?: string
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="block text-left text-sm font-semibold text-[#160d24]">
      {label}
      <input
        className="mt-2 h-12 w-full rounded-xl border border-[#e9e3ea] bg-white px-4 text-base font-normal outline-none transition focus:border-[#8f60ed] focus:ring-2 focus:ring-[#8f60ed]/20"
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  )
}

function ErrorText({ message }: { message?: string | null }) {
  return message ? (
    <p role="alert" className="text-left text-sm font-medium text-red-700">
      {message}
    </p>
  ) : null
}

function LoginForm({
  onRegister,
  onAuthenticated,
}: {
  onRegister: () => void
  onAuthenticated: () => void
}) {
  const [state, formAction, pending] = useActionState(login, null)

  useEffect(() => {
    if (state?.state === "success") onAuthenticated()
  }, [state, onAuthenticated])

  return (
    <>
      <h2 className="mb-2 text-center text-2xl font-extrabold tracking-tight text-[#160d24]">
        Welcome back
      </h2>
      <p className="mb-6 text-center text-sm text-[#625c69]">
        Sign in to get back to your VIBEYA account.
      </p>
      <form action={formAction} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        {state?.state === "verification_required" && (
          <p className="rounded-xl bg-[#f1e5ff] p-3 text-sm text-[#160d24]">
            Check your inbox for a verification link sent to {state.email}.
          </p>
        )}
        <ErrorText message={state?.state === "error" ? state.error : null} />
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-[#dcfc60] px-5 font-extrabold text-[#160d24] transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#625c69]">
        New to VIBEYA?{" "}
        <button
          type="button"
          onClick={onRegister}
          className="font-extrabold text-[#160d24] underline decoration-[#8f60ed] decoration-2 underline-offset-4"
        >
          Create an account
        </button>
      </p>
    </>
  )
}

function RegisterForm({
  onSignIn,
  onAuthenticated,
}: {
  onSignIn: () => void
  onAuthenticated: () => void
}) {
  const [state, formAction, pending] = useActionState(signup, null)

  useEffect(() => {
    if (state?.state === "success") onAuthenticated()
  }, [state, onAuthenticated])

  return (
    <>
      <h2 className="mb-2 text-center text-2xl font-extrabold tracking-tight text-[#160d24]">
        Join VIBEYA
      </h2>
      <p className="mb-6 text-center text-sm text-[#625c69]">
        Create an account to keep your orders and details in one place.
      </p>
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="first_name" autoComplete="given-name" />
          <Field label="Last name" name="last_name" autoComplete="family-name" />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" />
        {state?.state === "verification_required" && (
          <p className="rounded-xl bg-[#f1e5ff] p-3 text-sm text-[#160d24]">
            Check your inbox for a verification link sent to {state.email}.
          </p>
        )}
        <ErrorText message={state?.state === "error" ? state.error : null} />
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-[#dcfc60] px-5 font-extrabold text-[#160d24] transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#625c69]">
        Already a member?{" "}
        <button
          type="button"
          onClick={onSignIn}
          className="font-extrabold text-[#160d24] underline decoration-[#8f60ed] decoration-2 underline-offset-4"
        >
          Sign in
        </button>
      </p>
    </>
  )
}

export default function AuthModal({ countryCode, onClose, redirectTo }: AuthModalProps) {
  const [view, setView] = useState<"sign-in" | "register">("sign-in")

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  const onAuthenticated = useCallback(() => {
    window.location.href = redirectTo || `/${countryCode}/account`
  }, [countryCode, redirectTo])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#160d24]/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vibeya-auth-title"
        className="relative my-auto w-full max-w-[460px] rounded-[26px] border border-[#e9e3ea] bg-[#fffdfa] p-6 shadow-[0_26px_70px_rgba(35,17,56,.22)] sm:p-9"
      >
        <button
          type="button"
          aria-label="Close sign in dialog"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-[#625c69] transition hover:bg-[#f1e5ff] hover:text-[#160d24]"
        >
          ×
        </button>

        <div className="mb-7 text-center">
          <div className="mb-5 inline-flex rounded-full bg-[#dcfc60] px-4 py-2 text-sm font-black tracking-[.12em] text-[#160d24]">
            VIBEYA<span className="text-[#8f60ed]">.</span>
          </div>
          <h1 id="vibeya-auth-title" className="sr-only">
            {view === "sign-in" ? "Sign in to VIBEYA" : "Create a VIBEYA account"}
          </h1>
        </div>

        <GoogleSignInButton
          countryCode={countryCode}
          onAuthenticated={onAuthenticated}
        />

        <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.14em] text-[#625c69]">
          <span className="h-px flex-1 bg-[#e9e3ea]" />
          or use email
          <span className="h-px flex-1 bg-[#e9e3ea]" />
        </div>

        {view === "sign-in" ? (
          <LoginForm
            onRegister={() => setView("register")}
            onAuthenticated={onAuthenticated}
          />
        ) : (
          <RegisterForm
            onSignIn={() => setView("sign-in")}
            onAuthenticated={onAuthenticated}
          />
        )}
      </section>
    </div>
  )
}
