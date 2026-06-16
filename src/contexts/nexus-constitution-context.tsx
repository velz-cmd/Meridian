"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ConstitutionPermitPayload } from "@/hooks/use-constitution-permit";

type ConstitutionContextValue = {
  payload: ConstitutionPermitPayload | null;
  loading: boolean;
  error: string | null;
  canExecuteBuy: boolean;
};

const ConstitutionContext = createContext<ConstitutionContextValue>({
  payload: null,
  loading: false,
  error: null,
  canExecuteBuy: true,
});

export function ConstitutionProvider({
  value,
  children,
}: {
  value: ConstitutionContextValue;
  children: ReactNode;
}) {
  return <ConstitutionContext.Provider value={value}>{children}</ConstitutionContext.Provider>;
}

export function useConstitution() {
  return useContext(ConstitutionContext);
}
