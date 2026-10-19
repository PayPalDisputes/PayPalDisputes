import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · Kaleshi" };

const ERRORS: Record<string, string> = {
  cancelled: "PayPal sign-in was cancelled. Try again whenever you're ready.",
  expired: "That sign-in link expired. Please try again.",
  paypal: "We couldn't confirm your PayPal account. Please try again.",
  no_store: "This PayPal account isn't connected to a Kaleshi store yet. Try the demo to look around.",
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  if (await getSession()) redirect("/dashboard");
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-20 sm:py-28">
      <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-fg">Sign in to Kaleshi</h1>
      <p className="mt-3 text-[15px] leading-6 text-fg-body">
        Use your PayPal business account. You sign in on PayPal&apos;s own page, so Kaleshi never sees your password.
      </p>

      {message && (
        <p role="alert" className="mt-6 rounded-xl border border-line bg-canvas px-4 py-3 text-[14px] text-fg-heading">
          {message}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {/* prefetch off: these hit route handlers that start a sign-in, so hovering mustn't trigger them. */}
        <Button href="/api/auth/paypal/login" prefetch={false} size="lg" className="w-full">
          Log in with PayPal
        </Button>
        <Button href="/api/auth/demo" prefetch={false} variant="secondary" size="lg" className="w-full">
          Try the demo
        </Button>
      </div>

      <p className="mt-6 text-[13px] leading-5 text-fg-muted">
        The demo shows sample stores in demo mode: you can try every step, and nothing is sent to PayPal.
      </p>
    </div>
  );
}
