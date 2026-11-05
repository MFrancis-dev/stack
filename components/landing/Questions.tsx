"use client";

/**
 * Questions, filed like index cards: one open at a time, the first open on load.
 * Roadmap: K6.1
 */

import { useState, type ReactNode } from "react";

export interface Question {
  tab: string;
  q: string;
  a: ReactNode;
}

const CARD_COLOURS = [
  { card: "#1a4429", ink: "#f4d96c" },
  { card: "#235333", ink: "#f4d96c" },
  { card: "#f4d96c", ink: "#133621" },
];

export function Questions({ items }: { items: Question[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="lp-cards">
      {items.map((item, i) => {
        const c = CARD_COLOURS[i % CARD_COLOURS.length]!;
        const isOpen = open === i;
        return (
          <div
            key={item.tab}
            className="lp-card"
            style={{
              ["--i" as string]: i,
              ["--card" as string]: c.card,
              ["--card-ink" as string]: c.ink,
            }}
          >
            <span className="lp-card-tab" aria-hidden="true">
              {item.tab}
            </span>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`answer-${i}`}
                onClick={() => setOpen(i)}
              >
                <span>{item.q}</span>
              </button>
            </h3>
            <div id={`answer-${i}`} className="lp-card-answer" hidden={!isOpen}>
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
