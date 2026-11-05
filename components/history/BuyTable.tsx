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
        <tr className="border-b-2 border-ink text-sm">
          <th scope="col" className="py-2 pr-4">Date</th>
          <th scope="col" className="py-2 pr-4">Spent</th>
          <th scope="col" className="py-2 pr-4">Bought</th>
          <th scope="col" className="py-2 pr-4">Fees</th>
          <th scope="col" className="py-2 pr-4">Result</th>
          <th scope="col" className="py-2">Proof</th>
        </tr>
      </thead>
      <tbody>
        {buys.map((b) => (
          <tr key={b.id} className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-mist py-4 sm:table-row sm:py-0">
            <td className="sm:py-3 sm:pr-4">{new Date(b.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</td>
            <td className="text-right sm:py-3 sm:pr-4 sm:text-left">
              {SPENT.has(b.status) ? `$${formatUsdc(b.amountIn)}` : <span className="text-sage">Nothing spent</span>}
            </td>
            <td className="sm:py-3 sm:pr-4">{b.status === "success" || b.status === "sent" || b.status === "processing" ? formatTarget(b.amountOut, b.targetAsset) : "—"}</td>
            <td className="text-right sm:py-3 sm:pr-4 sm:text-left">{b.costBps === null ? "—" : `${(b.costBps / 100).toFixed(2)}%`}</td>
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
