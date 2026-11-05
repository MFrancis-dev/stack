/**
 * Every buy, newest first, including skipped ones. A real table on wide screens, stacked rows on phones.
 * Roadmap: K6.6, K6.8
 */

import type { BuyDto } from "@/lib/client/api";
import { formatTarget, formatUsdc } from "@/lib/client/format";
import { SkipReason } from "./SkipReason";
import { TxLinks } from "./TxLinks";

/** Statuses where dollars actually left the vault. Skipped, failed and refunded buys spent nothing. */
const SPENT = new Set(["success", "sent", "processing"]);

export function BuyTable({ buys }: { buys: BuyDto[] }) {
  if (buys.length === 0) return <p className="text-sage">No buys yet. Once your plan is running, every buy shows up here, including skipped ones.</p>;
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">Your buys, newest first</caption>
      <thead className="hidden sm:table-header-group">
        <tr className="border-b border-mist text-[13px] text-sage">
          <th scope="col" className="py-2 pr-4 font-normal">Date</th>
          <th scope="col" className="py-2 pr-6 text-right font-normal">Spent</th>
          <th scope="col" className="py-2 pr-6 text-right font-normal">Bought</th>
          <th scope="col" className="py-2 pr-6 text-right font-normal">Fees</th>
          <th scope="col" className="py-2 pr-4 font-normal">Result</th>
          <th scope="col" className="py-2 font-normal">Proof</th>
        </tr>
      </thead>
      <tbody>
        {buys.map((b) => (
          <tr key={b.id} className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-mist py-4 sm:table-row sm:py-0">
            <td className="sm:py-3 sm:pr-4">{new Date(b.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</td>
            <td className="text-right sm:py-3 sm:pr-6">
              {SPENT.has(b.status) ? `$${formatUsdc(b.amountIn)}` : <span className="text-sage">Nothing spent</span>}
            </td>
            <td className="sm:py-3 sm:pr-6 sm:text-right">{b.status === "success" || b.status === "sent" || b.status === "processing" ? formatTarget(b.amountOut, b.targetAsset) : "—"}</td>
            <td className="text-right sm:py-3 sm:pr-6">{b.costBps === null ? "—" : `${(b.costBps / 100).toFixed(2)}%`}</td>
            <td className="col-span-2 sm:py-3 sm:pr-4">
              <SkipReason status={b.status} note={b.note} />
            </td>
            <td className="col-span-2 sm:py-3">
              <TxLinks nearTxHash={b.nearTxHash} destinationTxHash={b.destinationTxHash} targetAsset={b.targetAsset} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
