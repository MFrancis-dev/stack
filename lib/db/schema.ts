/**
 * Database schema (Drizzle). Amounts are numeric(78,0) base units. On-chain vault is the truth for plan and balance.
 * Roadmap: K3.4 · Spec: ARCHITECTURE.md §5
 * Status: scaffold — not implemented yet.
 */

import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { BUY_STATUSES, FUNDING_STATUSES } from "../core/status";

const baseUnits = (name: string) => numeric(name, { precision: 78, scale: 0 });
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  nearAccountId: text("near_account_id").notNull().unique(),
  vaultAccountId: text("vault_account_id").unique(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** One real 1Click funding quote: any token → USDC into the vault. */
export const fundingAttempts = pgTable(
  "funding_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    originAsset: text("origin_asset").notNull(),
    amountIn: baseUnits("amount_in").notNull(),
    expectedOut: baseUnits("expected_out").notNull(),
    refundTo: text("refund_to").notNull(),
    depositAddress: text("deposit_address").notNull().unique(),
    quoteDeadline: ts("quote_deadline").notNull(),
    quoteSignature: text("quote_signature").notNull(),
    quoteRaw: jsonb("quote_raw").notNull(),
    oneclickStatus: text("oneclick_status"),
    status: text("status", { enum: FUNDING_STATUSES }).notNull().default("awaiting_deposit"),
    depositTxHash: text("deposit_tx_hash"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("funding_attempts_user_idx").on(t.userId)],
);

/** One scheduled buy, including skipped ones (skipped_cost, no_quote). */
export const buys = pgTable(
  "buys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    quoteRef: text("quote_ref").notNull().unique(),
    amountIn: baseUnits("amount_in").notNull(),
    targetAsset: text("target_asset").notNull(),
    destinationAddress: text("destination_address").notNull(),
    costBps: integer("cost_bps"),
    amountInUsd: numeric("amount_in_usd"),
    amountOut: baseUnits("amount_out"),
    depositAddress: text("deposit_address").unique(),
    quoteSignature: text("quote_signature"),
    quoteRaw: jsonb("quote_raw"),
    nearTxHash: text("near_tx_hash"),
    oneclickStatus: text("oneclick_status"),
    status: text("status", { enum: BUY_STATUSES }).notNull(),
    destinationTxHash: text("destination_tx_hash"),
    createdAt: ts("created_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
  },
  (t) => [index("buys_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type FundingAttempt = typeof fundingAttempts.$inferSelect;
export type Buy = typeof buys.$inferSelect;
