/**
 * Every 5 s: non-final funding attempts → 1Click status → our status. One failing attempt never
 * stops the others. Roadmap: K5.2 · Spec: ARCHITECTURE.md §4.4
 */

import { fundingStatusFromOneClick, type FundingStatus } from "../lib/core/status";
import { listActiveFunding, updateFundingStatus } from "../lib/db/queries/fundingAttempts";
import { errorMessage, type WorkerDeps } from "./deps";

export async function pollFunding(deps: Pick<WorkerDeps, "db" | "status" | "now" | "log">): Promise<void> {
  const active = await listActiveFunding(deps.db);
  for (const a of active) {
    try {
      const r = await deps.status.getStatus(a.depositAddress);
      let status: FundingStatus = fundingStatusFromOneClick(r.status);
      if (r.status === "PENDING_DEPOSIT" && a.quoteDeadline.getTime() < deps.now()) status = "expired";
      if (status !== a.status || r.status !== a.oneclickStatus) {
        await updateFundingStatus(deps.db, a.id, { status, oneclickStatus: r.status });
        deps.log.info("funding status", { id: a.id, from: a.status, to: status });
        if (status === "underpaid") deps.log.alert("funding underpaid", { id: a.id });
      }
    } catch (e) {
      deps.log.warn("funding poll failed", { id: a.id, error: errorMessage(e) });
    }
  }
}
