import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// "Log in with PayPal". The seller signs in on PayPal's own page (we never see their password),
// PayPal sends back a one-time code, and we use it once to learn which PayPal account it is.
// The sandbox's userinfo endpoint won't identify business accounts, so we read the account id from
// the seller's own balance report instead (falling back to transaction search). The seller's token
// is used for that one lookup and then dropped; nothing from PayPal is stored.

const API_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
const WEB_BASE = API_BASE.includes("sandbox") ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
const SCOPES = "openid email profile https://uri.paypal.com/services/paypalattributes";

export const callbackPath = "/api/auth/paypal/callback";
/** Cookie holding the random state between the login redirect and the callback. */
export const STATE_COOKIE = "kaleshi_login_state";

export function authorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    flowEntry: "static",
    response_type: "code",
    client_id: process.env.PAYPAL_CLIENT_ID ?? "",
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${WEB_BASE}/signin/authorize?${params.toString().replace(/\+/g, "%20")}`;
}

/** Exchanges the one-time code and returns the PayPal merchant (account) id of whoever signed in. */
export async function merchantIdFromCode(code: string): Promise<string | null> {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const tokenRes = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  });
  if (!tokenRes.ok) return null;
  const { access_token: userToken } = (await tokenRes.json()) as { access_token?: string };
  if (!userToken) return null;
  const headers = { Authorization: `Bearer ${userToken}` };

  const balances = await fetch(`${API_BASE}/v1/reporting/balances?currency_code=USD`, { headers });
  if (balances.ok) {
    const { account_id } = (await balances.json()) as { account_id?: string };
    if (account_id) return account_id;
  }
  const iso = (d: Date) => `${d.toISOString().slice(0, 19)}Z`;
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86_400_000);
  const tx = await fetch(`${API_BASE}/v1/reporting/transactions?start_date=${iso(start)}&end_date=${iso(end)}&page_size=1`, { headers });
  if (tx.ok) {
    const { account_number } = (await tx.json()) as { account_number?: string };
    if (account_number) return account_number;
  }
  return null;
}

/** The Kaleshi seller for a PayPal merchant id, if one exists. */
export async function sellerForMerchant(merchantId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabaseAdmin().from("sellers").select("id, name").eq("paypal_merchant_id", merchantId).maybeSingle();
  if (error) throw error;
  return data;
}
