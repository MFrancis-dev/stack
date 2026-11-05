"use client";

/**
 * Connects a NEAR wallet and signs a sign-in message (no transaction, no fee).
 * Roadmap: K6.1
 */

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useWallet } from "./WalletProvider";

export function SignInButton({ next = "/dashboard" }: { next?: string }) {
  const { signIn, busy, error } = useWallet();
  const router = useRouter();
  return (
    <div className="grid justify-items-start gap-2">
      <Button onClick={() => signIn().then(() => router.push(next)).catch(() => undefined)} disabled={busy}>
        {busy ? "Waiting for your wallet…" : "Sign in with NEAR"}
      </Button>
      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
