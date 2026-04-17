"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import ScoreGauge from "../../components/ScoreGauge";
import { useEncryptedProfile } from "../../hooks/useEncryptedProfile";
import { useCreditEngine } from "../../hooks/useCreditEngine";



export default function ScorePage() {
  const { isConnected } = useAccount();
  const { hasProfile } = useEncryptedProfile();
  const {
    hasScore,
    decryptedScore,
    tier,
    isComputing,
    isConfirmingCompute,
    isComputeSuccess,
    computeError,
    computeTxHash,
    isDecrypting,
    isConfirmingDecrypt,
    isDecryptSuccess,
    decryptError,
    decryptTxHash,
    computeScore,
    decryptScore,
  } = useCreditEngine();

  const isPendingCompute = isComputing || isConfirmingCompute;
  const isPendingDecrypt = isDecrypting || isConfirmingDecrypt;

  // Only show 'Refresh encrypted score' if both score is computed and decrypted
  const showRefresh = hasScore && decryptedScore !== null;
  const showOutcomeCard = decryptedScore !== null && Boolean(tier);

  return (
    <main className="credora-page">
      <header className="credora-page__header credora-animate-in">
        <p className="credora-page__eyebrow">Confidential score engine</p>
        <h1 className="credora-page__title">
          Compute the score on encrypted inputs, then reveal it only to the borrower.
        </h1>
        <p className="credora-page__subtitle">
          The credit engine runs on ciphertext-backed profile data. Borrowers can
          privately decrypt the final score, while downstream lending logic can act
          on tier and eligibility outputs.
        </p>
      </header>

      {!isConnected && (
        <div className="credora-alert credora-alert--info credora-animate-in">
          Connect your wallet to compute or decrypt a credit score.
        </div>
      )}

      {isConnected && !hasProfile && (
        <div className="credora-card credora-empty-state credora-animate-in">
          <h2 className="credora-card__title">No encrypted profile found</h2>
          <p className="credora-card__desc">
            Create a borrower profile first so the score engine has encrypted input
            values to work with.
          </p>
          <div className="credora-hero__actions">
            <Link href="/profile" className="credora-btn credora-btn--primary">
              Create profile
            </Link>
          </div>
        </div>
      )}

      {isConnected && hasProfile && (
        <div className="credora-split">
          {/* Left — Score display */}
          <div className="credora-stack">
            <section className="credora-card credora-card--glow credora-animate-in">
              <p className="credora-kicker">Current standing</p>
              <h2 className="credora-card__title">Your confidential score lives here.</h2>
              <p className="credora-card__desc">
                The number is not decrypted automatically. Borrowers choose when to
                reveal it back into their own session.
              </p>

              <ScoreGauge score={decryptedScore} />

              {tier && (
                <div className="credora-data-grid">
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Tier</div>
                    <div className="credora-data-item__value" style={{ color: tier.color }}>
                      {tier.tier}
                    </div>
                  </div>
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Rating</div>
                    <div className="credora-data-item__value">{tier.label}</div>
                  </div>
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Interest rate</div>
                    <div className="credora-data-item__value">
                      {tier.rate > 0 ? `${tier.rate}% APR` : "Not lendable"}
                    </div>
                  </div>
                  <div className="credora-data-item">
                    <div className="credora-data-item__label">Loan ceiling</div>
                    <div className="credora-data-item__value">
                      {tier.maxLoan > 0 ? `${tier.maxLoan} ETH` : "N/A"}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {showOutcomeCard && tier && (
              <section
                className={`credora-card ${tier.rate > 0 ? "credora-card--hero " : ""}credora-animate-in`}
              >
                <p className="credora-kicker">Next step</p>
                {tier.rate > 0 ? (
                  <>
                    <h3 className="credora-card__title">Eligible for the lending pool</h3>
                    <p className="credora-card__desc">
                      Tier {tier.tier} currently supports borrowing up to {tier.maxLoan} ETH
                      at {tier.rate}% APR.
                    </p>
                    <Link href="/borrow" className="credora-btn credora-btn--secondary credora-btn--full">
                      Open the borrowing flow
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="credora-card__title">Not currently eligible for borrowing</h3>
                    <p className="credora-card__desc">
                      Your current score does not meet the lending threshold. Update
                      your encrypted profile and recompute the score to be considered
                      again.
                    </p>
                    <Link href="/profile" className="credora-btn credora-btn--secondary credora-btn--full">
                      Update encrypted profile
                    </Link>
                  </>
                )}
              </section>
            )}
          </div>

          {/* Right — Actions */}
          <div className="credora-stack">
            {/* Step 1: Compute */}
            <section className="credora-card credora-animate-in">
              <p className="credora-kicker">Step 1 — Compute</p>
              <h3 className="credora-card__title">
                {showRefresh ? "Refresh encrypted score" : "Generate encrypted score"}
              </h3>
              <p className="credora-card__desc">
                {hasScore
                  ? "Re-run the scoring logic after updating the borrower profile."
                  : "Execute the FHE credit model on the encrypted borrower profile."
                }
              </p>

              {computeError && <div className="credora-alert credora-alert--error">{computeError}</div>}

              {isComputeSuccess && (
                <div className="credora-alert credora-alert--success">
                  Encrypted score computed successfully.
                  {computeTxHash && (
                    <>
                      {" "}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${computeTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="credora-tx-link"
                      >
                        Review transaction on Etherscan
                      </a>
                    </>
                  )}
                </div>
              )}

              <button
                className="credora-btn credora-btn--primary credora-btn--full"
                disabled={isPendingCompute}
                onClick={computeScore}
              >
                {isPendingCompute ? (
                  <>
                    <span className="credora-spinner" />
                    {isComputing ? "Awaiting wallet confirmation..." : "Confirming on-chain..."}
                  </>
                ) : (
                  <>Compute encrypted score</>
                )}
              </button>
            </section>

            {/* Step 2: Decrypt — always shown after score is computed */}
            {hasScore && (
              <section className="credora-card credora-animate-in">
                <p className="credora-kicker">Step 2 — Decrypt</p>
                <h3 className="credora-card__title">Reveal the score to the borrower only</h3>
                <p className="credora-card__desc">
                  Decryption is requested through an on-chain transaction that grants
                  access and reveals the encrypted score to your wallet session.
                </p>

                {decryptError && <div className="credora-alert credora-alert--error">{decryptError}</div>}

                {isDecryptSuccess && decryptTxHash && (
                  <div className="credora-alert credora-alert--success">
                    Score decrypted successfully.
                    <a
                      href={`https://sepolia.etherscan.io/tx/${decryptTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="credora-tx-link"
                    >
                      View transaction
                    </a>
                  </div>
                )}

                <button
                  className="credora-btn credora-btn--secondary credora-btn--full"
                  disabled={isPendingDecrypt}
                  onClick={decryptScore}
                >
                  {isPendingDecrypt ? (
                    <>
                      <span className="credora-spinner" />
                      {isDecrypting ? "Awaiting wallet confirmation..." : "Decrypting on-chain..."}
                    </>
                  ) : (
                    <>Decrypt my score</>
                  )}
                </button>
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
