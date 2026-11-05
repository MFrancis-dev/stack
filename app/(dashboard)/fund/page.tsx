"use client";

/**
 * Add funds from any token on any chain: preview (free, nothing stored) → get a deposit address →
 * send → live status. Roadmap: K6.2
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AmountInput, parseAmount } from "@/components/fund/AmountInput";
import { DepositPanel } from "@/components/fund/DepositPanel";
import { FundStatus } from "@/components/fund/FundStatus";
import { TokenPicker } from "@/components/fund/TokenPicker";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api, type FundQuoteResponse, type FundStatusDto } from "@/lib/client/api";
import { formatUsdc } from "@/lib/client/format";
import { useTokens } from "@/lib/client/hooks";
import { formatAmount } from "@/lib/core/money";

function FundFlow() {
  const tokens = useTokens();
  const params = useSearchParams();
  const resumeId = params.get("attempt");
  const [assetId, setAssetId] = useState("");
  const [amount, setAmount] = useState("");
  const [refundTo, setRefundTo] = useState("");
  const token = tokens.data?.find((t) => t.assetId === assetId);
  const parsed = token ? parseAmount(amount, token.decimals) : { base: null, error: null };
  const ready = !!token && !!parsed.base && refundTo.trim().length > 1;
  const body = (dry: boolean) => ({ originAsset: assetId, amountIn: parsed.base, refundTo: refundTo.trim(), dry });

  const preview = useMutation({ mutationFn: () => api<FundQuoteResponse>("/api/fund/quote", { body: body(true) }) });
  const real = useMutation({ mutationFn: () => api<FundQuoteResponse>("/api/fund/quote", { body: body(false) }) });
  const resumed = useQuery({
    queryKey: ["fund", resumeId],
    queryFn: () => api<FundStatusDto>(`/api/fund/${resumeId}/status`),
    enabled: !!resumeId && !real.data,
  });

  const attempt = real.data?.attempt
    ? { id: real.data.attempt.id, depositAddress: real.data.attempt.depositAddress, deadline: real.data.quote.deadline, amountLabel: `${amount} ${token?.symbol ?? ""}` }
    : resumed.data
      ? { id: resumed.data.id, depositAddress: resumed.data.depositAddress, deadline: resumed.data.deadline, amountLabel: "the amount you were quoted" }
      : null;

  if (attempt) {
    return (
      <div className="grid max-w-3xl gap-6">
        <h1 className="text-2xl font-bold">Add funds</h1>
        <FundStatus attemptId={attempt.id} />
        <DepositPanel attemptId={attempt.id} depositAddress={attempt.depositAddress} amountLabel={attempt.amountLabel} deadline={attempt.deadline} />
      </div>
    );
  }

  return (
    <div className="grid max-w-3xl gap-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold">Add funds</h1>
        <p className="text-lg text-sage">Send almost any token from any chain. It arrives in your vault as US dollars (USDC), ready for your next buys.</p>
      </div>

      {tokens.isError ? <Notice tone="error">Couldn&apos;t load the token list: {tokens.error.message}</Notice> : null}
      <TokenPicker tokens={tokens.data ?? []} value={assetId} onChange={(id) => { setAssetId(id); preview.reset(); }} />
      {token ? (
        <AmountInput label={`How much ${token.symbol}`} value={amount} onChange={(v) => { setAmount(v); preview.reset(); }} decimals={token.decimals} symbol={token.symbol} />
      ) : null}
      <TextField
        label={token ? `Your refund address on ${token.blockchain}` : "Your refund address"}
        hint="If something goes wrong, your tokens come back here. Use an address you control, not an exchange deposit address."
        value={refundTo}
        onChange={(e) => { setRefundTo(e.target.value); preview.reset(); }}
        autoComplete="off"
      />

      <div className="flex flex-wrap gap-3">
        <Button variant="quiet" disabled={!ready || preview.isPending} onClick={() => preview.mutate()}>
          {preview.isPending ? "Checking the rate…" : "Preview"}
        </Button>
        <Button disabled={!ready || !preview.data || real.isPending} onClick={() => real.mutate()}>
          {real.isPending ? "Getting your address…" : "Get deposit address"}
        </Button>
      </div>

      {preview.data && token ? (
        <Notice>
          {formatAmount(preview.data.quote.amountIn, token.decimals, 6)} {token.symbol} becomes about <strong>${formatUsdc(preview.data.quote.amountOut)}</strong> in your vault
          {preview.data.quote.timeEstimateS ? `, usually within ${Math.max(1, Math.round(preview.data.quote.timeEstimateS / 60))} min` : ""}.
        </Notice>
      ) : null}
      {preview.isError ? <Notice tone="error">{preview.error.message}</Notice> : null}
      {real.isError ? <Notice tone="error">{real.error.message}</Notice> : null}
    </div>
  );
}

export default function FundPage() {
  return (
    <Suspense fallback={<p className="text-sage">Loading…</p>}>
      <FundFlow />
    </Suspense>
  );
}
