"use client";

import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

type HomeActionButtonsProps = {
  primaryHref?: string;
  primaryConnectedLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export default function HomeActionButtons({
  primaryHref = "/profile",
  primaryConnectedLabel,
  secondaryHref,
  secondaryLabel,
}: HomeActionButtonsProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <div className="credora-hero__actions">
      {isConnected ? (
        <Link href={primaryHref} className="credora-btn credora-btn--primary">
          {primaryConnectedLabel}
        </Link>
      ) : (
        <button
          type="button"
          className="credora-btn credora-btn--primary"
          onClick={() => openConnectModal?.()}
        >
          Connect wallet
        </button>
      )}

      <Link href={secondaryHref} className="credora-btn credora-btn--secondary">
        {secondaryLabel}
      </Link>
    </div>
  );
}