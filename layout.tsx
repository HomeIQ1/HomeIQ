import type { Metadata } from "next";
import "./globals.css";
import { PosthogProvider } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "HomeIQ AI — Instant CMAs for real estate agents",
  description:
    "Type an address, get a complete CMA, listing copy, and a client-ready presentation in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PosthogProvider>{children}</PosthogProvider>
      </body>
    </html>
  );
}
