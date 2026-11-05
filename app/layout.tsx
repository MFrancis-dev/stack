/**
 * Root layout: fonts, tokens, providers.
 * Roadmap: K6.1
 */

import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

const DESCRIPTION =
  "Stack buys Bitcoin, Ether or NEAR for you every week, skips the weeks when fees run high, and sends the coins to your own wallet.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Stack: savings on a schedule",
  description: DESCRIPTION,
  openGraph: { title: "Stack: savings on a schedule", description: DESCRIPTION, siteName: "Stack", type: "website" },
  twitter: { card: "summary_large_image", title: "Stack: savings on a schedule", description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#f3f5f2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${atkinson.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
