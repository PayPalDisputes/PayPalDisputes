import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · Sira" };

const ERRORS: Record<string, string> = {
  cancelled: "PayPal sign-in was cancelled. Try again whenever you're ready.",
  expired: "That sign-in link expired. Please try again.",
  paypal: "We couldn't confirm your PayPal account. Please try again.",
  no_store: "This PayPal account isn't connected to a Sira store yet. Try the demo to look around.",
};

/**
 * Sign in (Mock 2 look, in the landing page's shell). It never bounces a signed-in visitor away:
 * they see who they're signed in as, so they can switch from the demo to their own PayPal account,
 * and any PayPal error still shows.
 */
export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const session = await getSession();
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  const signedInAs = session ? (session.kind === "seller" ? session.name : "the demo account") : null;

  return (
    <div className="theme-app flex min-h-[calc(100dvh-1px)] items-start justify-center bg-subtle px-5 pt-32 pb-20 text-fg">
      <div className="w-full max-w-[420px]">
        <div className="rounded-xl border border-line bg-canvas px-7 py-8 shadow-[0_8px_30px_rgba(30,30,42,0.04)]">
          <h1 className="text-[26px] font-[480] tracking-[0.01em] text-fg">{signedInAs ? "You're signed in" : "Sign in to Sira"}</h1>
          <p className="mt-2 text-[15px] leading-6 text-fg-body">
            {signedInAs ? (
              <>
                You&apos;re using Sira as <span className="font-medium text-fg">{signedInAs}</span>.
                {session?.kind === "demo" && " Log in with PayPal to switch to your own store."}
              </>
            ) : (
              <>Use your PayPal business account. You sign in on PayPal&apos;s own page, so Sira never sees your password.</>
            )}
          </p>

          {message && (
            <p role="alert" className="mt-5 rounded-[10px] bg-bad-bg px-4 py-3 text-[14px] leading-[21px] text-bad">
              {message}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-2.5">
            {signedInAs && (
              <Link href="/dashboard" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent text-[15px] font-medium text-white hover:bg-[#0062c4]">
                Go to dashboard <ArrowRight aria-hidden strokeWidth={1.8} className="size-4" />
              </Link>
            )}
            {session?.kind !== "seller" && (
              // Plain links: these routes start a sign-in or set a cookie, so they must never be prefetched.
              <a
                href="/api/auth/paypal/login"
                className={
                  signedInAs
                    ? "inline-flex h-11 items-center justify-center rounded-full bg-muted text-[15px] text-fg hover:bg-inset"
                    : "inline-flex h-11 items-center justify-center rounded-full bg-accent text-[15px] font-medium text-white hover:bg-[#0062c4]"
                }
              >
                Log in with PayPal
              </a>
            )}
            {!signedInAs && (
              <a href="/api/auth/demo" className="inline-flex h-11 items-center justify-center rounded-full bg-muted text-[15px] text-fg hover:bg-inset">
                Try the demo
              </a>
            )}
            {signedInAs && (
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="h-10 w-full rounded-full text-[14px] text-fg-body hover:bg-muted hover:text-fg">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-5 px-2 text-center text-[13px] leading-5 text-fg-muted">
          {signedInAs
            ? "Signing out ends this session on this browser only."
            : "The demo has sample stores in demo mode: try every step, and nothing is sent to PayPal."}
        </p>
      </div>
    </div>
  );
}
