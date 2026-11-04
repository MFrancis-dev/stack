/**
 * NEAR RPC views. Roadmap: K3.3 · Spec: ARCHITECTURE.md §3
 */

import { JsonRpcProvider } from "near-api-js";

export type NearProvider = Pick<JsonRpcProvider, "callFunction" | "viewAccessKey">;

export function createProvider(url: string): JsonRpcProvider {
  return new JsonRpcProvider({ url });
}

export async function view<T>(provider: Pick<NearProvider, "callFunction">, contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  return (await provider.callFunction({ contractId, method, args })) as T;
}
