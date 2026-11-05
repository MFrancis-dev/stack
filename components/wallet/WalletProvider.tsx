"use client";

/**
 * NEAR wallet via @hot-labs/near-connect (K0.13). Sign-in = connect → server challenge →
 * wallet.signMessage (NEP-413) → POST /api/session. Owner transactions go straight from the wallet
 * to the vault; the server never signs for the user.
 * Roadmap: K6.1 · Spec: ARCHITECTURE.md §6
 */

import type { NearConnector } from "@hot-labs/near-connect";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import type { OwnerTx } from "@/lib/client/ownerTx";

type Network = "mainnet" | "testnet";
const NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK as Network | undefined) ?? "mainnet";

interface WalletContextValue {
  busy: boolean;
  error: string | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Sends an owner transaction from the user's wallet; resolves when it's included. */
  send(tx: OwnerTx): Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const connector = useRef<NearConnector | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const getConnector = useCallback(async () => {
    if (!connector.current) {
      const { NearConnector } = await import("@hot-labs/near-connect");
      connector.current = new NearConnector({ network: NETWORK });
    }
    return connector.current;
  }, []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The wallet didn't finish the request");
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      busy,
      error,
      signIn: () =>
        run(async () => {
          const wallet = await (await getConnector()).connect();
          const ch = await api<{ nonce: string; message: string; recipient: string }>("/api/session");
          const nonce = Uint8Array.from(atob(ch.nonce), (c) => c.charCodeAt(0));
          const signed = await wallet.signMessage({ message: ch.message, recipient: ch.recipient, nonce });
          await api("/api/session", {
            body: { accountId: signed.accountId, publicKey: signed.publicKey, signature: signed.signature, message: ch.message, nonce: ch.nonce },
          });
          await queryClient.invalidateQueries();
        }),
      signOut: () =>
        run(async () => {
          await api("/api/session", { method: "DELETE" });
          const c = await getConnector();
          await c.disconnect().catch(() => undefined);
          queryClient.clear();
        }),
      send: (tx) =>
        run(async () => {
          const vault = queryClient.getQueryData<{ demo?: boolean }>(["vault"]);
          if (vault?.demo) {
            // Demo mode: same transaction, applied to the demo vault with the contract's rules.
            await api("/api/demo/owner-tx", { body: { tx } });
          } else {
            const wallet = await (await getConnector()).wallet();
            await wallet.signAndSendTransaction({ receiverId: tx.receiverId, actions: tx.actions });
          }
          await queryClient.invalidateQueries({ queryKey: ["vault"] });
        }),
    }),
    [busy, error, getConnector, queryClient, run],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const v = useContext(WalletContext);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
