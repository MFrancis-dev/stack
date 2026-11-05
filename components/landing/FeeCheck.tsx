"use client";

/**
 * The landing page's live fee check: pick a coin and a weekly amount, see the expected fees and
 * whether that buy would go ahead at a 3% limit. Uses the fee model calibrated on real quotes;
 * the real app checks a live, signed quote before every buy.
 * Roadmap: K6.1
 */

import { useState } from "react";
import { TARGET_ASSETS, type TargetKey } from "@/lib/core/assets";
import { modelCostBps, NETWORK_FEE_USD, SPREAD_BPS } from "@/lib/core/feeModel";

const LIMIT_BPS = 300;
const COINS: { key: TargetKey; name: string; disc: string }[] = [
  { key: "btc", name: "Bitcoin", disc: "#f4d96c" },
  { key: "eth", name: "Ether", disc: "#e8c75a" },
  { key: "near", name: "NEAR", disc: "#f8e7a2" },
];
const STEPS = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500];

/** Smallest weekly amount, rounded up to a dollar, whose fees stay within the limit. */
function minUnderLimit(key: TargetKey): number {
  return Math.ceil(NETWORK_FEE_USD[key]! / ((LIMIT_BPS - SPREAD_BPS) / 10_000));
}

export function FeeCheck() {
  const [coin, setCoin] = useState<TargetKey>("btc");
  const [step, setStep] = useState(STEPS.indexOf(100));
  const usd = STEPS[step]!;
  const asset = TARGET_ASSETS[coin];
  const bps = modelCostBps(asset.assetId, usd);
  const skipped = bps > LIMIT_BPS;
  const pct = (bps / 100).toFixed(2);
  const receive = ((usd * (10_000 - bps)) / 10_000).toFixed(2);
  const min = minUnderLimit(coin);
  const name = COINS.find((c) => c.key === coin)!.name;

  return (
    <div className="lp-fees">
      <div className="lp-fees-list rv">
        <h2 id="fees">Fees, checked every week</h2>
        <ul aria-label="Coin to buy">
          {COINS.map((c) => (
            <li key={c.key}>
              <button type="button" aria-pressed={coin === c.key} onClick={() => setCoin(c.key)}>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="lp-disc-area"
        style={{ ["--disc" as string]: COINS.find((c) => c.key === coin)!.disc }}
      >
        <div className="lp-disc lp-shutter">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/1985-edge-of-a-one-pound-coin-poster.jpg"
            width={854}
            height={480}
            aria-hidden="true"
          >
            <source src="/images/1985-edge-of-a-one-pound-coin.webm" type="video/webm" />
          </video>
        </div>
      </div>

      <div className="lp-fees-panel rv" style={{ ["--d" as string]: 2 }}>
        <div className="ui" data-ui>
          <h4>Next {name} buy</h4>
          <div className="ui-amount">
            <label htmlFor="fee-amount">Each week</label>
            <span className="ui-big">${usd}</span>
          </div>
          <input
            id="fee-amount"
            type="range"
            min={0}
            max={STEPS.length - 1}
            step={1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            aria-valuetext={`$${usd} a week`}
          />
          <dl style={{ marginTop: 12 }}>
            <dt>Fees</dt>
            <dd>{pct}%</dd>
            <dt>You get</dt>
            <dd>
              ${receive} of {asset.symbol}
            </dd>
          </dl>
          <p className={`ui-verdict${skipped ? " is-skip" : ""}`} aria-live="polite">
            {skipped
              ? `Above your 3% limit: this week is skipped and nothing is spent.`
              : `Within your 3% limit: this buy goes ahead.`}
          </p>
        </div>
        <p className="lp-fees-fact">
          {coin === "btc"
            ? `Bitcoin's network charges about $${NETWORK_FEE_USD.btc!.toFixed(2)} to deliver each buy, so buys under $${min} cost more than 3%.`
            : coin === "eth"
              ? `Ether costs about $${NETWORK_FEE_USD.eth!.toFixed(2)} to deliver, so anything from $${min} a week stays under 3%.`
              : `NEAR costs about $${NETWORK_FEE_USD.near!.toFixed(2)} to deliver, so even small weekly buys stay well under 3%.`}{" "}
          Estimates from real quotes; every real buy is checked against a live one.
        </p>
      </div>
    </div>
  );
}
