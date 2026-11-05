"use client";

/**
 * The savings plan. Validated with the same schema as the server (address typed twice, checksummed
 * for the chosen chain, on-chain limits), then sent as one wallet transaction: set_plan + resume.
 * Roadmap: K6.3
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parseAmount } from "@/components/fund/AmountInput";
import { SelectField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { OwnerTx } from "@/components/wallet/OwnerTx";
import { api } from "@/lib/client/api";
import { INTERVALS, targetOptions } from "@/lib/client/format";
import { planTx, wnearRegisterTx } from "@/lib/client/ownerTx";
import { TARGET_ASSETS, targetByAssetId, USDC_DECIMALS, type TargetKey } from "@/lib/core/assets";
import { asBaseUnits, formatAmount } from "@/lib/core/money";
import { planInput } from "@/lib/core/schemas";
import type { VaultState } from "@/lib/core/types";
import { CostPreview } from "./CostPreview";

export function PlanForm({ vaultId, accountId, state }: { vaultId: string; accountId: string; state: VaultState }) {
  const current = state.targetAsset ? targetByAssetId(state.targetAsset) : undefined;
  const [target, setTarget] = useState<TargetKey>(current?.key ?? "btc");
  const [address, setAddress] = useState(state.destinationAddress ?? "");
  const [confirm, setConfirm] = useState(state.destinationAddress ?? "");
  const [amount, setAmount] = useState(BigInt(state.amountPerRun) > 0n ? formatAmount(state.amountPerRun, USDC_DECIMALS) : "100");
  const [interval, setIntervalS] = useState(state.intervalS || 604_800);
  const [maxCost, setMaxCost] = useState(state.maxCostBps ? String(state.maxCostBps / 100) : "3");
  const [touched, setTouched] = useState(false);

  const t = TARGET_ASSETS[target];
  const amountBase = parseAmount(amount, USDC_DECIMALS);
  const maxCostBps = Number.isFinite(Number(maxCost)) ? Math.round(Number(maxCost) * 100) : NaN;

  const parsed = useMemo(
    () =>
      planInput.safeParse({
        target,
        destinationAddress: address,
        destinationAddressConfirm: confirm,
        amountPerRun: amountBase.base ?? "",
        intervalS: interval,
        maxCostBps,
      }),
    [target, address, confirm, amountBase.base, interval, maxCostBps],
  );
  const errors = parsed.success ? {} : parsed.error.flatten().fieldErrors;
  const show = (k: keyof typeof errors) => (touched ? errors[k]?.[0] : undefined);

  // K8.2: a NEAR plan only starts once the destination can receive wNEAR (no refund otherwise).
  const destination = parsed.success ? parsed.data.destinationAddress : "";
  const needsWnear = target === "near" && parsed.success;
  const wnear = useQuery({
    queryKey: ["storage-check", destination],
    queryFn: () => api<{ registered: boolean }>(`/api/storage-check?account=${encodeURIComponent(destination)}`),
    enabled: needsWnear,
    staleTime: 30_000,
  });
  const wnearBlocked = needsWnear && wnear.data?.registered !== true;

  const tx = parsed.success
    ? planTx(vaultId, {
        targetAsset: t.assetId,
        destinationAddress: parsed.data.destinationAddress,
        amountPerRun: asBaseUnits(amountBase.base!),
        intervalS: parsed.data.intervalS,
        maxCostBps: parsed.data.maxCostBps,
      })
    : null;

  return (
    <form className="grid gap-8" onSubmit={(e) => e.preventDefault()} onBlur={() => setTouched(true)}>
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-bold">What to buy</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {targetOptions.map((o) => (
            <label key={o.key} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-4 ring-1 ring-inset ${target === o.key ? "bg-paper-deep ring-2 ring-moss" : "ring-mist hover:bg-paper-deep"}`}>
              <input
                type="radio"
                name="target"
                value={o.key}
                checked={target === o.key}
                onChange={() => {
                  setTarget(o.key);
                  if (o.key === "near" && !address) {
                    setAddress(accountId);
                    setConfirm(accountId);
                  }
                }}
                className="accent-moss"
              />
              <span>
                <span className="block font-bold">{o.symbol}</span>
                <span className="text-sm text-sage">on {o.chainName}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4">
        <TextField
          label={`Your ${t.chainName} address`}
          hint="The coins are sent here after every buy. Use a wallet you control."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          error={show("destinationAddress")}
        />
        <TextField
          label="Type the address again"
          hint="Coins sent to a wrong address can't be recovered, so we compare both and check the address's built-in checksum."
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          error={show("destinationAddressConfirm")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Each buy, in US dollars" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} error={amountBase.error ?? show("amountPerRun")} />
        <SelectField label="How often" value={interval} onChange={(e) => setIntervalS(Number(e.target.value))}>
          {INTERVALS.map((i) => (
            <option key={i.seconds} value={i.seconds}>
              {i.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Most you'll pay in fees (%)" inputMode="decimal" value={maxCost} onChange={(e) => setMaxCost(e.target.value.replace(",", "."))} hint="Buys above this are skipped." error={show("maxCostBps")} />
      </div>

      <section aria-label="Estimate" className="rounded-lg bg-paper-deep p-5">
        <CostPreview target={target} amountPerRun={amountBase.base} maxCostBps={Number.isFinite(maxCostBps) ? maxCostBps : null} />
      </section>

      {needsWnear && wnear.data?.registered === false ? (
        <div className="grid max-w-xl gap-3">
          <Notice tone="warn">
            {destination} can&apos;t receive NEAR from Stack yet. Register it once (0.00125 NEAR from your wallet). Without it,
            coins sent there would be lost.
          </Notice>
          <div className="max-w-sm">
            <OwnerTx tx={wnearRegisterTx(destination)} done="Registered. You can save your plan now." variant="quiet" onSent={() => void wnear.refetch()}>
              Let this account receive NEAR
            </OwnerTx>
          </div>
        </div>
      ) : null}
      {needsWnear && wnear.isError ? <Notice tone="error">Couldn&apos;t check this account: {wnear.error.message}</Notice> : null}

      <div className="max-w-sm">
        <OwnerTx tx={tx} done="Plan saved. Buying is on." disabled={!parsed.success || wnearBlocked}>
          Save plan and start buying
        </OwnerTx>
        <p className="text-sm text-sage">Your wallet will ask you to approve one transaction.</p>
      </div>
    </form>
  );
}
