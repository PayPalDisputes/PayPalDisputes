/**
 * Sample history (scripts/seed-history.ts): past, resolved disputes that never existed in PayPal,
 * so the insights have months of history to show. Their ids, and their orders' transaction ids,
 * start with SAMPLE- so they can never be sent to PayPal or mistaken for real cases.
 */
export const SAMPLE_PREFIX = "SAMPLE-";

export const isSample = (id: string | null | undefined) => !!id?.startsWith(SAMPLE_PREFIX);
