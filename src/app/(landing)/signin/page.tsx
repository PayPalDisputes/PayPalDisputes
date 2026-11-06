import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { footer } from "@/data/site";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · Sira" };

const ERRORS: Record<string, string> = {
  cancelled: "PayPal sign-in was cancelled. Try again whenever you're ready.",
  expired: "That sign-in link expired. Please try again.",
  paypal: "We couldn't confirm your PayPal account. Please try again.",
  no_store: "This PayPal account isn't connected to a Sira store yet. Try the demo to look around.",
};

const CAN = ["Read your open disputes and messages", "Read the transactions they belong to", "Submit responses you have approved"];

/**
 * The way into the app, in the landing page's shell and type: every entry point on the landing page
 * comes here. Log in with PayPal, or try the demo. It still shows for a demo session, so a visitor
 * chooses each time. Only a real PayPal login skips it and goes straight to the dashboard.
 */
export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const session = await getSession();
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  if (session?.kind === "seller" && !message) redirect("/dashboard");

  return (
    <div className="theme-app flex min-h-[calc(100dvh-1px)] items-center justify-center bg-white px-5 pt-28 pb-20 text-fg">
      {/* font-sans here: .theme-app sets the dashboard's Inter, this page uses the landing's Geist. */}
      <div className="w-full max-w-[440px] font-sans font-normal">
        <div className="rounded-[20px] border border-line bg-canvas px-8 py-9 shadow-[0_1px_2px_rgba(30,30,42,0.06),0_24px_60px_-16px_rgba(30,30,42,0.16)]">
          <p className="font-mono text-[11px] tracking-[0.08em] text-info uppercase">Welcome back</p>
          <h1 className="mt-2.5 text-[30px] leading-tight font-medium tracking-[-0.02em] text-fg">Sign in to Sira</h1>
          <p className="mt-2.5 text-[15px] leading-6 text-fg-body">
            Use your PayPal business account. You sign in on PayPal&apos;s own page, so Sira never sees your password.
          </p>

          {message && (
            <p role="alert" className="mt-5 rounded-[10px] bg-bad-bg px-4 py-3 text-[14px] leading-[21px] text-bad">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            {/* Plain links: these routes start a sign-in or set a cookie, so they must never be prefetched. */}
            <a
              href="/api/auth/paypal/login"
              className="inline-flex h-[50px] items-center justify-center gap-1.5 rounded-md bg-[#ffc439] text-[16px] text-[#111] hover:bg-[#f2ba36]"
            >
              Log in with
              <span className="font-bold italic">
                <span className="text-[#003087]">Pay</span>
                <span className="text-[#009cde]">Pal</span>
              </span>
            </a>
            <div className="my-2.5 flex items-center gap-3 text-[13px] text-fg-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <a
              href="/api/auth/demo"
              className="inline-flex h-12 items-center justify-center rounded-md border border-line-strong text-[15px] font-medium text-fg hover:bg-muted"
            >
              Try the demo instead
            </a>
            <p className="mt-1 text-center text-[13px] text-fg-muted">Sample stores. Nothing is sent to PayPal.</p>
          </div>

          <div className="mt-7 border-t border-line pt-5">
            <p className="text-[14px] font-medium text-fg">When you connect, Sira can</p>
            <ul className="mt-3 space-y-2.5 text-[14px] text-fg-body">
              {CAN.map((c) => (
                <li key={c} className="flex items-center gap-2.5">
                  <Check aria-hidden strokeWidth={2.5} className="size-4 shrink-0 text-ok" />
                  {c}
                </li>
              ))}
              <li className="flex items-center gap-2.5">
                <X aria-hidden strokeWidth={2.5} className="size-4 shrink-0 text-bad" />
                Never move money without your approval
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-5 px-2 text-center text-[13px] leading-5 text-fg-muted">
          By continuing you agree to the{" "}
          {footer.legal.map((l, i) => (
            <span key={l.label}>
              {i > 0 && " and "}
              <Link href={l.href} className="text-info underline-offset-2 hover:underline">
                {l.label === "Terms" ? "Terms" : "Privacy policy"}
              </Link>
            </span>
          ))}
          .
        </p>
      </div>
    </div>
  );
}
