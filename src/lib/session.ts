import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

// Stateless sessions in a signed cookie (Next.js authentication guide). The cookie holds only
// which seller this is (or that it's the demo), never PayPal tokens or personal details.

/** demoId is random per demo sign-in, so each demo visitor gets their own private chat history. */
export type Session = { kind: "seller"; sellerId: string; name: string } | { kind: "demo"; demoId: string };

const COOKIE = "sira_session";
const MAX_AGE = 7 * 24 * 60 * 60; // seconds

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET missing or shorter than 32 characters");
  return new TextEncoder().encode(secret);
}

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent on the redirect back from PayPal's login page
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

/** The current session, or null if signed out (or the cookie is invalid or expired). Memoised per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.kind === "demo") return { kind: "demo", demoId: typeof payload.demoId === "string" ? payload.demoId : "shared" };
    if (payload.kind === "seller" && typeof payload.sellerId === "string") {
      return { kind: "seller", sellerId: payload.sellerId, name: String(payload.name ?? "") };
    }
    return null;
  } catch {
    return null;
  }
});
