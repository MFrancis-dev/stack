/**
 * zod schemas for API request bodies. Amounts are base-unit integer strings.
 * Roadmap: K2.6 · Spec: ARCHITECTURE.md §4.1
 */

import { z } from "zod";
import { TARGET_ASSETS } from "./assets";
import { isValidAddress } from "./address";

// zod runs refinements even after the regex fails, so guard before calling BigInt.
const baseUnits = z
  .string()
  .regex(/^\d+$/, "Amount must be an integer in base units")
  .refine((v) => /^\d+$/.test(v) && BigInt(v) > 0n, "Amount must be positive");

export const fundQuoteInput = z.object({
  originAsset: z.string().min(1).max(200),
  amountIn: baseUnits,
  refundTo: z.string().min(1).max(200),
  dry: z.boolean(),
});
export type FundQuoteInput = z.infer<typeof fundQuoteInput>;

const targetKey = z.enum(["btc", "eth", "near"]);

export const planPreviewInput = z.object({
  target: targetKey,
  amountPerRun: baseUnits,
});
export type PlanPreviewInput = z.infer<typeof planPreviewInput>;

/** The plan form; validated again on-chain. The address is checked with the target chain's checksum rules. */
export const planInput = z
  .object({
    target: targetKey,
    destinationAddress: z.string().trim().min(1).max(128),
    destinationAddressConfirm: z.string().trim().min(1).max(128),
    amountPerRun: baseUnits,
    intervalS: z.number().int().min(60),
    maxCostBps: z.number().int().min(1).max(5_000),
  })
  .refine((p) => p.destinationAddress === p.destinationAddressConfirm, {
    message: "Addresses don't match",
    path: ["destinationAddressConfirm"],
  })
  .refine((p) => isValidAddress(TARGET_ASSETS[p.target].chain, p.destinationAddress), {
    message: "Not a valid address for this chain",
    path: ["destinationAddress"],
  });
export type PlanInputForm = z.infer<typeof planInput>;

export const sessionInput = z.object({
  accountId: z.string().min(2).max(64),
  publicKey: z.string().min(1),
  signature: z.string().min(1),
  message: z.string().min(1),
  nonce: z.string().min(1),
});
export type SessionInput = z.infer<typeof sessionInput>;
