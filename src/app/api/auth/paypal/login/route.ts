import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { authorizeUrl, callbackPath, STATE_COOKIE } from "@/lib/paypal-login";

/** Starts "Log in with PayPal": remembers a random state (so the callback can't be forged) and sends the seller to PayPal. */
export async function GET(request: Request) {
  const state = randomBytes(16).toString("hex");
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/paypal",
    maxAge: 600,
  });
  const redirectUri = process.env.PAYPAL_LOGIN_REDIRECT_URI ?? new URL(callbackPath, request.url).toString();
  return Response.redirect(authorizeUrl(redirectUri, state), 302);
}
