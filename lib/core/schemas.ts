/**
 * zod schemas for API request bodies.
 * Roadmap: K2.6 · Spec: ARCHITECTURE.md §4.1
 * Status: scaffold — not implemented yet.
 */

import { z } from "zod";

export const fundQuoteInput = z.object({
  originAsset: z.string().min(1),
  amountIn: z.string().regex(/^\d+$/),
  refundTo: z.string().min(1),
  dry: z.boolean(),
});

export const planPreviewInput = z.object({
  targetAsset: z.string().min(1),
  amountPerRun: z.string().regex(/^\d+$/),
});
