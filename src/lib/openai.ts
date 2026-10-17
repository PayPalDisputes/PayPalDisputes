import OpenAI from "openai";

let client: OpenAI | null = null;

/** Server-only OpenAI client. Never import this from client components. */
export function openai(): OpenAI {
  if (client) return client;

  const { OPENAI_API_KEY } = process.env;
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing from environment");

  client = new OpenAI({ apiKey: OPENAI_API_KEY });
  return client;
}

/**
 * Model tiers, set per environment so we can swap models without a code change.
 * cheap: high-volume work (triage, summaries). smart: decisions and drafted responses.
 */
export const MODELS = {
  cheap: process.env.OPENAI_MODEL_CHEAP || "gpt-5.4-nano",
  smart: process.env.OPENAI_MODEL_SMART || "gpt-6-luna", // 17/17 on eval v6 vs 94.1% for gpt-5.4-mini, ~6x cheaper
} as const;
export type ModelTier = keyof typeof MODELS;
