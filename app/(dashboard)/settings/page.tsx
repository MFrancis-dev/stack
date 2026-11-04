"use client";

/**
 * Withdraw, recover stray tokens, see your vault account. Roadmap: K6.7
 */

import { RecoverTokenForm, WithdrawForm } from "@/components/vault/WithdrawForm";
import { useVault } from "@/lib/client/hooks";

export default function SettingsPage() {
  const vault = useVault();
  const v = vault.data?.signedIn ? vault.data : null;
  if (!v?.vaultAccountId || !v.usdcBalance) return null;
  return (
    <div className="grid gap-14">
      <div className="grid gap-2">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-lg text-sage">
          Your vault is <span className="break-all font-bold text-ink">{v.vaultAccountId}</span>. Only {v.accountId} can withdraw from it.
        </p>
      </div>
      <WithdrawForm vaultId={v.vaultAccountId} accountId={v.accountId} usdcBalance={v.usdcBalance} />
      <RecoverTokenForm vaultId={v.vaultAccountId} />
    </div>
  );
}
