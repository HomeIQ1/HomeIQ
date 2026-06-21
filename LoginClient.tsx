"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { capture, identify } from "@/lib/analytics";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("mode") === "signup") setMode("signup");
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        // Custom analytics event #2
        identify(email, { email });
        capture("user_signed_up", { method: "email" });
        if (data.needsConfirmation) {
          setNotice(
            "Check your email to confirm your account, then sign in."
          );
          setMode("signin");
          setLoading(false);
          return;
        }
      } else {
        identify(email, { email });
        capture("user_signed_in", { method: "email" });
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }} className="fade-up">
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            textDecoration: "none",
            color: "var(--ink)",
            marginBottom: 32,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="var(--ink)" />
            <path d="M14 6l6 5v9a1 1 0 01-1 1h-3v-5h-4v5H9a1 1 0 01-1-1v-9l6-5z" fill="var(--signal)" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 17 }}>
            HomeIQ<span style={{ color: "var(--signal)" }}> AI</span>
          </span>
        </Link>

        <h1 className="font-display" style={{ fontSize: 30, margin: "0 0 6px", fontWeight: 700 }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "0 0 28px" }}>
          {mode === "signup"
            ? "Start with 3 free CMAs every month."
            : "Sign in to your HomeIQ workspace."}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@brokerage.com"
            style={inputStyle}
            autoComplete="email"
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={inputStyle}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />

          {error && (
            <div style={messageStyle("error")}>{error}</div>
          )}
          {notice && (
            <div style={messageStyle("notice")}>{notice}</div>
          )}

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading
              ? "Working…"
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 22 }}>
          {mode === "signup" ? "Already have an account?" : "New to HomeIQ?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError(null);
              setNotice(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--signal-deep)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
            }}
          >
            {mode === "signup" ? "Sign in" : "Create one free"}
          </button>
        </p>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 7,
  marginTop: 16,
  color: "var(--ink)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 15,
  border: "1px solid var(--line)",
  borderRadius: 10,
  background: "var(--paper-card)",
  color: "var(--ink)",
};

function submitStyle(loading: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 24,
    padding: "13px",
    fontSize: 15,
    fontWeight: 600,
    color: "white",
    background: "var(--ink)",
    border: "none",
    borderRadius: 10,
    cursor: loading ? "wait" : "pointer",
    opacity: loading ? 0.7 : 1,
  };
}

function messageStyle(kind: "error" | "notice"): React.CSSProperties {
  return {
    marginTop: 16,
    padding: "10px 13px",
    borderRadius: 9,
    fontSize: 13.5,
    background: kind === "error" ? "rgba(201,52,52,0.08)" : "rgba(74,124,111,0.1)",
    color: kind === "error" ? "#b13030" : "var(--sage)",
    border: `1px solid ${kind === "error" ? "rgba(201,52,52,0.2)" : "rgba(74,124,111,0.25)"}`,
  };
}
