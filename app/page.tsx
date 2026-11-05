/**
 * Landing: what Stack is, the live fee check, the vault's rules, questions, demo + sign in.
 * Direction "One motif": a gold coin seen edge-on on bottle green (see app/landing.css).
 * Roadmap: K6.1
 */

import Image from "next/image";
import Link from "next/link";
import { Credits } from "@/components/landing/Credits";
import { FeeCheck } from "@/components/landing/FeeCheck";
import { NavSignIn } from "@/components/landing/NavSignIn";
import { Questions, type Question } from "@/components/landing/Questions";
import { Reveal } from "@/components/landing/Reveal";
import { StartPlan } from "@/components/landing/StartPlan";
import "./landing.css";

const REPO = "https://github.com/MFrancis-dev/stack";

// The hero stack: ten weekly buys seen edge-on, each nudged a little off the one below it.
const COIN_OFFSETS = [44, 10, 58, 22, 0, 40, 14, 52, 26, 6];
const COIN_H = 112;

// The band between the halves of the page: an example quarter of weekly buys.
const BAND_WEEKS: ("buy" | "skip" | "pending")[] = [
  "buy",
  "buy",
  "buy",
  "skip",
  "buy",
  "buy",
  "buy",
  "buy",
  "buy",
  "skip",
  "buy",
  "buy",
  "buy",
  "pending",
];
const COIN_GAP = 18;

const QUESTIONS: Question[] = [
  {
    tab: "Trust",
    q: "What can Stack's own server do with my money?",
    a: (
      <p>
        Only start a buy your vault allows: at most one per period, never more than your amount,
        delivered to the address you set. It can&apos;t withdraw, change your plan or change where
        coins go. If its key were ever stolen, the most it could misdirect is one buy per period
        until you press Pause.
      </p>
    ),
  },
  {
    tab: "Fees",
    q: "What counts as fees, and what if they jump?",
    a: (
      <p>
        Fees are everything between the dollars you spend and the coins you get: the swap spread and
        the network&apos;s delivery charge. Before every buy Stack gets a live quote. If its fees
        are above your limit, that week is skipped and nothing is spent.
      </p>
    ),
  },
  {
    tab: "Funding",
    q: "What can I fund my vault with?",
    a: (
      <p>
        USDC, USDT, SOL, ETH and most other tokens on the chains NEAR Intents supports. Whatever you
        send arrives in your vault as US dollars (USDC on NEAR), ready for your next buys.
      </p>
    ),
  },
  {
    tab: "Leaving",
    q: "Can I take my dollars back out?",
    a: (
      <p>
        Yes, at any time, with one transaction from your own wallet. Withdrawing is always open,
        even while a plan is running, and only you can do it.
      </p>
    ),
  },
  {
    tab: "Cost",
    q: "What does Stack charge?",
    a: (
      <p>
        Nothing on top. You pay the swap and network fees shown before each buy, and a little NEAR
        for the transactions you sign yourself.
      </p>
    ),
  },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const coinsHeight = COIN_OFFSETS.length * (COIN_H + COIN_GAP);

  return (
    <div className="lp">
      <Reveal />

      <section className="lp-hero lp-wrap" aria-labelledby="title">
        <nav className="lp-nav" aria-label="Main">
          <Link href="/" className="lp-mark">
            Stack
          </Link>
          <ul>
            <li>
              <a href="#how">How it works</a>
            </li>
            <li>
              <a href="#fees">Fees</a>
            </li>
            <li>
              <a href="#safety">Safety</a>
            </li>
            <li>
              <a href="#questions">Questions</a>
            </li>
          </ul>
          <div className="lp-nav-actions">
            <Link href="/demo" className="lp-btn">
              Try the demo
            </Link>
          </div>
        </nav>

        <div className="lp-hero-copy">
          <h1 id="title" className="rv">
            Savings on a schedule
          </h1>
          <p className="rv" style={{ ["--d" as string]: 1 }}>
            Stack buys Bitcoin, Ether or NEAR for you every week, skips the weeks when fees run
            high, and sends the coins to your own wallet.
          </p>
          <div className="lp-hero-actions rv" style={{ ["--d" as string]: 2 }}>
            <Link href="/demo" className="lp-btn">
              Try it with example data
            </Link>
            <NavSignIn next={next ?? "/dashboard"} />
          </div>
          <p className="lp-hero-note rv" style={{ ["--d" as string]: 3 }}>
            No wallet or money needed for the demo. Signing in only asks your wallet to sign a
            message.
          </p>
        </div>

        <svg
          className="lp-coins"
          viewBox={`0 0 1000 ${coinsHeight}`}
          aria-hidden="true"
          focusable="false"
        >
          {COIN_OFFSETS.map((x, row) => (
            <rect
              key={row}
              className="coin"
              style={{ ["--i" as string]: COIN_OFFSETS.length - 1 - row }}
              x={x}
              y={row * (COIN_H + COIN_GAP)}
              width={940}
              height={COIN_H}
              rx={COIN_H / 2}
            />
          ))}
        </svg>
      </section>

      <main>
        <section className="lp-section lp-wrap" aria-labelledby="how">
          <div className="lp-tiles">
            <h2 id="how" className="lp-h2 lp-tiles-head rv">
              Set it up once
            </h2>

            <article className="lp-tile rv">
              <div className="lp-tile-field">
                <div className="ui" data-ui>
                  <h4>Add funds</h4>
                  <dl>
                    <dt>You send</dt>
                    <dd>250 USDC on Solana</dd>
                    <dt>Arrives as</dt>
                    <dd>$249.10</dd>
                  </dl>
                  <div style={{ marginTop: 12 }}>
                    <span className="ui-pill">In your vault</span>
                  </div>
                </div>
              </div>
              <h3>Funded</h3>
              <p>Send almost any token from any chain. It lands in your vault as dollars.</p>
            </article>

            <article className="lp-tile rv" style={{ ["--d" as string]: 1 }}>
              <div className="lp-tile-field">
                <div className="ui" data-ui>
                  <h4>Your plan</h4>
                  <dl>
                    <dt>Buy</dt>
                    <dd>Bitcoin</dd>
                    <dt>How much</dt>
                    <dd>$100 every week</dd>
                    <dt>Fee limit</dt>
                    <dd>3.00%</dd>
                    <dt>Send to</dt>
                    <dd>bc1qw5…f3t4</dd>
                  </dl>
                </div>
              </div>
              <h3>Planned</h3>
              <p>
                Pick the coin, the amount, how often, your own address and the most you&apos;ll pay
                in fees.
              </p>
            </article>

            <article className="lp-tile rv" style={{ ["--d" as string]: 2 }}>
              <div className="lp-tile-field">
                <div className="ui" data-ui>
                  <h4>Latest buys</h4>
                  <div className="ui-row">
                    <span>
                      30 Oct <span className="ui-muted">· $100</span>
                    </span>
                    <span>0.00122812 BTC</span>
                  </div>
                  <div className="ui-row">
                    <span>
                      23 Oct <span className="ui-muted">· $100</span>
                    </span>
                    <span>0.00122812 BTC</span>
                  </div>
                  <div className="ui-row">
                    <span>
                      16 Oct <span className="ui-muted">· $0</span>
                    </span>
                    <span className="ui-pill is-skip">Skipped: fees 3.95%</span>
                  </div>
                  <div className="ui-row">
                    <span>
                      9 Oct <span className="ui-muted">· $100</span>
                    </span>
                    <span>0.00122812 BTC</span>
                  </div>
                  <div className="ui-bars" aria-hidden="true">
                    <span style={{ width: "86%" }} />
                    <span style={{ width: "86%" }} />
                    <span className="is-skip" style={{ width: "86%" }} />
                    <span style={{ width: "86%" }} />
                  </div>
                </div>
              </div>
              <h3>Stacked</h3>
              <p>
                Each week your vault buys and the coins arrive in your wallet. Expensive weeks are
                skipped.
              </p>
            </article>
          </div>
        </section>

        <section className="lp-section lp-wrap" aria-labelledby="fees">
          <FeeCheck />
        </section>

        {/* Fourteen weeks laid out as coins: gold bought, green skipped for fees, the last on its way. */}
        <figure style={{ margin: 0 }}>
          <div className="lp-band" aria-hidden="true">
            {BAND_WEEKS.map((state, i) => (
              <span
                key={i}
                className={`rv${state === "skip" ? " is-skip" : state === "pending" ? " is-pending" : ""}`}
                style={{ ["--d" as string]: i % 7 }}
              />
            ))}
          </div>
          <figcaption className="lp-band-caption">
            Fourteen weeks of a $100 plan: twelve buys, two weeks skipped when fees ran high, and
            this week&apos;s buy on its way.
          </figcaption>
        </figure>

        <section className="lp-section lp-wrap" aria-labelledby="safety">
          <h2 id="safety" className="sr-only">
            Your vault, your rules
          </h2>
          <p className="lp-statement rv">
            Your dollars sit in a vault
            <span className="lp-slot">
              <Image
                src="/images/stacks-of-coins.jpg"
                alt=""
                width={1920}
                height={1280}
                loading="lazy"
              />
            </span>{" "}
            only you can empty. Each buy is capped by the vault&apos;s own rules
            <span className="lp-slot lp-slot--ui" data-ui>
              ≤ $100 a week
            </span>
            . Pause
            <span className="lp-toggle" aria-hidden="true" /> any time, and the coins land in your
            own wallet
            <span className="lp-slot">
              <Image
                src="/images/gold-coin-of-the-parisii.jpg"
                alt=""
                width={1600}
                height={1600}
                loading="lazy"
              />
            </span>
            .
          </p>

          <div className="lp-safety-more">
            <div className="rv">
              <p>
                These limits are written into your vault&apos;s contract on NEAR, not kept as a
                promise on a server. Each one has a test you can run.
              </p>
              <a className="lp-link" href={`${REPO}#safety-model`}>
                Read the vault&apos;s rules
              </a>
            </div>
          </div>

          <div className="lp-safety-pics">
            <figure className="rv">
              <Image
                src="/images/19th-century-money-box.jpg"
                alt="A black 19th-century money box with its key in the lock"
                width={1600}
                height={1200}
                loading="lazy"
              />
              <figcaption>
                A 19th-century money box. The key was the whole security model.
              </figcaption>
            </figure>
            <figure className="rv" style={{ ["--d" as string]: 1 }}>
              <Image
                src="/images/stack-of-coins-0214.jpg"
                alt="Stacks of copper and silver coins"
                width={1920}
                height={2880}
                loading="lazy"
                style={{ objectPosition: "50% 40%" }}
              />
              <figcaption>Small amounts, often, add up.</figcaption>
            </figure>
            <figure className="rv" style={{ ["--d" as string]: 2 }}>
              <Image
                src="/images/gold-coin-hoard-2007t433.jpg"
                alt="A gold coin from a buried hoard, on a pale background"
                width={1728}
                height={1152}
                loading="lazy"
              />
              <figcaption>A gold coin from a hoard someone kept for themselves.</figcaption>
            </figure>
          </div>
        </section>

        <section className="lp-section lp-wrap" aria-labelledby="questions">
          <div className="lp-faq">
            <h2 id="questions" className="rv">
              Fair questions
            </h2>
            <div className="rv" style={{ ["--d" as string]: 1 }}>
              <Questions items={QUESTIONS} />
            </div>
          </div>
        </section>

        <section className="lp-start" aria-labelledby="start">
          <div className="lp-wrap">
            <div className="lp-start-copy rv">
              <h2 id="start">Start your stack</h2>
              <p>
                The button opens a private example vault with four weeks of history. No wallet, no
                money, nothing to install.
              </p>
            </div>
            <StartPlan />
          </div>
        </section>
      </main>

      <footer className="lp-foot lp-wrap">
        {/* The name built as a growing stack: five blocks, each a step taller, letters knocked out. */}
        <svg className="lp-blocks" viewBox="0 0 1000 260" role="img" aria-label="Stack">
          {["S", "T", "A", "C", "K"].map((l, i) => {
            const h = 260 * (0.6 + i * 0.1);
            const x = i * 201;
            return (
              <g key={l}>
                <path
                  d={`M${x} 260 V${260 - h + 20} Q${x} ${260 - h} ${x + 20} ${260 - h} H${x + 177} Q${x + 197} ${260 - h} ${x + 197} ${260 - h + 20} V260 Z`}
                />
                <text
                  x={x + 98.5}
                  y={260 - h / 2 + 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {l}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="lp-foot-links">
          <ul>
            <li>
              <Link href="/demo">Try the demo</Link>
            </li>
            <li>
              <a href="#how">How it works</a>
            </li>
            <li>
              <a href="#fees">Fees</a>
            </li>
          </ul>
          <ul>
            <li>
              <a href={REPO}>Source code</a>
            </li>
            <li>
              <a href={`${REPO}#safety-model`}>The vault&apos;s rules</a>
            </li>
            <li>
              <a href={`${REPO}#readme`}>Read the README</a>
            </li>
          </ul>
          <div className="lp-foot-about">
            <p>Built for the NEAR HACKATHON on NEAR Intents.</p>
            <p>Your coins go to your own wallet. Stack never holds your keys.</p>
          </div>
        </div>
        <div className="lp-foot-last">
          <span>© 2026 Stack. MIT licence.</span>
          <Link href="/demo" className="lp-btn">
            Open the demo
          </Link>
        </div>
        <Credits />
      </footer>
    </div>
  );
}
