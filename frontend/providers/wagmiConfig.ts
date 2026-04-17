"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Credora",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo",
  chains: [sepolia],
  ssr: true,
});
