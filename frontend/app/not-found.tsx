import Link from "next/link";

export default function NotFound() {
  return (
    <main className="credora-page">
      <section className="credora-card credora-empty-state">
        <p className="credora-page__eyebrow">Page not found</p>
        <h1 className="credora-card__title">The route you requested does not exist.</h1>
        <p className="credora-card__desc">
          Return to the main experience to continue exploring the confidential
          credit workflow.
        </p>
        <div className="credora-hero__actions">
          <Link href="/" className="credora-btn credora-btn--primary">
            Back to overview
          </Link>
        </div>
      </section>
    </main>
  );
}