"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { posthogKey, posthogHost, isPosthogConfigured } from "@/lib/config";

let initialized = false;

export function initPosthog() {
  if (initialized || !isPosthogConfigured || typeof window === "undefined") {
    return;
  }
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

// Safe capture wrapper — a no-op if PostHog isn't configured, so the app
// never breaks when the key is absent.
export function capture(event: string, properties?: Record<string, unknown>) {
  if (!isPosthogConfigured || typeof window === "undefined") return;
  initPosthog();
  posthog.capture(event, properties);
}

export function identify(id: string, properties?: Record<string, unknown>) {
  if (!isPosthogConfigured || typeof window === "undefined") return;
  initPosthog();
  posthog.identify(id, properties);
}

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPosthog();
  }, []);
  return <>{children}</>;
}
