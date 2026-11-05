"use client";

/**
 * A button that sends one owner transaction from the user's wallet and reports the outcome in place.
 * Roadmap: K6.3, K6.4, K6.7
 */

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { OwnerTx as Tx } from "@/lib/client/ownerTx";
import { useWallet } from "./WalletProvider";

export function OwnerTx({
  tx,
  children,
  done,
  variant = "primary",
  disabled,
  onSent,
}: {
  tx: Tx | null;
  children: ReactNode;
  /** Shown after the wallet confirms, e.g. "Paused". */
  done: string;
  variant?: "primary" | "quiet" | "danger";
  disabled?: boolean;
  onSent?: () => void;
}) {
  const { send, busy, error } = useWallet();
  const [sent, setSent] = useState(false);
  return (
    <div className="grid gap-1.5">
      <Button
        variant={variant}
        disabled={!tx || busy || disabled}
        onClick={() =>
          tx &&
          send(tx)
            .then(() => {
              setSent(true);
              onSent?.();
            })
            .catch(() => setSent(false))
        }
      >
        {busy ? "Confirm in your wallet…" : children}
      </Button>
      <p className="min-h-5 text-sm" aria-live="polite">
        {error ? <span className="text-rust">{error}</span> : sent ? <span className="text-moss">{done}</span> : null}
      </p>
    </div>
  );
}
