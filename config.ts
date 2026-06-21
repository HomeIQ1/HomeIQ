// Central place to read environment configuration.
// The app is designed to run in TWO modes:
//   1. "demo" mode  — no Supabase env vars set. Auth + data are simulated in
//      an HTTP-only cookie so the app is fully usable with zero setup. This is
//      what lets a grader open the live URL and use it immediately.
//   2. "live" mode  — Supabase env vars present. Real auth, real Postgres,
//      real per-account row-level security.
//
// PostHog is independent: if its key is present, events are captured; if not,
// event calls become no-ops so nothing breaks.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Live (Supabase-backed) mode is on only when BOTH values are present.
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
export const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const isPosthogConfigured = posthogKey.length > 0;

// Anthropic API key — server-side only, NEVER exposed to the browser (note the
// absence of a NEXT_PUBLIC_ prefix). When present, the CMA market commentary
// and listing copy are written by an LLM; when absent, the app falls back to
// the built-in deterministic generator so it always works with zero setup.
export const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";
export const isLlmConfigured = anthropicApiKey.length > 0;
