import { cookies } from "next/headers";
import { merchantIdFromCode, sellerForMerchant, STATE_COOKIE } from "@/lib/paypal-login";
import { createSession } from "@/lib/session";

/** PayPal sends the seller back here after they log in; we work out which seller it is and sign them in. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (path: string) => Response.redirect(new URL(path, url.origin), 303);

  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/api/auth/paypal" });

  if (url.searchParams.get("error")) return back("/signin?error=cancelled");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return back("/signin?error=expired");

  let merchantId: string | null = null;
  try {
    merchantId = await merchantIdFromCode(code);
  } catch (err) {
    console.error("[login] PayPal lookup failed", err);
  }
  if (!merchantId) return back("/signin?error=paypal");

  const seller = await sellerForMerchant(merchantId);
  if (!seller) return back("/signin?error=no_store");

  await createSession({ kind: "seller", sellerId: seller.id, name: seller.name });
  return back("/dashboard");
}
