"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import BrandLogo from "./BrandLogo";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/profile", label: "Profile" },
  { href: "/score", label: "Score" },
  { href: "/borrow", label: "Borrow" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="credora-nav-shell">
      <nav
        className={`credora-nav ${isOpen ? "credora-nav--open" : ""}`}
        aria-label="Primary"
      >
        <div className="credora-nav__inner">
          <Link href="/" className="credora-nav__brand">
            <BrandLogo variant="nav" />
          </Link>

          <button
            type="button"
            className="credora-nav__toggle"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span />
            <span />
          </button>

          <div className="credora-nav__panel">
            <div className="credora-nav__links">
              {NAV_ITEMS.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`credora-nav__link ${
                      isActive ? "credora-nav__link--active" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="credora-nav__wallet">
              <div
                className={`credora-nav__status ${
                  isConnected ? "" : "credora-nav__status--idle"
                }`}
              >
                <span className="credora-nav__status-dot" />
                <span>{isConnected ? "Encrypted session" : "Wallet disconnected"}</span>
              </div>

              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  mounted,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                }) => {
                  if (!mounted) {
                    return (
                      <div className="credora-wallet-button credora-wallet-button--placeholder">
                        Loading wallet
                      </div>
                    );
                  }

                  if (!account || !chain) {
                    return (
                      <button
                        type="button"
                        className="credora-wallet-button credora-wallet-button--primary"
                        onClick={openConnectModal}
                      >
                        Connect wallet
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        type="button"
                        className="credora-wallet-button credora-wallet-button--warning"
                        onClick={openChainModal}
                      >
                        Switch network
                      </button>
                    );
                  }

                  return (
                    <div className="credora-wallet-cluster">
                      <button
                        type="button"
                        className="credora-wallet-button credora-wallet-button--ghost"
                        onClick={openChainModal}
                      >
                        {chain.hasIcon && chain.iconUrl ? (
                          <span
                            className="credora-wallet-button__icon"
                            style={{ background: chain.iconBackground ?? "transparent" }}
                          >
                            <img alt={chain.name ?? "Network icon"} src={chain.iconUrl} />
                          </span>
                        ) : null}
                        <span>{chain.name}</span>
                      </button>

                      <button
                        type="button"
                        className="credora-wallet-button credora-wallet-button--primary"
                        onClick={openAccountModal}
                      >
                        <span>{account.displayName}</span>
                      </button>
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
