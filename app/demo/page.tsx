"use client";

/**
 * Demo entry: explains what you'll see and starts a private demo session (fresh example data,
 * no wallet, no money). Same look as the landing page. Roadmap: K7.3
 */

import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Credits } from "@/components/landing/Credits";
import { api } from "@/lib/client/api";
import "../landing.css";

export default function DemoPage() {
  const router = useRouter();
  const start = useMutation({
    mutationFn: () => api("/api/demo/start", { method: "POST" }),
    onSuccess: () => router.push("/dashboard"),
  });
  return (
    <div className="lp">
      <div className="lp-wrap">
        <nav className="lp-nav" aria-label="Main">
          <Link href="/" className="lp-mark">
            Stack
          </Link>
        </nav>

        <main className="lp-demo">
          <div className="lp-demo-copy">
            <h1>See Stack with example data</h1>
            <p>
              You get your own example saver: $1,300 deposited from two chains, $100 of Bitcoin
              bought every week, and four weeks of history.
            </p>
            <ul>
              <li>One week was skipped because fees were too high. See why in the history.</li>
              <li>
                Change the plan and watch the fee estimate. Prices are live when NEAR Intents can be
                reached.
              </li>
              <li>Add funds and watch a deposit go from waiting to done in about a minute.</li>
              <li>Fast-forward 30 days to see the plan keep buying on its own.</li>
            </ul>
            <div className="lp-demo-actions">
              <button
                type="button"
                className="lp-btn"
                onClick={() => start.mutate()}
                disabled={start.isPending}
              >
                {start.isPending ? "Setting up your demo…" : "Open the demo"}
              </button>
              <p>No wallet and no money involved. Your example data is private to this browser.</p>
              {start.isError ? (
                <p className="lp-error" role="alert">
                  {start.error.message}
                </p>
              ) : null}
            </div>
          </div>

          <figure className="lp-demo-pic">
            <Image
              src="/images/stack-of-coins-0214.jpg"
              alt="Stacks of copper and silver coins"
              width={1920}
              height={2880}
              priority
            />
            <figcaption>Small amounts, often. The demo shows four weeks of it.</figcaption>
          </figure>
        </main>

        <footer style={{ paddingBottom: 40 }}>
          <Credits />
        </footer>
      </div>
    </div>
  );
}
