"use client";

import { useState, useEffect, useRef } from "react";

const TRACE_LINES = [
  { op: "FHE.asEuint64", args: "income", result: "handle_0x7a3f", color: "#1e6386" },
  { op: "FHE.asEuint64", args: "assets", result: "handle_0x8b2e", color: "#1e6386" },
  { op: "FHE.asEuint64", args: "liabilities", result: "handle_0xc91d", color: "#1e6386" },
  { op: "FHE.mul", args: "income, 3", result: "handle_0xd4a1", color: "#786d9f" },
  { op: "FHE.mul", args: "assets, 2", result: "handle_0xe5b2", color: "#786d9f" },
  { op: "FHE.mul", args: "liabilities, 5", result: "handle_0xf6c3", color: "#786d9f" },
  { op: "FHE.add", args: "base, boost", result: "handle_0x12ab", color: "#1f7a57" },
  { op: "FHE.ge", args: "positive, penalty", result: "ebool_0x34cd", color: "#bc773c" },
  { op: "FHE.sub", args: "positive, penalty", result: "handle_0x56ef", color: "#1f7a57" },
  { op: "FHE.select", args: "safe?, diff, 0", result: "handle_0x78ab", color: "#bc773c" },
  { op: "FHE.lt", args: "raw, 300", result: "ebool_0x9acd", color: "#bc773c" },
  { op: "FHE.select", args: "below?, 300, raw", result: "handle_0xbcef", color: "#bc773c" },
  { op: "FHE.gt", args: "clamped, 850", result: "ebool_0xde01", color: "#bc773c" },
  { op: "FHE.select", args: "above?, 850, score", result: "final_score", color: "#1f7a57" },
  { op: "FHE.allow", args: "score → user", result: "acl_granted", color: "#1e6386" },
  { op: "FHE.allow", args: "score → pool", result: "acl_granted", color: "#1e6386" },
];

const MODULES = [
  { label: "InputVerifier", status: "ready" },
  { label: "FHEExecutor", status: "ready" },
  { label: "ACL Manager", status: "ready" },
  { label: "KMS Verifier", status: "ready" },
];

const STATS = [
  { label: "Coprocessor", value: "Zama TFHE" },
  { label: "Cipher", value: "euint64" },
  { label: "Network", value: "Sepolia" },
  { label: "Ops/score", value: "16" },
];

export default function FHERuntimePanel() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [activeModule, setActiveModule] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const traceRef = useRef<HTMLDivElement>(null);

  // Animate trace lines appearing one by one
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= TRACE_LINES.length) {
          // Reset after a pause
          setTimeout(() => {
            setVisibleLines(0);
            setCycleCount((c) => c + 1);
          }, 2000);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [cycleCount]);

  // Rotate active module indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % MODULES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll trace
  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight;
    }
  }, [visibleLines]);

  const progress = Math.round((visibleLines / TRACE_LINES.length) * 100);

  return (
    <div className="fhe-runtime">
      {/* Header bar */}
      <div className="fhe-runtime__header">
        <div className="fhe-runtime__header-left">
          <span className="fhe-runtime__dot fhe-runtime__dot--green" />
          <span className="fhe-runtime__label">LIVE CREDORA COMPUTE ENGINE</span>
        </div>
        <div className="fhe-runtime__header-right">
          <span className="fhe-runtime__timer">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="fhe-runtime__stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="fhe-runtime__stat">
            <span className="fhe-runtime__stat-label">{stat.label}</span>
            <span className="fhe-runtime__stat-value">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Module status */}
      <div className="fhe-runtime__modules">
        {MODULES.map((mod, i) => (
          <div key={mod.label} className={`fhe-runtime__module ${i === activeModule ? "fhe-runtime__module--active" : ""}`}>
            <span className={`fhe-runtime__dot ${i === activeModule ? "fhe-runtime__dot--pulse" : "fhe-runtime__dot--dim"}`} />
            <span className="fhe-runtime__module-label">{mod.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="fhe-runtime__progress-wrap">
        <div className="fhe-runtime__progress-bar">
          <div className="fhe-runtime__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="fhe-runtime__progress-text">
          {visibleLines < TRACE_LINES.length ? `${progress}% — computing` : "100% — complete"}
        </span>
      </div>

      {/* Execution trace */}
      <div className="fhe-runtime__trace" ref={traceRef}>
        {TRACE_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="fhe-runtime__trace-line fhe-runtime__trace-line--enter">
            <span className="fhe-runtime__trace-idx">{String(i + 1).padStart(2, "0")}</span>
            <span className="fhe-runtime__trace-op" style={{ color: line.color }}>{line.op}</span>
            <span className="fhe-runtime__trace-args">({line.args})</span>
            <span className="fhe-runtime__trace-arrow">→</span>
            <span className="fhe-runtime__trace-result">{line.result}</span>
          </div>
        ))}
        {visibleLines < TRACE_LINES.length && (
          <div className="fhe-runtime__cursor">
            <span className="fhe-runtime__cursor-blink">█</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fhe-runtime__footer">
        <span>All operations on ciphertext — zero plaintext exposure</span>
      </div>
    </div>
  );
}
