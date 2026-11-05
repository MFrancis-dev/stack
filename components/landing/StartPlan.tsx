"use client";

/**
 * The closing section's dialog: the plan screen, already open. Changing it updates the fee line;
 * the button opens a private demo (no wallet, no money).
 * Roadmap: K6.1, K7.3
 */

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { TARGET_ASSETS, type TargetKey } from "@/lib/core/assets";
import { modelCostBps } from "@/lib/core/feeModel";

const OPTIONS: { key: TargetKey; label: string }[] = [
  { key: "btc", label: "Bitcoin" },
  { key: "eth", label: "Ether" },
  { key: "near", label: "NEAR" },
];

export function StartPlan() {
  const router = useRouter();
  const [coin, setCoin] = useState<TargetKey>("btc");
  const [amount, setAmount] = useState("100");
  const usd = Number(amount);
  const valid = Number.isFinite(usd) && usd >= 1 && usd <= 100_000;
  const bps = valid ? modelCostBps(TARGET_ASSETS[coin].assetId, usd) : null;
  const yearly = valid ? (usd * 52).toLocaleString("en-US") : null;
  const start = useMutation({
    mutationFn: () => api("/api/demo/start", { method: "POST" }),
    onSuccess: () => router.push("/dashboard"),
  });

  return (
    <div className="ui lp-dialog" data-ui role="group" aria-labelledby="plan-title">
      <h3 id="plan-title">Plan a weekly buy</h3>
      <div className="ui-seg" role="group" aria-label="Coin to buy">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={coin === o.key}
            onClick={() => setCoin(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label htmlFor="plan-amount">Each buy, in US dollars</label>
      <div className="ui-field">
        $
        <input
          id="plan-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
        />
      </div>
      <p className="ui-muted" aria-live="polite">
        {valid && bps !== null
          ? `Every week, about ${(bps / 100).toFixed(2)}% in fees, so $${yearly} a year into ${TARGET_ASSETS[coin].chainName === "Ethereum" ? "Ether" : TARGET_ASSETS[coin].chainName}.`
          : "Enter an amount between $1 and $100,000."}
      </p>
      <button
        type="button"
        className="lp-btn"
        onClick={() => start.mutate()}
        disabled={start.isPending}
      >
        {start.isPending ? "Setting up your demo…" : "Open the demo"}
      </button>
      {start.isError ? (
        <p className="lp-error" role="alert">
          {start.error.message}
        </p>
      ) : null}
    </div>
  );
}
