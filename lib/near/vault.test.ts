import { ContractExecutionError, InvalidTransactionError, RpcError, TransactionExecutionError, TransactionTimeoutError } from "near-api-js/rpc-errors";
import { describe, expect, it } from "vitest";
import { isClearTxFailure } from "./vault";

// Roadmap: K13.2. Instances made without constructors: only the class matters here.
const as = <T extends object>(cls: { prototype: T }) => Object.create(cls.prototype) as T;

describe("isClearTxFailure", () => {
  it("treats contract refusals and failed or rejected transactions as clear failures", () => {
    expect(isClearTxFailure(as(ContractExecutionError))).toBe(true);
    expect(isClearTxFailure(as(TransactionExecutionError))).toBe(true);
    expect(isClearTxFailure(as(InvalidTransactionError))).toBe(true);
  });

  it("treats timeouts, RPC trouble and network errors as unknown", () => {
    expect(isClearTxFailure(as(TransactionTimeoutError))).toBe(false);
    expect(isClearTxFailure(as(RpcError))).toBe(false);
    expect(isClearTxFailure(new TypeError("fetch failed"))).toBe(false);
    expect(isClearTxFailure("boom")).toBe(false);
  });
});
