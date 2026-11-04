/**
 * Signed-in shell: nav to dashboard, fund, plan, history, settings.
 * Roadmap: K6.1
 * Status: scaffold — not implemented yet.
 */

import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
