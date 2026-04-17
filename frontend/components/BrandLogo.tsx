import type { SVGProps } from "react";
import { useId } from "react";

type BrandLogoProps = {
  className?: string;
  variant?: "nav" | "footer";
  showSubtitle?: boolean;
  subtitle?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function BrandMarkSvg({ className, ...props }: SVGProps<SVGSVGElement>) {
  const gradientId = useId().replace(/:/g, "");
  const panelGradientId = `${gradientId}-panel`;
  const glowGradientId = `${gradientId}-glow`;
  const coreGradientId = `${gradientId}-core`;
  const accentGradientId = `${gradientId}-accent`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id={panelGradientId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#102B42" />
          <stop offset="0.58" stopColor="#174B63" />
          <stop offset="1" stopColor="#226A82" />
        </linearGradient>
        <radialGradient id={glowGradientId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20 15) rotate(45) scale(29 25)">
          <stop stopColor="#F6D9B5" stopOpacity="0.82" />
          <stop offset="0.58" stopColor="#F6D9B5" stopOpacity="0.18" />
          <stop offset="1" stopColor="#F6D9B5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={coreGradientId} x1="15" y1="16" x2="41" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBF5ED" />
          <stop offset="1" stopColor="#EFD5B0" />
        </linearGradient>
        <linearGradient id={accentGradientId} x1="39.5" y1="21" x2="49" y2="42.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8B57B" />
          <stop offset="1" stopColor="#BC773C" />
        </linearGradient>
      </defs>

      <rect x="6" y="6" width="52" height="52" rx="18" fill={`url(#${panelGradientId})`} />
      <rect x="6.75" y="6.75" width="50.5" height="50.5" rx="17.25" stroke="#F5E4CF" strokeOpacity="0.18" strokeWidth="1.5" />
      <path d="M16 18C21.5 10.7 33.7 8.7 46.2 14.4C36.8 14.1 25.9 19.1 18.5 29.3C15.7 26.4 14.8 21.5 16 18Z" fill={`url(#${glowGradientId})`} />
      <path
        d="M42.8 18.4C39.6 15.7 35.4 14.2 30.8 14.2C20.9 14.2 13 22.1 13 32C13 41.9 20.9 49.8 30.8 49.8C35.4 49.8 39.5 48.3 42.8 45.6"
        stroke={`url(#${coreGradientId})`}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="39.5" y="21" width="9.5" height="22" rx="4.75" fill={`url(#${accentGradientId})`} />
      <path d="M42.4 28.2H46.1" stroke="#FFF8EF" strokeOpacity="0.72" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M42.4 32H45" stroke="#FFF8EF" strokeOpacity="0.64" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M42.4 35.8H46.1" stroke="#FFF8EF" strokeOpacity="0.72" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function BrandLogo({
  className,
  variant = "footer",
  showSubtitle = variant === "nav",
  subtitle = "Private Credit",
}: BrandLogoProps) {
  return (
    <span className={joinClasses("credora-brand", `credora-brand--${variant}`, className)}>
      <span className="credora-brand__mark" aria-hidden="true">
        <BrandMarkSvg className="credora-brand__mark-svg" />
      </span>

      <span className="credora-brand__lockup">
        <span className="credora-brand__name">Credora</span>
        {showSubtitle ? <span className="credora-brand__subtitle">{subtitle}</span> : null}
      </span>
    </span>
  );
}