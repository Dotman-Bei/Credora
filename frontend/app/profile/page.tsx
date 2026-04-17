"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useEncryptedProfile, type ProfileInput } from "../../hooks/useEncryptedProfile";
import { useLendingPool } from "../../hooks/useLendingPool";

const EMPTY_PROFILE: ProfileInput = {
  income: 0,
  assets: 0,
  liabilities: 0,
};

function getDraftStorageKey(address: string) {
  return `credora_profile_draft_${address.toLowerCase()}`;
}

function getProfileStorageKey(address: string) {
  return `credora_profile_${address.toLowerCase()}`;
}

const PROFILE_FLOW = [
  {
    step: "01",
    title: "Encrypt on your device",
    copy: "Your financial details are locked and encrypted right in your browser before anything is sent.",
  },
  {
    step: "02",
    title: "Store encrypted info on-chain",
    copy: "The contract only gets encrypted references, not your actual numbers. It checks them using FHE.fromExternal().",
  },
  {
    step: "03",
    title: "Share access, stay in control",
    copy: "You can always view your own info, while the credit engine only gets the access it needs to calculate your score.",
  },
];

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const {
    hasProfile,
    isSubmitting,
    isConfirming,
    isSuccess,
    submitError,
    txHash,
    submitProfile,
    resetLocalProfile,
  } = useEncryptedProfile();
  const { resetLoanState } = useLendingPool();

  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE);
  const isEmptyForm = form.income === 0 && form.assets === 0 && form.liabilities === 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!address) {
      setForm(EMPTY_PROFILE);
      return;
    }

    const draft = window.sessionStorage.getItem(getDraftStorageKey(address));
    const storedProfile = window.sessionStorage.getItem(getProfileStorageKey(address));
    const source = draft ?? storedProfile;

    if (!source) {
      setForm(EMPTY_PROFILE);
      return;
    }

    try {
      const parsed = JSON.parse(source) as Partial<ProfileInput>;
      setForm({
        income: Number(parsed.income ?? 0),
        assets: Number(parsed.assets ?? 0),
        liabilities: Number(parsed.liabilities ?? 0),
      });
    } catch {
      setForm(EMPTY_PROFILE);
    }
  }, [address]);

  useEffect(() => {
    if (typeof window === "undefined" || !address) return;

    if (isEmptyForm) {
      window.sessionStorage.removeItem(getDraftStorageKey(address));
      return;
    }

    window.sessionStorage.setItem(getDraftStorageKey(address), JSON.stringify(form));
  }, [address, form, isEmptyForm]);

  const handleChange = (field: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: Number(e.target.value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.income <= 0) return;
    await submitProfile(form);
  };

  const handleStartNewProfile = async () => {
    // Clear any on-chain loan state (repay active / reject pending)
    try {
      await resetLoanState();
    } catch {
      // If reset fails (e.g. user rejected wallet), continue anyway —
      // the borrow page will handle the stale state.
    }

    if (typeof window !== "undefined" && address) {
      window.sessionStorage.removeItem(getDraftStorageKey(address));
      window.sessionStorage.removeItem(getProfileStorageKey(address));
      window.sessionStorage.removeItem(`credora_decrypted_${address.toLowerCase()}`);
    }

    resetLocalProfile();
    setForm(EMPTY_PROFILE);
  };

  const isValid = form.income > 0 && form.assets >= 0 && form.liabilities >= 0;
  const isPending = isSubmitting || isConfirming;
  const showResetAction = isConnected && (hasProfile || !isEmptyForm || isSuccess);

  // Determine step
  const step = isSuccess ? 3 : isPending ? 2 : 1;
  const encryptedPreview = [
    {
      key: "income",
      value: form.income > 0 ? "0x7f3a...e8b2" : "---",
    },
    {
      key: "assets",
      value: form.assets > 0 ? "0xa1c9...4d07" : "---",
    },
    {
      key: "liabilities",
      value: form.liabilities > 0 ? "0x5e2b...91fa" : "---",
    },
  ];
  return (
    <main className="credora-page">
      <header className="credora-page__header credora-animate-in">
        <p className="credora-page__eyebrow">Encrypted borrower profile</p>
        <h1 className="credora-page__title">
          Create a lending profile without publishing the balance sheet behind it.
        </h1>
        <p className="credora-page__subtitle">
          This screen is the intake boundary for the protocol. Borrower fields are
          encrypted before submission, stored as handles, and later consumed by the
          score engine under controlled permissions.
        </p>
      </header>

      {!isConnected && (
        <div className="credora-alert credora-alert--info credora-animate-in">
          Connect your wallet to encrypt and submit a borrower profile.
        </div>
      )}

      <div className="credora-steps credora-animate-in">
        <div className={`credora-step ${step >= 1 ? "credora-step--done" : ""}`} />
        <div
          className={`credora-step ${step >= 2 ? "credora-step--active" : ""} ${
            step >= 3 ? "credora-step--done" : ""
          }`}
        />
        <div className={`credora-step ${step >= 3 ? "credora-step--done" : ""}`} />
      </div>

      <div className="credora-split">
        <section className="credora-card credora-animate-in">
          <p className="credora-kicker">Borrower intake</p>
          <h2 className="credora-card__title">Financial profile</h2>
          <p className="credora-card__desc">
            Enter the borrower inputs once. The app encrypts them client-side and
            sends ciphertext-backed references to the contract.
          </p>

          {submitError && <div className="credora-alert credora-alert--error">{submitError}</div>}

          <form onSubmit={handleSubmit}>
            {showResetAction && (
              <div style={{ marginBottom: 20 }}>
                <button
                  type="button"
                  className="credora-btn credora-btn--secondary"
                  onClick={handleStartNewProfile}
                  disabled={isPending}
                >
                  Start a New Profile
                </button>
              </div>
            )}

            <div className="credora-input-group">
              <label className="credora-label">Monthly income (USD)</label>
              <input
                type="number"
                className="credora-input"
                placeholder="5000"
                value={form.income || ""}
                onChange={handleChange("income")}
                min={0}
                disabled={isPending}
              />
              <div className="credora-input-hint">Gross monthly income before taxes.</div>
            </div>

            <div className="credora-input-group">
              <label className="credora-label">Total assets (USD)</label>
              <input
                type="number"
                className="credora-input"
                placeholder="20000"
                value={form.assets || ""}
                onChange={handleChange("assets")}
                min={0}
                disabled={isPending}
              />
              <div className="credora-input-hint">Savings, investments, property, and other reserves.</div>
            </div>

            <div className="credora-input-group">
              <label className="credora-label">Total liabilities (USD)</label>
              <input
                type="number"
                className="credora-input"
                placeholder="3000"
                value={form.liabilities || ""}
                onChange={handleChange("liabilities")}
                min={0}
                disabled={isPending}
              />
              <div className="credora-input-hint">Outstanding debt obligations across loans and credit lines.</div>
            </div>

            <button
              type="submit"
              className="credora-btn credora-btn--primary credora-btn--full"
              disabled={!isConnected || !isValid || isPending}
            >
              {isPending ? (
                <>
                  <span className="credora-spinner" />
                  {isSubmitting ? "Encrypting and signing..." : "Confirming on-chain..."}
                </>
              ) : (
                <>Encrypt and submit profile</>
              )}
            </button>
          </form>

          {isSuccess && (
            <div
              className="credora-alert credora-alert--success"
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div>
                Encrypted profile submitted successfully.
                {txHash && (
                  <>
                    {" "}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="credora-tx-link"
                    >
                      Review transaction on Etherscan
                    </a>
                  </>
                )}
              </div>
              <a href="/score" className="credora-btn credora-btn--primary">
                Proceed to Score Review
              </a>
            </div>
          )}
        </section>

        <div className="credora-stack">
          <section className="credora-card credora-animate-in">
            <p className="credora-kicker">Submission path</p>
            <h3 className="credora-card__title">What happens after you submit</h3>
            <p className="credora-card__desc">
              Once you send your info, the protocol keeps things clear and simple, your private details stay private, and only what’s needed is shared with the blockchain.
            </p>

            <div className="credora-process-list">
              {PROFILE_FLOW.map((item) => (
                <div key={item.step} className="credora-process-list__item">
                  <span className="credora-process-list__index">{item.step}</span>
                  <div>
                    <div className="credora-process-list__title">{item.title}</div>
                    <p className="credora-process-list__copy">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="credora-card credora-animate-in">
            <p className="credora-kicker">Ledger preview</p>
            <h3 className="credora-card__title">
              The chain receives encrypted handles, not borrower balances.
            </h3>
            <p className="credora-card__desc">
              The contract stores opaque references and permissions. Raw values are
              never written to public state.
            </p>

            <div className="credora-preview">
              <div className="credora-preview__label">What the contract sees</div>
              {encryptedPreview.map((item) => (
                <div key={item.key} className="credora-preview__row">
                  <span className="credora-preview__key">{item.key}</span>
                  <span className="credora-preview__value">{item.value} (encrypted)</span>
                </div>
              ))}
              {/* Footnote removed as requested */}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
