"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number | null;
  maxScore?: number;
  minScore?: number;
  size?: number;
  label?: string;
}

/**
 * ScoreGauge — Animated radial gauge for displaying the credit score.
 * The arc fills smoothly from 0 to the score value, with color coding by tier.
 */
export default function ScoreGauge({
  score,
  maxScore = 850,
  minScore = 300,
  size = 240,
  label = "Credit Score",
}: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Animate score counting up
  useEffect(() => {
    if (score === null) return;

    const targetScore = score;

    const duration = 1500;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * targetScore));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [score]);

  const range = maxScore - minScore;
  const normalized = score !== null ? (animatedScore - minScore) / range : 0;
  const clampedNorm = Math.max(0, Math.min(1, normalized));

  // Arc geometry
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalArc = endAngle - startAngle; // 270 degrees
  const circumference = (2 * Math.PI * radius * totalArc) / 360;
  const filled = circumference * clampedNorm;

  // Color based on tier
  const getColor = () => {
    if (score === null) return "var(--text-muted)";
    if (animatedScore >= 700) return "var(--accent-primary)";
    if (animatedScore >= 500) return "var(--warning)";
    return "var(--error)";
  };

  // Tier label
  const getTier = () => {
    if (score === null) return { label: "---", sublabel: "No score" };
    if (animatedScore >= 700) return { label: "Tier A", sublabel: "Excellent" };
    if (animatedScore >= 500) return { label: "Tier B", sublabel: "Fair" };
    return { label: "---", sublabel: "Ineligible" };
  };

  const color = getColor();
  const tier = getTier();

  // SVG arc path
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
    x: cx + r * Math.cos(((angle - 90) * Math.PI) / 180),
    y: cy + r * Math.sin(((angle - 90) * Math.PI) / 180),
  });

  const bgStart = polarToCartesian(center, center, radius, startAngle);
  const bgEnd = polarToCartesian(center, center, radius, endAngle);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

  return (
    <div className="score-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Glow filter */}
        <defs>
          <filter id="score-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="var(--gauge-track)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {mounted && score !== null && (
          <path
            d={bgPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            filter="url(#score-glow)"
            style={{
              transition: "stroke-dasharray 0.1s linear",
            }}
          />
        )}

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const angle = startAngle + t * totalArc;
          const inner = polarToCartesian(center, center, radius - strokeWidth / 2 - 4, angle);
          const outer = polarToCartesian(center, center, radius - strokeWidth / 2 - 12, angle);
          const labelPos = polarToCartesian(center, center, radius - strokeWidth / 2 - 22, angle);
          const tickScore = minScore + t * range;
          return (
            <g key={i}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="var(--text-muted)"
                strokeWidth="1.5"
                opacity="0.5"
              />
              <text
                x={labelPos.x} y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {tickScore}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Center content */}
      <div className="score-gauge__center">
        <div className="score-gauge__value" style={{ color }}>
          {score !== null ? animatedScore : "---"}
        </div>
        <div className="score-gauge__label">{label}</div>
        <div className="score-gauge__tier" style={{ color }}>
          {tier.label}
        </div>
        <div className="score-gauge__sublabel">{tier.sublabel}</div>
      </div>
    </div>
  );
}
