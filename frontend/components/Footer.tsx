import Link from "next/link";
import BrandLogo from "./BrandLogo";

const FOOTER_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/profile", label: "Profile" },
  { href: "/score", label: "Score" },
  { href: "/borrow", label: "Borrow" },
];

const TECH_TAGS = [
  "Zama fhEVM",
  "Solidity 0.8.26",
  "Sepolia Testnet",
  "euint64",
];

export default function Footer() {
  return (
    <footer className="credora-footer">
      <div className="credora-footer__inner">
        {/* Brand + tagline */}
        <div className="credora-footer__lead">
          <Link href="/" className="credora-footer__brand">
            <BrandLogo variant="footer" />
          </Link>
          {/* Tagline removed as per request */}
        </div>

        {/* Navigation */}
        <div className="credora-footer__col">
          <p className="credora-footer__col-label">Product</p>
          <nav className="credora-footer__nav">
            {FOOTER_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="credora-footer__nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Tech stack */}
        <div className="credora-footer__col">
          <p className="credora-footer__col-label">Stack</p>
          <div className="credora-footer__tags">
            {TECH_TAGS.map((tag) => (
              <span key={tag} className="credora-footer__tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="credora-footer__divider" />

      <div className="credora-footer__bottom">
        <span className="credora-footer__copy-text">
          © {new Date().getFullYear()} Credora Protocol
        </span>
        <div className="credora-footer__bottom-links">
          <span className="credora-footer__bottom-tagline">
            Confidential credit infrastructure for public blockchains.
          </span>
        </div>
      </div>
    </footer>
  );
}
