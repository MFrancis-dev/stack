"use client";

/**
 * Withdraw dollars from the vault to your NEAR account (always available, paused or not), and recover
 * any other token someone sent to the vault. Both need your wallet. Roadmap: K6.7
 */

import { useState } from "react";
import { parseAmount } from "@/components/fund/AmountInput";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { OwnerTx } from "@/components/wallet/OwnerTx";
import { formatUsdc } from "@/lib/client/format";
import { recoverTokenTx, withdrawTx } from "@/lib/client/ownerTx";
import { USDC_DECIMALS } from "@/lib/core/assets";
import { asBaseUnits } from "@/lib/core/money";

export function WithdrawForm({
  vaultId,
  accountId,
  usdcBalance,
  buyInFlight = false,
}: {
  vaultId: string;
  accountId: string;
  usdcBalance: string;
  /** A buy has left the vault and is still settling (K8.3). */
  buyInFlight?: boolean;
}) {
  const [amount, setAmount] = useState("");
  const p = parseAmount(amount, USDC_DECIMALS);
  const tooMuch = p.base !== null && BigInt(p.base) > BigInt(usdcBalance);
  return (
    <section aria-labelledby="withdraw" className="grid max-w-md gap-4">
      <h2 id="withdraw" className="text-lg font-bold">
        Withdraw dollars
      </h2>
      <p className="text-sage">
        Sends USDC from your vault to <span className="font-bold text-ink">{accountId}</span>. You have ${formatUsdc(usdcBalance)} in your vault.
      </p>
      <TextField
        label="Amount in US dollars"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(",", "."))}
        error={p.error ?? (tooMuch ? "That's more than your vault holds" : null)}
      />
      <button type="button" className="justify-self-start text-sm font-bold text-moss underline-offset-4 hover:underline" onClick={() => setAmount(formatUsdc(usdcBalance, USDC_DECIMALS))}>
        Use everything
      </button>
      {buyInFlight ? (
        <Notice tone="warn">
          A buy is on its way right now. Its dollars have already left your vault, so they aren&apos;t included above. If you withdraw
          everything, the next scheduled buy is skipped until you add funds.
        </Notice>
      ) : null}
      <OwnerTx tx={p.base && !tooMuch ? withdrawTx(vaultId, asBaseUnits(p.base)) : null} done="Withdrawn to your account.">
        Withdraw
      </OwnerTx>
    </section>
  );
}

export function RecoverTokenForm({ vaultId }: { vaultId: string }) {
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const valid = /^[a-z0-9._-]{2,64}$/.test(token) && /^\d+$/.test(amount) && BigInt(amount || "0") > 0n;
  return (
    <section aria-labelledby="recover" className="grid max-w-md gap-4">
      <h2 id="recover" className="text-lg font-bold">
        Recover another token
      </h2>
      <p className="text-sage">If someone sent your vault a token other than USDC, send it to your account here.</p>
      <TextField label="Token contract" placeholder="token.example.near" value={token} onChange={(e) => setToken(e.target.value.trim())} spellCheck={false} />
      <TextField label="Amount (in the token's smallest unit)" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
      <OwnerTx tx={valid ? recoverTokenTx(vaultId, token, asBaseUnits(amount)) : null} done="Sent to your account." variant="quiet">
        Recover token
      </OwnerTx>
    </section>
  );
}
