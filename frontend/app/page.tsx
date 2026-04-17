import dynamic from "next/dynamic";
import HomeActionButtons from "../components/HomeActionButtons";

const FHERuntimePanel = dynamic(() => import("../components/FHERuntimePanel"), {
  ssr: false,
  loading: () => (
    <div className="credora-runtime-skeleton" aria-hidden="true">
      <span className="credora-runtime-skeleton__line credora-runtime-skeleton__line--short" />
      <span className="credora-runtime-skeleton__line" />
      <span className="credora-runtime-skeleton__line" />
      <span className="credora-runtime-skeleton__line credora-runtime-skeleton__line--long" />
    </div>
  ),
});

const HOME_METRICS = [
  {
    label: "Published borrower fields",
    value: "0",
    copy: "Income, assets, and liabilities stay encrypted end to end.",
  },
  {
    label: "Confidential underwriting for lenders",
    value: "1 signal",
    copy: "Pools can work with eligibility and rate data without viewing raw profiles.",
  },
  {
    label: "Score band",
    value: "300 - 850",
    copy: "The engine maps confidential arithmetic into a familiar credit range.",
  },
  {
    label: "Deployment network",
    value: "Sepolia",
    copy: "Designed for fhEVM-style experimentation and lending workflow demos.",
  },
];

const FEATURE_CARDS = [
  {
    number: "01",
    title: "Borrower data is encrypted before submission",
    desc: "Credora treats the browser as the privacy boundary. Values are encrypted locally, then signed and sent as ciphertext-backed handles.",
  },
  {
    number: "02",
    title: "The score is computed directly on encrypted values",
    desc: "Income, assets, and liabilities are combined with homomorphic operations so the protocol never needs to decrypt the working data.",
  },
  {
    number: "03",
    title: "Loan decisions expose only the minimum useful signal",
    desc: "Lending logic can consume tier, eligibility, and pricing outputs while the borrower retains control over the full score reveal.",
  },
];

const PROCESS_STEPS = [
  {
    index: "01",
    title: "Capture the profile privately",
    copy: "The borrower fills in financial information once, inside a wallet-connected session, and the app converts those fields into encrypted handles.",
  },
  {
    index: "02",
    title: "Run confidential underwriting on-chain",
    copy: "The credit engine performs arithmetic and threshold checks on ciphertext so the protocol can derive a score without ever touching plaintext values.",
  },
  {
    index: "03",
    title: "Reveal only what the next step needs",
    copy: "Borrowers can request private decryption for inspection, while the lending pool can move on a narrow decision output instead of a full financial dossier.",
  },
];

const LENDER_SIGNALS = [
  "Borrower tier eligibility is resolved without exposing the underlying score.",
  "Pricing terms and loan ceilings are derived from encrypted threshold checks.",
  "Every underwriting decision is recorded as a verifiable on-chain transaction.",
  "No plaintext income, asset, or liability data is disclosed at any point.",
];

export default function HomePage() {
  return (
    <main className="credora-page credora-page--home">
      <section className="credora-home-hero">
        <div className="credora-home-hero__copy credora-animate-in">
          <p className="credora-kicker">Private credit infrastructure</p>
          <h1 className="credora-home-hero__title">
            Underwrite borrowers without putting their financial lives on-chain.
          </h1>
          <p className="credora-home-hero__subtitle">
            Credora encrypts borrower inputs in the browser, computes a score with
            confidential arithmetic, and lets lenders operate on a narrow decision
            surface instead of exposed personal data.
          </p>

          <HomeActionButtons
            primaryConnectedLabel="Create encrypted profile"
            secondaryHref="/score"
            secondaryLabel="Explore the score flow"
          />
        </div>

        <div className="credora-home-hero__panel credora-animate-in">
          <FHERuntimePanel />
        </div>
      </section>

      <section className="credora-home-metrics">
        <div className="credora-section-heading credora-animate-in" style={{ gridColumn: "1 / -1", marginTop: "2rem", marginBottom: "0.5rem" }}>
          <p className="credora-kicker">Protocol at a glance</p>
        </div>
        {HOME_METRICS.map((metric, index) => (
          <article key={metric.label} className="credora-home-metric credora-animate-in">
            <span className="credora-home-metric__label">0{index + 1}</span>
            <span className="credora-home-metric__value">{metric.value}</span>
            <p className="credora-home-metric__copy">
              <strong>{metric.label}.</strong> {metric.copy}
            </p>
          </article>
        ))}
      </section>

      <section className="credora-home-section">
        <div className="credora-section-heading credora-animate-in" style={{ marginBottom: "2rem" }}>
          <p className="credora-kicker">How it works</p>
          <h2 className="credora-section-heading__title" style={{ fontSize: "1.4rem" }}>
            A lending product shaped around confidentiality from the first input.
          </h2>
        </div>

        <div className="credora-features">
          {FEATURE_CARDS.map((feature) => (
            <article key={feature.number} className="credora-feature credora-animate-in">
              <div className="credora-feature__icon">{feature.number}</div>
              <h3 className="credora-feature__title">{feature.title}</h3>
              <p className="credora-feature__desc">{feature.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="credora-home-showcase credora-split">
        <article className="credora-card credora-animate-in">
          <p className="credora-kicker">Workflow</p>
          <h2 className="credora-card__title">
            The borrower path stays readable even though the important arithmetic
            remains hidden.
          </h2>

          <div className="credora-process-list">
            {PROCESS_STEPS.map((step) => (
              <div key={step.index} className="credora-process-list__item">
                <span className="credora-process-list__index">{step.index}</span>
                <div>
                  <div className="credora-process-list__title">{step.title}</div>
                  <p className="credora-process-list__copy">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="credora-card credora-card--hero credora-animate-in">
          <p className="credora-kicker">What lenders see</p>
          <h2 className="credora-card__title">
            Pools operate on outputs, not inputs.
          </h2>
          <p className="credora-card__desc">
            Lenders never access borrower financials. They receive a tier, a rate,
            and a loan ceiling, enough to price risk and allocate capital. Nothing more.
          </p>

          <ul className="credora-bullet-list">
            {LENDER_SIGNALS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="credora-home-cta credora-animate-in">
        <p className="credora-kicker">Start the flow</p>
        <h2 className="credora-home-cta__title">
          Move through the full private credit path from encrypted intake to loan
          access without switching visual context or disclosure rules.
        </h2>
        <HomeActionButtons
          primaryConnectedLabel="Open borrower setup"
          secondaryHref="/borrow"
          secondaryLabel="Inspect lending terms"
        />
      </section>
    </main>
  );
}
