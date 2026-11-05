/**
 * Links to the NEAR transaction and the delivery on the destination chain.
 * Roadmap: K6.6
 */

import { destinationTxUrl, nearTxUrl } from "@/lib/client/format";

export function TxLinks({ nearTxHash, destinationTxHash, targetAsset }: { nearTxHash: string | null; destinationTxHash: string | null; targetAsset: string }) {
  if (nearTxHash?.startsWith("demo-") || destinationTxHash?.startsWith("demo-")) return <span className="text-sage">Example only</span>;
  const dest = destinationTxHash ? destinationTxUrl(targetAsset, destinationTxHash) : null;
  if (!nearTxHash && !dest) return <span className="text-sage">—</span>;
  return (
    <span className="flex flex-wrap gap-x-3">
      {nearTxHash ? (
        <a href={nearTxUrl(nearTxHash)} target="_blank" rel="noreferrer" className="font-bold text-moss underline-offset-4 hover:underline">
          From vault
        </a>
      ) : null}
      {dest ? (
        <a href={dest} target="_blank" rel="noreferrer" className="font-bold text-moss underline-offset-4 hover:underline">
          To your wallet
        </a>
      ) : null}
    </span>
  );
}
