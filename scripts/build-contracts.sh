#!/usr/bin/env bash
# Builds factory + vault wasm with cargo-near (output: contracts/target/near/<crate>/).
# Reproducible (docker) builds for deployment: K1.13.
set -euo pipefail
cd "$(dirname "$0")/../contracts"
for crate in vault factory; do
  (cd "$crate" && cargo near build non-reproducible-wasm --no-abi)
done
