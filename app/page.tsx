/**
 * Landing: what Stack is, sign in, demo. Roadmap: K6.1
 */

import Link from "next/link";
import { StackColumn, type StackBar } from "@/components/vault/StackColumn";
import { SignInButton } from "@/components/wallet/SignInButton";

// Illustration only: twelve weekly $50 buys, two skipped when fees were too high.
const EXAMPLE: StackBar[] = [62, 58, 0, 61, 66, 64, 0, 59, 63, 67, 65, 60].map((w, i) => ({
  key: String(i),
  weight: w,
  state: w === 0 ? "skipped" : i === 11 ? "pending" : "done",
  label: `Week ${i + 1}`,
}));

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-2xl font-extrabold tracking-tight">Stack</span>
        <Link href="/demo" className="font-bold text-moss underline-offset-4 hover:underline">
          Try the demo
        </Link>
      </header>

      <section className="grid items-end gap-12 pt-10 md:grid-cols-[1.25fr_1fr] md:pt-20">
        <div className="max-w-xl">
          <h1 className="text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold">Put your savings on a schedule.</h1>
          <p className="mt-6 max-w-[34rem] text-lg text-sage">
            Fund your vault once from whatever you hold, on any chain. Stack buys Bitcoin, Ether or NEAR every week and
            sends it straight to your own wallet. No exchange account, and nobody can freeze it.
          </p>
          <div className="mt-8 flex flex-wrap items-start gap-4">
            <SignInButton next={next ?? "/dashboard"} />
            <Link href="/demo" className="inline-flex min-h-11 items-center rounded-md px-4 font-bold ring-1 ring-inset ring-mist hover:bg-paper-deep">
              See it with example data
            </Link>
          </div>
          <p className="mt-4 text-sm text-sage">Signing in only asks your NEAR wallet to sign a message. It costs nothing.</p>
        </div>

        <figure className="rounded-lg bg-paper-deep p-6 sm:p-8">
          <StackColumn bars={EXAMPLE} />
          <figcaption className="mt-5 text-sm text-sage">
            An example stack: twelve weekly buys of $50. Two were skipped because fees that week were above the limit, so
            nothing was spent.
          </figcaption>
        </figure>
      </section>

      <section className="mt-24 grid gap-10 md:grid-cols-3" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-bold md:col-span-3">
          How it works
        </h2>
        {[
          ["Fund your vault", "Send USDC, SOL, ETH or most other tokens from any chain. It arrives in your vault as dollars."],
          ["Set your plan", "Pick what to buy, your own wallet address, how much and how often, and the most you'll pay in fees."],
          ["Stack buys for you", "On schedule, your vault buys and the coins land in your wallet. Expensive weeks are skipped."],
        ].map(([title, body], i) => (
          <div key={title} className="grid content-start gap-2 border-t-2 border-ink pt-4">
            <span className="font-display text-4xl font-extrabold text-moss">{i + 1}</span>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-sage">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-24 max-w-2xl" aria-labelledby="safe">
        <h2 id="safe" className="text-3xl font-bold">
          Your vault, your rules
        </h2>
        <ul className="mt-6 grid gap-4 text-lg">
          <li>Only you can withdraw or change where your coins go. Stack can’t.</li>
          <li>Each buy is capped by your vault’s own rules: one per period, never more than your amount.</li>
          <li>Pause at any time with one tap. Your dollars stay in your vault until you withdraw them.</li>
        </ul>
      </section>

      <footer className="mt-24 border-t border-mist pt-6 text-sm text-sage">Built for NEAR HACKATHON on NEAR Intents.</footer>
    </main>
  );
}
