"use client";

/**
 * First step after sign-in: Stack creates the user's vault (free, keeper pays). New vaults are paused
 * with no plan until the user sets one. Roadmap: K6.1
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/client/api";

export function CreateVault() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () => api<{ vaultAccountId: string }>("/api/onboard", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vault"] }),
  });
  return (
    <section className="grid max-w-xl gap-5">
      <h1 className="text-4xl font-bold">Create your vault</h1>
      <p className="text-lg text-sage">
        Your vault is a small account on NEAR that only you control. It holds your dollars and buys on your schedule.
        Creating it is free.
      </p>
      <div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Creating your vault…" : "Create my vault"}
        </Button>
      </div>
      {create.isError ? <Notice tone="error">{create.error.message}</Notice> : null}
    </section>
  );
}
