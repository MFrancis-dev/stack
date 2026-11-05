"use client";

/**
 * Withdraw, recover stray tokens, see your vault account. Roadmap: K6.7, K8.3
 */

import { RecoverTokenForm, WithdrawForm } from "@/components/vault/WithdrawForm";
import { useBuys, useVault } from "@/lib/client/hooks";

export default function SettingsPage() {
  const vault = useVault();
  const v = vault.data?.signedIn ? vault.data : null;
  const buys = useBuys(!!v?.vaultAccountId);
  if (!v?.vaultAccountId || !v.usdcBalance) return null;
  const buyInFlight = (buys.data ?? []).some((b) => b.status === "sent" || b.status === "processing");
  return (
    <div className="grid gap-14">
      <div className="grid gap-2">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-lg text-sage">
          Your vault is <span className="break-all font-bold text-ink">{v.vaultAccountId}</span>. Only {v.accountId} can withdraw from it.
        </p>
      </div>
      <WithdrawForm vaultId={v.vaultAccountId} accountId={v.accountId} usdcBalance={v.usdcBalance} buyInFlight={buyInFlight} />
      <RecoverTokenForm vaultId={v.vaultAccountId} />
    </div>
  );
}
