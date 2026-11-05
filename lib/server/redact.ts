/**
 * Scrubs secrets from text before it is logged: values of sensitive env vars, credentials in URLs,
 * and anything shaped like a NEAR private key. Library error messages can echo connection strings.
 * Roadmap: K8.7
 */

export const SECRET_ENV_VARS = ["KEEPER_PRIVATE_KEY", "ONECLICK_JWT", "SESSION_SECRET", "DATABASE_URL"] as const;

export function redact(text: string, env: Record<string, string | undefined> = process.env): string {
  let out = text;
  for (const name of SECRET_ENV_VARS) {
    const value = env[name];
    if (value && value.length >= 8) out = out.split(value).join(`[${name}]`);
  }
  return out
    .replace(/(\w+:\/\/)[^\s/@:]+:[^\s/@]+@/g, "$1[credentials]@")
    .replace(/(ed25519|secp256k1):[1-9A-HJ-NP-Za-km-z]{60,}/g, "$1:[private-key]");
}
