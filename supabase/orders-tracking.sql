-- Records whether each order's tracking has been uploaded to PayPal (src/lib/tracking.ts).
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

alter table orders
  add column if not exists paypal_tracking_status text,          -- status last uploaded: SHIPPED | DELIVERED
  add column if not exists paypal_tracking_uploaded_at timestamptz,
  add column if not exists paypal_tracking_error text;           -- last upload error, cleared on success
