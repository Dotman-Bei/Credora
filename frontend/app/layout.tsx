import type { Metadata } from "next";
import { JetBrains_Mono, Inter, Space_Grotesk, Playfair_Display } from "next/font/google";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { ClientProviders } from "./client-providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-hero-face",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-hero-face",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Credora — Private Credit Infrastructure",
    template: "%s | Credora",
  },
  description:
    "Encrypted borrower profiles, on-chain confidential scoring, and private loan eligibility for modern DeFi lending.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable}`}>
        <ClientProviders>
          <div className="credora-app-shell">
            <Navbar />
            <div className="credora-app-shell__content">{children}</div>
            <Footer />
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
