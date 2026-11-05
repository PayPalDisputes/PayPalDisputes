// The kinds of easy claim (see src/lib/easy-claims.ts), kept apart so the Settings page can list them.

export type EasyClaimKind = "delivered" | "already_refunded" | "in_transit";

export const EASY_CLAIM_KINDS: Record<EasyClaimKind, string> = {
  delivered: "Item not received or unauthorised, and tracking shows delivery to the PayPal address",
  already_refunded: "The buyer was already refunded, and the refund ID is in the Notes column on Shipping proof",
  in_transit: "Item not received, but the parcel is on its way with time to arrive",
};
