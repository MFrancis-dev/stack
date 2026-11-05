"use client";

/**
 * Always-visible buying status with one-tap pause / resume (K6.4). Pause needs no deposit;
 * resume needs a full-access signature (1 yocto) and a complete plan.
 * Roadmap: K6.4
 */

import { useState } from "react";
import { pauseTx, resumeTx } from "@/lib/client/ownerTx";
import { useVault } from "@/lib/client/hooks";
import { useWallet } from "@/components/wallet/WalletProvider";

export function PauseButton() {
  const vault = useVault();
  const { send, busy } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const v = vault.data;
  if (!v?.signedIn || !v.vaultAccountId || !v.state) return null;
  const hasPlan = !!v.state.targetAsset;
  const paused = v.state.paused;
  const vaultId = v.vaultAccountId;

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 text-sm font-bold" aria-live="polite">
        <span aria-hidden className={`size-2.5 rounded-full ${paused ? "bg-sage" : "bg-moss"}`} />
        {paused ? "Paused" : "Buying"}
      </span>
      {hasPlan ? (
        <button
          className="min-h-9 rounded-md px-3 text-sm font-bold bg-surface ring-1 ring-inset ring-mist hover:bg-paper-deep disabled:text-sage"
          disabled={busy}
          onClick={() => {
            setError(null);
            send(paused ? resumeTx(vaultId) : pauseTx(vaultId)).catch((e) => setError(e instanceof Error ? e.message : "Not sent"));
          }}
        >
          {busy ? "Confirm in wallet…" : paused ? "Resume" : "Pause"}
        </button>
      ) : null}
      {error ? <span className="sr-only">{error}</span> : null}
    </div>
  );
}
