"use client";

/**
 * Data hooks (TanStack Query). A 401 from /api/vault means "signed out", not an error.
 * Roadmap: K6.x
 */

import { useQuery } from "@tanstack/react-query";
import { api, ApiError, type BuyDto, type TokenDto, type VaultResponse } from "./api";

export type VaultQuery = { signedIn: false } | ({ signedIn: true } & VaultResponse);

export function useVault() {
  return useQuery<VaultQuery>({
    queryKey: ["vault"],
    queryFn: async () => {
      try {
        return { signedIn: true, ...(await api<VaultResponse>("/api/vault")) };
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return { signedIn: false };
        throw e;
      }
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useBuys(enabled: boolean) {
  return useQuery({
    queryKey: ["buys"],
    queryFn: async () => (await api<{ buys: BuyDto[] }>("/api/buys")).buys,
    enabled,
    refetchInterval: 20_000,
  });
}

export function useTokens() {
  return useQuery({
    queryKey: ["tokens"],
    queryFn: async () => (await api<{ tokens: TokenDto[] }>("/api/tokens")).tokens,
    staleTime: 5 * 60_000,
  });
}
