// Deterministic CMA generator. Given a property address string, it always
// produces the same plausible-looking analysis, so the app works end-to-end
// with NO external API key. If you later wire in an LLM or a real comps API,
// this is the single function to swap out.

export interface Comparable {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  pricePerSqft: number;
  soldDaysAgo: number;
}

export interface GeneratedCMA {
  subjectAddress: string;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  estimatedValueMid: number;
  pricePerSqft: number;
  subjectSqft: number;
  subjectBeds: number;
  subjectBaths: number;
  comparables: Comparable[];
  marketNote: string;
}

// Small, fast string hash (FNV-1a) so output is deterministic per address.
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Seeded pseudo-random generator (mulberry32).
function seeded(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREET_NAMES = [
  "Magnolia", "Saguaro", "Live Oak", "Bayshore", "Camelback",
  "Palmetto", "Heron", "Mockingbird", "Sabal Palm", "Sunbelt",
];

function money(n: number): number {
  return Math.round(n / 1000) * 1000;
}

export function generateCMA(rawAddress: string): GeneratedCMA {
  const address = rawAddress.trim();
  const rng = seeded(hash(address.toLowerCase()));

  const subjectSqft = money(1500 + Math.floor(rng() * 2200));
  const subjectBeds = 2 + Math.floor(rng() * 4); // 2-5
  const subjectBaths = 1 + Math.floor(rng() * 4); // 1-4
  const basePsf = 185 + Math.floor(rng() * 215); // $185-$400 / sqft (Sun Belt range)

  const midValue = money(subjectSqft * basePsf);
  const spread = 0.04 + rng() * 0.05; // 4-9% band
  const low = money(midValue * (1 - spread));
  const high = money(midValue * (1 + spread));

  const usedStreets = new Set<number>();
  const comparables: Comparable[] = [];
  const compCount = 3 + Math.floor(rng() * 2); // 3 or 4 comps

  for (let i = 0; i < compCount; i++) {
    let streetIdx = Math.floor(rng() * STREET_NAMES.length);
    while (usedStreets.has(streetIdx)) {
      streetIdx = (streetIdx + 1) % STREET_NAMES.length;
    }
    usedStreets.add(streetIdx);

    const sqft = money(subjectSqft * (0.85 + rng() * 0.3));
    const psf = Math.round(basePsf * (0.9 + rng() * 0.2));
    const price = money(sqft * psf);
    const num = 100 + Math.floor(rng() * 9800);

    comparables.push({
      address: `${num} ${STREET_NAMES[streetIdx]} ${rng() > 0.5 ? "Dr" : "Ln"}`,
      price,
      beds: Math.max(1, subjectBeds + (rng() > 0.5 ? 0 : -1)),
      baths: Math.max(1, subjectBaths + (rng() > 0.6 ? 1 : 0)),
      sqft,
      pricePerSqft: psf,
      soldDaysAgo: 7 + Math.floor(rng() * 120),
    });
  }

  const marketNotes = [
    "Inventory remains tight in this submarket; well-priced listings are moving in under three weeks.",
    "Days-on-market has ticked up slightly quarter-over-quarter — price competitively to capture early interest.",
    "Buyer demand is steady at this price band, with the strongest activity for move-in-ready homes.",
    "Comparable sales suggest pricing at the midpoint, then revisiting after the first ten showings.",
  ];

  return {
    subjectAddress: address,
    estimatedValueLow: low,
    estimatedValueHigh: high,
    estimatedValueMid: midValue,
    pricePerSqft: basePsf,
    subjectSqft,
    subjectBeds,
    subjectBaths,
    comparables,
    marketNote: marketNotes[Math.floor(rng() * marketNotes.length)],
  };
}

export function generateListingCopy(cma: GeneratedCMA): string {
  const { subjectBeds, subjectBaths, subjectSqft, subjectAddress } = cma;
  return (
    `Welcome to ${subjectAddress} — a beautifully maintained ${subjectBeds}-bedroom, ` +
    `${subjectBaths}-bath residence offering ${subjectSqft.toLocaleString()} square feet ` +
    `of comfortable Sun Belt living. Sun-filled open-concept spaces flow effortlessly to ` +
    `an outdoor entertaining area, while the kitchen anchors the home with generous counter ` +
    `space and modern finishes. Situated in an established, high-demand neighborhood with ` +
    `quick access to schools, dining, and major commuter routes, this home is priced to ` +
    `reflect strong recent comparable sales. Schedule your private showing today — homes ` +
    `in this segment are not staying on the market long.`
  );
}

// Truncated/safe identifier for analytics — never send a full raw address.
export function addressTag(address: string): string {
  const h = hash(address.toLowerCase()).toString(16);
  return `addr_${h.slice(0, 8)}`;
}
