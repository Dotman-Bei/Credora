"use client";

import { AppProviders } from "../providers/AppProviders";
import { FhevmProvider } from "../providers/FhevmProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <FhevmProvider>{children}</FhevmProvider>
    </AppProviders>
  );
}
