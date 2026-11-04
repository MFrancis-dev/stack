/**
 * Sign-in verification for NEP-413 signed messages (from `wallet.signMessage` in near-connect).
 * `verifyMessage` checks the signature AND that the key is a full-access key of the account.
 * Roadmap: K3.3 · Spec: ARCHITECTURE.md §6 (onboard)
 */

import { verifyMessage } from "near-api-js/nep413";
import type { NearProvider } from "./rpc";

export interface SignInProof {
  accountId: string;
  publicKey: string;
  /** base64, as NEP-413 wallets return it */
  signature: string;
  message: string;
  /** base64 of the 32-byte nonce the server issued */
  nonce: string;
}

export function decodeNonce(nonceB64: string): Uint8Array {
  const bytes = Uint8Array.from(Buffer.from(nonceB64, "base64"));
  if (bytes.length !== 32) throw new Error("Nonce must be 32 bytes");
  return bytes;
}

/** Throws if the proof is invalid. `recipient` must be this app's identifier. */
export async function verifySignIn(proof: SignInProof, recipient: string, provider: Pick<NearProvider, "viewAccessKey">): Promise<void> {
  await verifyMessage({
    signerAccountId: proof.accountId,
    signerPublicKey: proof.publicKey,
    payload: { message: proof.message, recipient, nonce: decodeNonce(proof.nonce) },
    signature: Uint8Array.from(Buffer.from(proof.signature, "base64")),
    provider: provider as Parameters<typeof verifyMessage>[0]["provider"],
  });
}
