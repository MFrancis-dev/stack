import "server-only";

/**
 * Keeper signer. Server/worker only — never imported by client code. The keeper account holds gas
 * money only; it has no path to vault funds beyond bounded buys (invariant I5).
 * Roadmap: K3.3 · Spec: ARCHITECTURE.md §3.1
 */

import { Account, KeyPairSigner, type KeyPairString } from "near-api-js";
import { createProvider } from "./rpc";

export function createKeeper({ accountId, privateKey, rpcUrl }: { accountId: string; privateKey: string; rpcUrl: string }): Account {
  return new Account(accountId, createProvider(rpcUrl), KeyPairSigner.fromSecretKey(privateKey as KeyPairString));
}
