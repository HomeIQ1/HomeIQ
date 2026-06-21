// Optional LLM enrichment for CMAs.
//
// Design choice: the NUMBERS (value range, comps, price/sqft) stay in the
// deterministic generator in cma.ts. We do NOT ask an LLM to invent property
// prices — that would reintroduce exactly the mispricing risk the product is
// supposed to remove. Instead, the LLM does what it's genuinely good at:
// writing the market commentary and the client-ready listing description,
// grounded in the figures we computed.
//
// If ANTHROPIC_API_KEY is absent, or the call fails for any reason, callers
// fall back to the deterministic text from cma.ts. The app therefore always
// works, with or without a key.

import { anthropicApiKey, isLlmConfigured } from "./config";
import type { GeneratedCMA } from "./cma";

const MODEL = "claude-sonnet-4-6";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

interface EnrichedText {
  marketNote: string;
  listingCopy: string;
}

function buildPrompt(cma: GeneratedCMA): string {
  const comps = cma.comparables
    .map(
      (c) =>
        `- ${c.address}: $${c.price.toLocaleString()}, ${c.beds}bd/${c.baths}ba, ` +
        `${c.sqft.toLocaleString()} sqft ($${c.pricePerSqft}/sqft), sold ${c.soldDaysAgo} days ago`
    )
    .join("\n");

  return (
    `You are a residential real-estate pricing analyst and listing copywriter ` +
    `working for an agent. Using ONLY the figures below, write two things. Do ` +
    `not invent or change any numbers.\n\n` +
    `Subject property: ${cma.subjectAddress}\n` +
    `Estimated value: $${cma.estimatedValueLow.toLocaleString()} - ` +
    `$${cma.estimatedValueHigh.toLocaleString()} (midpoint ` +
    `$${cma.estimatedValueMid.toLocaleString()})\n` +
    `Size: ${cma.subjectSqft.toLocaleString()} sqft, ${cma.subjectBeds} bed, ` +
    `${cma.subjectBaths} bath, ~$${cma.pricePerSqft}/sqft\n` +
    `Comparable sales:\n${comps}\n\n` +
    `Return STRICT JSON only, no markdown, no preamble, in exactly this shape:\n` +
    `{"marketNote":"<2-3 sentence pricing rationale referencing the comps and ` +
    `a suggested pricing strategy>","listingCopy":"<a polished, professional ` +
    `MLS-style listing description of 90-130 words, no fabricated amenities ` +
    `beyond bed/bath/size, no fair-housing-sensitive language>"}`
  );
}

export async function enrichWithLlm(
  cma: GeneratedCMA
): Promise<EnrichedText | null> {
  if (!isLlmConfigured) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: "user", content: buildPrompt(cma) }],
      }),
      // Don't let a slow LLM hang the request; fall back instead.
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text: string = (data.content ?? [])
      .map((b: { type: string; text?: string }) =>
        b.type === "text" ? b.text ?? "" : ""
      )
      .join("")
      .trim();

    // Strip accidental code fences, then parse.
    const clean = text.replace(/^```json\s*/i, "").replace(/```$/g, "").trim();
    const parsed = JSON.parse(clean) as Partial<EnrichedText>;

    if (
      typeof parsed.marketNote === "string" &&
      typeof parsed.listingCopy === "string" &&
      parsed.marketNote.length > 0 &&
      parsed.listingCopy.length > 0
    ) {
      return {
        marketNote: parsed.marketNote,
        listingCopy: parsed.listingCopy,
      };
    }
    return null;
  } catch {
    // Network error, timeout, bad JSON — fall back silently.
    return null;
  }
}
