"use client";

/** "Sign in with NEAR" as a plain link-style control for the public pages. Roadmap: K6.1 */

import { useRouter } from "next/navigation";
import { useWallet } from "@/components/wallet/WalletProvider";

export function NavSignIn({ next = "/dashboard" }: { next?: string }) {
  const { signIn, busy, error } = useWallet();
  const router = useRouter();
  return (
    <span style={{ display: "inline-grid", gap: 6 }}>
      <button
        type="button"
        className="lp-link"
        onClick={() =>
          signIn()
            .then(() => router.push(next))
            .catch(() => undefined)
        }
        disabled={busy}
      >
        {busy ? "Waiting for your wallet…" : "Sign in with NEAR"}
      </button>
      {error ? (
        <span role="alert" style={{ fontSize: 15 }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
