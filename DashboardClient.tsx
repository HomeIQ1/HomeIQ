"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { capture, identify } from "@/lib/analytics";
import type { GeneratedCMA } from "@/lib/cma";

interface CMARecord {
  id: string;
  property_address: string;
  generated_cma: string;
  listing_copy: string;
  created_at: string;
}

export default function DashboardClient({
  email,
  initialCmas,
}: {
  email: string;
  initialCmas: CMARecord[];
}) {
  const router = useRouter();
  const [cmas, setCmas] = useState<CMARecord[]>(initialCmas);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(
    initialCmas[0]?.id ?? null
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (address.trim().length < 5) {
      setError("Enter a full property address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate CMA.");
        setLoading(false);
        return;
      }
      const record: CMARecord = data.cma;
      setCmas((prev) => [record, ...prev]);
      setActiveId(record.id);
      setAddress("");

      // Custom analytics event #1 — never send the raw address.
      identify(email, { email });
      capture("cma_generated", {
        address_tag: tagOf(record.property_address),
        total_cmas: cmas.length + 1,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const prev = cmas;
    setCmas((c) => c.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
    try {
      const res = await fetch(`/api/cmas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setCmas(prev); // roll back
        return;
      }
      capture("cma_deleted", { cma_id: id });
    } catch {
      setCmas(prev);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    capture("user_signed_out");
    router.push("/");
    router.refresh();
  }

  const active = cmas.find((c) => c.id === activeId) ?? null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          background: "var(--paper-card)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="var(--ink)" />
              <path d="M14 6l6 5v9a1 1 0 01-1 1h-3v-5h-4v5H9a1 1 0 01-1-1v-9l6-5z" fill="var(--signal)" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              HomeIQ<span style={{ color: "var(--signal)" }}> AI</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13.5, color: "var(--muted)" }}>{email}</span>
            <button
              onClick={handleSignOut}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--ink)",
                background: "none",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "7px 14px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "32px 24px",
          width: "100%",
          flex: 1,
        }}
      >
        {/* Generate bar */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="font-display" style={{ fontSize: 26, margin: "0 0 4px", fontWeight: 700 }}>
            New analysis
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "0 0 16px" }}>
            Enter a property address to generate a CMA, comparables, and listing copy.
          </p>
          <form onSubmit={handleGenerate} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 4821 Magnolia Dr, Tampa, FL 33609"
              style={{
                flex: 1,
                minWidth: 280,
                padding: "13px 16px",
                fontSize: 15,
                border: "1px solid var(--line)",
                borderRadius: 10,
                background: "var(--paper-card)",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px 24px",
                fontSize: 15,
                fontWeight: 600,
                color: "white",
                background: loading ? "var(--ink-soft)" : "var(--ink)",
                border: "none",
                borderRadius: 10,
                cursor: loading ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "Generating…" : "Generate CMA"}
            </button>
          </form>
          {error && (
            <div style={{ marginTop: 12, color: "#b13030", fontSize: 13.5 }}>{error}</div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 24,
            alignItems: "start",
          }}
          className="dash-grid"
        >
          {/* Saved list */}
          <aside>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted)",
                marginBottom: 12,
              }}
            >
              Saved CMAs ({cmas.length})
            </div>
            {cmas.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: 12,
                  padding: "28px 20px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 13.5,
                }}
              >
                No analyses yet. Generate your first CMA above — it will save here
                and stay across sessions.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cmas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    style={{
                      textAlign: "left",
                      background:
                        c.id === activeId ? "var(--ink)" : "var(--paper-card)",
                      color: c.id === activeId ? "white" : "var(--ink)",
                      border: "1px solid var(--line)",
                      borderRadius: 11,
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.property_address}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: c.id === activeId ? "var(--muted-light)" : "var(--muted)",
                        marginTop: 3,
                      }}
                    >
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Detail */}
          <section>
            {active ? (
              <CMADetail record={active} onDelete={() => handleDelete(active.id)} />
            ) : (
              <div
                style={{
                  background: "var(--paper-card)",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  padding: 48,
                  textAlign: "center",
                  color: "var(--muted)",
                }}
              >
                Select a saved CMA, or generate a new one to see the full analysis.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function tagOf(address: string): string {
  let h = 0x811c9dc5;
  const s = address.toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "addr_" + (h >>> 0).toString(16).slice(0, 8);
}

function money(n: number): string {
  return "$" + n.toLocaleString();
}

function CMADetail({
  record,
  onDelete,
}: {
  record: CMARecord;
  onDelete: () => void;
}) {
  let cma: GeneratedCMA | null = null;
  try {
    cma = JSON.parse(record.generated_cma) as GeneratedCMA;
  } catch {
    cma = null;
  }
  if (!cma) return <div>Could not load this analysis.</div>;

  return (
    <div
      style={{
        background: "var(--paper-card)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        overflow: "hidden",
      }}
      className="fade-up"
    >
      {/* Header band */}
      <div style={{ background: "var(--ink)", padding: "24px 28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                color: "var(--muted-light)",
                fontSize: 11.5,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Comparative Market Analysis
            </div>
            <div className="font-display" style={{ color: "white", fontSize: 21, fontWeight: 700 }}>
              {cma.subjectAddress}
            </div>
          </div>
          <button
            onClick={onDelete}
            style={{
              color: "#ffb4b4",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--line-dark)",
              borderRadius: 8,
              padding: "7px 13px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Delete
          </button>
        </div>

        <div style={{ display: "flex", gap: 28, marginTop: 22, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "var(--muted-light)", fontSize: 11.5 }}>Estimated value</div>
            <div className="font-display tnum" style={{ color: "white", fontSize: 28, fontWeight: 700 }}>
              {money(cma.estimatedValueLow)}
              <span style={{ fontSize: 15, color: "var(--muted-light)" }}>
                {" – "}
                {money(cma.estimatedValueHigh)}
              </span>
            </div>
          </div>
          <Stat label="Price / sqft" value={money(cma.pricePerSqft)} />
          <Stat label="Beds / baths" value={`${cma.subjectBeds} / ${cma.subjectBaths}`} />
          <Stat label="Sqft" value={cma.subjectSqft.toLocaleString()} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px" }}>
        <SectionLabel>Comparable properties</SectionLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={thStyle}>Address</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Beds</th>
                <th style={thStyle}>Baths</th>
                <th style={thStyle}>Sqft</th>
                <th style={thStyle}>$/sqft</th>
                <th style={thStyle}>Sold</th>
              </tr>
            </thead>
            <tbody>
              {cma.comparables.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={tdStyle}>{c.address}</td>
                  <td style={{ ...tdStyle }} className="tnum">{money(c.price)}</td>
                  <td style={tdStyle} className="tnum">{c.beds}</td>
                  <td style={tdStyle} className="tnum">{c.baths}</td>
                  <td style={tdStyle} className="tnum">{c.sqft.toLocaleString()}</td>
                  <td style={tdStyle} className="tnum">{money(c.pricePerSqft)}</td>
                  <td style={{ ...tdStyle, color: "var(--muted)" }}>{c.soldDaysAgo}d ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "13px 16px",
            background: "rgba(74,124,111,0.08)",
            border: "1px solid rgba(74,124,111,0.2)",
            borderRadius: 10,
            fontSize: 13.5,
            color: "var(--sage)",
          }}
        >
          {cma.marketNote}
        </div>

        <SectionLabel style={{ marginTop: 26 }}>Client-ready listing copy</SectionLabel>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)", margin: 0 }}>
          {record.listing_copy}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "var(--muted-light)", fontSize: 11.5 }}>{label}</div>
      <div className="font-display tnum" style={{ color: "white", fontSize: 22, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--muted)",
        marginBottom: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0 12px 8px 0",
  fontWeight: 600,
  fontSize: 11.5,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const tdStyle: React.CSSProperties = { padding: "10px 12px 10px 0" };
