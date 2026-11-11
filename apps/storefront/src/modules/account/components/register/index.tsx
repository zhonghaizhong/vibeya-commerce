"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import TurnstileField from "@modules/account/components/turnstile"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  if (message?.state === "verification_required") {
    return (
      <div
        className="max-w-sm flex flex-col items-center"
        data-testid="register-page"
      >
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl font-semibold text-green-700"
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 className="text-large-semi uppercase mb-3 text-center">
          Check your email
        </h1>
        <p className="text-center text-base-regular text-ui-fg-base mb-5">
          Your account is almost ready. We sent a verification link to:
        </p>
        <div
          className="w-full rounded-rounded border border-green-200 bg-green-50 p-4 text-center"
          data-testid="register-verification-message"
          role="status"
          aria-live="polite"
        >
          <p className="break-all font-semibold text-ui-fg-base">
            {message.email}
          </p>
          <p className="mt-2 text-sm text-ui-fg-subtle">
            Open the email and click its verification link. You can sign in after
            your email is verified.
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-ui-fg-subtle">
          Didn’t receive it? Check your spam folder and make sure the address is
          correct.
        </p>
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="mt-6 w-full rounded-md bg-ui-button-inverted px-4 py-3 text-sm font-medium text-ui-fg-on-color"
        >
          Go to sign in
        </button>
      </div>
    )
  }

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        Create your VIBEYA account
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        Save your details to make future orders easier to track and manage.
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="First name"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="Last name"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Password"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <TurnstileField resetKey={message?.state === "error" ? message.error : ""} />
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          By creating an account, you agree to VIBEYA&apos;s{" "}
          <LocalizedClientLink href="/privacy" className="underline">
            Privacy Policy
          </LocalizedClientLink>{" "}
          and{" "}
          <LocalizedClientLink href="/terms" className="underline">
            Terms of Use
          </LocalizedClientLink>
          .
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          Join
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        Already a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          Sign in
        </button>
        .
      </span>
    </div>
  )
}

export default Register
