"use client";

/**
 * Demo entry: explains what you'll see and starts a private demo session (fresh example data,
 * no wallet, no money). Roadmap: K7.3
 */

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/client/api";

export default function DemoPage() {
  const router = useRouter();
  const start = useMutation({
    mutationFn: () => api("/api/demo/start", { method: "POST" }),
    onSuccess: () => router.push("/dashboard"),
  });
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
        Stack
      </Link>
      <h1 className="mt-12 text-[clamp(2.2rem,6vw,3.6rem)] font-extrabold">See Stack with example data</h1>
      <p className="mt-5 text-lg text-sage">
        You get your own example saver: $1,300 deposited from two chains, a plan to buy $100 of Bitcoin every week, and
        four weeks of history, including one week that was skipped because fees were too high.
      </p>
      <ul className="mt-6 grid gap-2 text-lg">
        <li>Change the plan and watch the fee estimate. Prices are live when we can reach NEAR Intents.</li>
        <li>Add funds to see a deposit go from waiting to done in about a minute.</li>
        <li>Fast-forward 30 days to see the plan keep buying on its own.</li>
      </ul>
      <div className="mt-10 grid justify-items-start gap-3">
        <Button onClick={() => start.mutate()} disabled={start.isPending}>
          {start.isPending ? "Setting up your demo…" : "Open the demo"}
        </Button>
        <p className="text-sm text-sage">No wallet and no money involved. Your example data is private to this browser.</p>
      </div>
      {start.isError ? (
        <div className="mt-6">
          <Notice tone="error">{start.error.message}</Notice>
        </div>
      ) : null}
    </main>
  );
}
