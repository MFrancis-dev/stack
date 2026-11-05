"use client";

/**
 * Savings plan: target, address (twice), amount, schedule, fee limit, live cost estimate.
 * Roadmap: K6.3, K6.4
 */

import { PlanForm } from "@/components/plan/PlanForm";
import { useVault } from "@/lib/client/hooks";

export default function PlanPage() {
  const vault = useVault();
  const v = vault.data?.signedIn ? vault.data : null;
  if (!v?.state || !v.vaultAccountId) return null;
  return (
    <div className="grid max-w-3xl gap-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold">{v.state.targetAsset ? "Your plan" : "Set your plan"}</h1>
        <p className="text-lg text-sage">
          Your vault follows these rules on its own. You can change them or pause at any time; only your wallet can.
        </p>
      </div>
      <PlanForm vaultId={v.vaultAccountId} accountId={v.accountId} state={v.state} />
    </div>
  );
}
