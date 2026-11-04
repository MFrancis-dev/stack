/**
 * Root layout.
 * Roadmap: K6.1
 * Status: scaffold — not implemented yet.
 */

import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Stack", description: "Save into BTC, ETH or NEAR on autopilot, into an address you own." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
