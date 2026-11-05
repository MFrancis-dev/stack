"use client";

/**
 * Signed-in shell: brand, sections, always-visible buying status (K6.4), sign out.
 * Shows sign-in or "create your vault" instead of the page when those come first.
 * Roadmap: K6.1, K6.4, K6.8
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PauseButton } from "@/components/plan/PauseButton";
import { CreateVault } from "@/components/vault/CreateVault";
import { DemoBanner } from "@/components/vault/DemoBanner";
import { SignInButton } from "@/components/wallet/SignInButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useVault } from "@/lib/client/hooks";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/fund", label: "Add funds" },
  { href: "/plan", label: "Plan" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const vault = useVault();
  const { signOut } = useWallet();
  const v = vault.data;

  let body: ReactNode = children;
  if (vault.isPending) body = <p className="text-sage">Loading your vault…</p>;
  else if (vault.isError) body = <Notice tone="error">{vault.error.message}</Notice>;
  else if (v && !v.signedIn)
    body = (
      <div className="grid max-w-md gap-4">
        <h1 className="text-2xl font-bold">Sign in to see your vault</h1>
        <SignInButton next={path} />
      </div>
    );
  else if (v?.signedIn && !v.vaultAccountId) body = <CreateVault />;

  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
          <span aria-hidden className="block h-2.5 w-6 rounded-full bg-brass" />
          Stack
        </Link>
        <div className="flex items-center gap-4">
          <PauseButton />
          {v?.signedIn ? (
            <Button variant="quiet" className="min-h-9 text-sm" onClick={() => signOut().catch(() => undefined)}>
              Sign out
            </Button>
          ) : null}
        </div>
      </header>
      {v?.signedIn && v.demo ? <DemoBanner /> : null}
      <nav aria-label="Sections" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="flex gap-1 border-b border-mist">
          {NAV.map((n) => {
            const active = path === n.href;
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`block whitespace-nowrap px-3 py-3 text-[15px] font-bold ${active ? "border-b-2 border-ink text-ink" : "text-sage hover:text-ink"}`}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="py-10">{body}</main>
    </div>
  );
}
