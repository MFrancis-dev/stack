"use client";

/**
 * Where to send: address (copy + QR), exact amount, time left, and the exchange-fee warning (K-E1).
 * Roadmap: K6.2
 */

import { useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/client/api";

function useCountdown(deadline: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, Date.parse(deadline) - now);
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return { expired: ms === 0, label: `${m}:${String(s).padStart(2, "0")}` };
}

export function DepositPanel({
  attemptId,
  depositAddress,
  amountLabel,
  deadline,
}: {
  attemptId: string;
  depositAddress: string;
  amountLabel: string;
  deadline: string;
}) {
  const { expired, label } = useCountdown(deadline);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const submit = useMutation({
    mutationFn: () => api(`/api/fund/${attemptId}/submit-tx`, { body: { txHash: txHash.trim() } }),
  });

  return (
    <section aria-labelledby="send" className="grid gap-6 rounded-lg bg-surface p-5 ring-1 ring-inset ring-mist sm:p-7">
      <h2 id="send" className="text-lg font-bold">
        Send exactly {amountLabel}
      </h2>
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="justify-self-start rounded-md bg-white p-3">
          <QRCodeSVG value={depositAddress} size={168} marginSize={1} aria-label="QR code of the deposit address" />
        </div>
        <div className="grid gap-3">
          <p className="text-sm font-bold text-sage">To this address</p>
          <p className="break-all font-bold">{depositAddress}</p>
          <div>
            <Button
              variant="quiet"
              onClick={() => navigator.clipboard.writeText(depositAddress).then(() => setCopied(true))}
            >
              {copied ? "Address copied" : "Copy address"}
            </Button>
          </div>
          <p className={expired ? "font-bold text-rust" : "text-sage"} aria-live="polite">
            {expired ? "This address has expired. Get a new one before sending." : `Send within ${label}. After that, get a new address.`}
          </p>
        </div>
      </div>
      {depositAddress.startsWith("demo-") ? (
        <Notice tone="error">This is a demo address. Don&apos;t send anything to it. The deposit will complete on its own in about a minute.</Notice>
      ) : null}
      <Notice tone="warn">
        Sending from an exchange? Exchanges take a withdrawal fee, so add it on top. If less than {amountLabel} arrives,
        the deposit is marked short and may be refunded to your refund address.
      </Notice>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <TextField label="Transaction hash (optional)" hint="Pasting it helps your deposit get picked up faster." value={txHash} onChange={(e) => setTxHash(e.target.value)} />
        <Button type="submit" variant="quiet" disabled={txHash.trim().length < 8 || submit.isPending}>
          {submit.isSuccess ? "Hash sent" : "Send hash"}
        </Button>
      </form>
      {submit.isError ? <Notice tone="error">{submit.error.message}</Notice> : null}
    </section>
  );
}
