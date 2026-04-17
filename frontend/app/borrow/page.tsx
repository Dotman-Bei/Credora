"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useCreditEngine } from "../../hooks/useCreditEngine";
import { useLendingPool } from "../../hooks/useLendingPool";
import { useEncryptedProfile } from "../../hooks/useEncryptedProfile";
import { LoanStatus } from "../../contracts/credoraAbis";

const LOAN_TIERS = [
  {
    tier: "A",
    range: "700 - 850",
    rate: "5.00% APR",
    max: "10 ETH max",
    color: "var(--success)",
  },
  {
    tier: "B",
    range: "500 - 699",
    rate: "12.00% APR",
    max: "5 ETH max",
    color: "var(--warning)",
  },
  {
    tier: "C",
    range: "300 - 499",
    rate: "Not eligible",
    max: "No offer",
    color: "var(--error)",
  },
];




export default function BorrowPage() {
  const { isConnected } = useAccount();
  const { hasProfile } = useEncryptedProfile();
  const { hasScore, decryptedScore, tier } = useCreditEngine();
  const {
    loanStatus,
    loanStatusLabel,
    loanDetails,
    repaymentEth,
    liquidityEth,
    isRequesting,
    isFinalizing,
    isRepaying,
    isConfirming,
    requestError,
    finalizeError,
    repayError,
    fulfillTxHash,
    requestLoan,
    repay,
  } = useLendingPool();

  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowTxHash, setBorrowTxHash] = useState<`0x${string}` | null>(null);
  const [optimisticRepaid, setOptimisticRepaid] = useState(false);

  const isPending = isRequesting || isFinalizing;

  // Treat as repaid optimistically once the wallet confirms, before the block lands
  const effectiveLoanStatus = optimisticRepaid ? LoanStatus.Repaid : loanStatus;

  // Reset optimistic flag once the real status catches up
  if (optimisticRepaid && loanStatus === LoanStatus.Repaid) {
    setOptimisticRepaid(false);
  }

  // Score exists but hasn't been decrypted yet — need to go decrypt first
  const needsDecryption = isConnected && hasScore && decryptedScore === null;

  const canRequestLoan =
    isConnected &&
    hasScore &&
    decryptedScore !== null &&
    tier &&
    tier.rate > 0 &&
    (effectiveLoanStatus === LoanStatus.None ||
      effectiveLoanStatus === LoanStatus.Repaid ||
      effectiveLoanStatus === LoanStatus.Rejected ||
      effectiveLoanStatus === LoanStatus.Pending);

  const requestBlocker = (() => {
    if (!isConnected || !hasScore || decryptedScore === null || !tier || borrowTxHash || canRequestLoan) {
      return null;
    }

    if (tier.rate === 0) {
      return {
        tone: "error" as const,
        message: "Your current score does not qualify for a loan offer at this time.",
      };
    }

    if (effectiveLoanStatus === LoanStatus.Active) {
      return {
        tone: "info" as const,
        message: "You already have an active loan. Repay the current position before requesting another one.",
      };
    }

    return null;
  })();

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowAmount || Number(borrowAmount) <= 0 || !tier) return;
    const hash = await requestLoan(borrowAmount, {
      eligible: tier.rate > 0,
      rateBps: Math.round(tier.rate * 100),
    });
    if (hash) {
      setBorrowTxHash(hash);
      setBorrowAmount("");
    }
  };

  const handleRepay = async () => {
    const hash = await repay();
    if (hash) {
      setOptimisticRepaid(true);
      setBorrowTxHash(null);
    }
  };

  return (
    <main className="credora-page">
      <header className="credora-page__header credora-animate-in">
        <p className="credora-page__eyebrow">Confidential borrowing</p>
        <h1 className="credora-page__title">
          Borrow against an encrypted score without disclosing the score itself.
        </h1>
        <p className="credora-page__subtitle">
          The lending pool consumes threshold outcomes and pricing tiers derived
          from encrypted computation. It does not need to inspect the borrower&apos;s
          raw score to decide whether a loan can be issued.
        </p>
      </header>

      <div className="credora-data-grid credora-animate-in">
        <div className="credora-data-item">
          <div className="credora-data-item__label">Pool liquidity</div>
          <div className="credora-data-item__value credora-data-item__value--accent">
            {liquidityEth ? `${Number(liquidityEth).toFixed(4)} ETH` : "---"}
          </div>
        </div>
        <div className="credora-data-item">
          <div className="credora-data-item__label">Your score</div>
          <div className="credora-data-item__value">
            {decryptedScore !== null ? decryptedScore : hasScore ? "Encrypted" : "Not computed"}
          </div>
        </div>
        <div className="credora-data-item">
          <div className="credora-data-item__label">Tier</div>
          <div className="credora-data-item__value" style={{ color: tier?.color }}>
            {tier ? `Tier ${tier.tier}` : "---"}
          </div>
        </div>
        <div className="credora-data-item">
          <div className="credora-data-item__label">Loan state</div>
          <div className="credora-data-item__value">{optimisticRepaid ? "Repaid" : (loanStatusLabel || "None")}</div>
        </div>
      </div>

      {!isConnected && (
        <div style={{ marginTop: 32 }} className="credora-alert credora-alert--info credora-animate-in">
          Connect your wallet to request or repay a loan.
        </div>
      )}

      {isConnected && !hasProfile && (
        <div className="credora-card credora-empty-state credora-animate-in" style={{ marginTop: "2rem", textAlign: "center" }}>
          <h2 className="credora-card__title">No encrypted profile found</h2>
          <p className="credora-card__desc">
            To access lending services, you must first create an encrypted borrower
            profile. Your financial data is encrypted on-chain and never exposed
            to the lending pool directly.
          </p>
          <div className="credora-hero__actions" style={{ justifyContent: "center" }}>
            <Link href="/profile" className="credora-btn credora-btn--primary">
              Create encrypted profile
            </Link>
          </div>
        </div>
      )}

      {isConnected && hasProfile && !hasScore && (
        <div className="credora-card credora-empty-state credora-animate-in">
          <h2 className="credora-card__title">No confidential score available</h2>
          <p className="credora-card__desc">
            Compute a score first so the lending pool can run encrypted threshold
            checks against your borrower profile.
          </p>
          <div className="credora-hero__actions">
            <Link href="/score" className="credora-btn credora-btn--primary">
              Compute score
            </Link>
          </div>
        </div>
      )}

      {isConnected && hasScore && needsDecryption && (
        <div
          className="credora-card credora-empty-state credora-animate-in"
          style={{ marginTop: 32 }}
        >
          <h2 className="credora-card__title">Score not yet decrypted</h2>
          <p className="credora-card__desc">
            Your encrypted score has been computed but needs to be decrypted
            before the lending pool can determine your borrowing tier.
          </p>
          <div className="credora-hero__actions" style={{ justifyContent: "center" }}>
            <Link href="/score" className="credora-btn credora-btn--primary">
              Decrypt score
            </Link>
          </div>
        </div>
      )}

      {isConnected && hasScore && !needsDecryption && (
        <div className="credora-split" style={{ marginTop: 32 }}>
          <section className="credora-card credora-animate-in">
            <p className="credora-kicker">Loan request</p>
            <h2 className="credora-card__title">Request a private loan decision</h2>
            <p className="credora-card__desc">
              The pool runs encrypted threshold logic on your score and only learns
              the minimum decision output required to issue or reject the loan.
            </p>
            {requestError && <div className="credora-alert credora-alert--error">{requestError}</div>}
            {finalizeError && <div className="credora-alert credora-alert--error">{finalizeError}</div>}

            {canRequestLoan && !borrowTxHash && (
              <form onSubmit={handleBorrow}>
                <div className="credora-input-group">
                  <label className="credora-label">Borrow amount (ETH)</label>
                  <input
                    type="number"
                    className="credora-input"
                    placeholder={tier ? `Max ${tier.maxLoan} ETH` : "0.0"}
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    min={0}
                    step="0.01"
                    max={tier?.maxLoan}
                    disabled={isPending}
                  />
                  <div className="credora-input-hint">
                    {tier
                      ? `Tier ${tier.tier} can borrow up to ${tier.maxLoan} ETH at ${tier.rate}% APR.`
                      : "A computed tier is required before loan pricing can be assigned."}
                  </div>
                </div>

                <button
                  type="submit"
                  className="credora-btn credora-btn--primary credora-btn--full"
                  disabled={!borrowAmount || Number(borrowAmount) <= 0 || isPending}
                >
                  {isPending ? (
                    <>
                      <span className="credora-spinner" />
                      {isRequesting
                        ? "Submitting loan request..."
                        : isFinalizing
                          ? "Finalizing loan decision..."
                          : "Confirming..."}
                    </>
                  ) : (
                    <>Request loan</>
                  )}
                </button>
              </form>
            )}

            {borrowTxHash && (
              <div className="credora-alert credora-alert--success" style={{ marginTop: 16 }}>
                Loan request submitted successfully.
                <a
                  href={`https://sepolia.etherscan.io/tx/${borrowTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="credora-tx-link"
                >
                  View request transaction
                </a>
                {fulfillTxHash && (
                  <>
                    {" "}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${fulfillTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="credora-tx-link"
                    >
                      View fulfillment transaction
                    </a>
                  </>
                )}
              </div>
            )}

            {requestBlocker && (
              <div
                className={`credora-alert ${
                  requestBlocker.tone === "error" ? "credora-alert--error" : "credora-alert--info"
                }`}
                style={{ marginTop: 16 }}
              >
                {requestBlocker.message}
              </div>
            )}
          </section>

          <div className="credora-stack">
            {effectiveLoanStatus === LoanStatus.Active && loanDetails ? (
              <section className="credora-card credora-card--glow credora-animate-in">
                <p className="credora-kicker">Active loan</p>
                <h3 className="credora-card__title">Current repayment snapshot</h3>
                <div className="credora-data-grid">
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Principal</div>
                    <div className="credora-data-item__value credora-data-item__value--accent">
                      {loanDetails.principalEth} ETH
                    </div>
                  </div>
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Interest rate</div>
                    <div className="credora-data-item__value">{loanDetails.ratePercent}%</div>
                  </div>
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Opened on</div>
                    <div className="credora-data-item__value">
                      {new Date(Number(loanDetails.startTime) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Total owed</div>
                    <div className="credora-data-item__value credora-data-item__value--accent">
                      {repaymentEth ? `${Number(repaymentEth).toFixed(6)} ETH` : "---"}
                    </div>
                  </div>
                </div>

                {repayError && <div className="credora-alert credora-alert--error">{repayError}</div>}

                <button
                  className="credora-btn credora-btn--primary credora-btn--full"
                  disabled={isPending || !repaymentEth}
                  onClick={handleRepay}
                >
                  {isRepaying || isConfirming ? (
                    <>
                      <span className="credora-spinner" />
                      Processing repayment...
                    </>
                  ) : (
                    <>Repay {repaymentEth ? `${Number(repaymentEth).toFixed(6)} ETH` : "loan"}</>
                  )}
                </button>
              </section>
            ) : effectiveLoanStatus === LoanStatus.Repaid ? (
              <section className="credora-card credora-animate-in">
                <div className="credora-badge credora-badge--success">Loan repaid</div>
                <h3 className="credora-card__title">Position settled</h3>
                <p className="credora-card__desc">
                  The active loan has been closed. You can request a new loan whenever
                  the current tier still qualifies.
                </p>
              </section>
            ) : (
              <section className="credora-card credora-animate-in">
                <p className="credora-kicker">Disclosure boundary</p>
                <h3 className="credora-card__title">The pool operates on a narrow output.</h3>
                <ul className="credora-bullet-list">
                  <li>Borrower score stays encrypted through the eligibility check.</li>
                  <li>The gateway reveals only the boolean and pricing output.</li>
                  <li>Loan terms can be issued without exposing the raw number.</li>
                </ul>
              </section>
            )}

            <section className="credora-card credora-animate-in">
              <p className="credora-kicker">Rate tiers</p>
              <h3 className="credora-card__title">Pricing bands derived from score thresholds</h3>
              <p className="credora-card__desc">
                Tiers are based on encrypted score comparisons. The pool does not see
                the underlying score value to assign a rate.
              </p>

              <div className="credora-tier-list">
                {LOAN_TIERS.map((item) => (
                  <div key={item.tier} className="credora-tier-row" style={{ borderLeftColor: item.color }}>
                    <div className="credora-tier-row__meta">
                      <span className="credora-tier-row__title" style={{ color: item.color }}>
                        Tier {item.tier}
                      </span>
                      <span className="credora-tier-row__range">{item.range}</span>
                    </div>
                    <div>
                      <div className="credora-tier-row__rate">{item.rate}</div>
                      <div className="credora-tier-row__note">{item.max}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
