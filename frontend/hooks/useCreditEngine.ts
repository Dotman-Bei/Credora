"use client";

/**
 * useCreditEngine — Hook for the CreditEngine contract.
 *
 * Flow: computeScore (real tx) → decryptScore (real tx + local reveal) → show score
 */

import { useState, useCallback, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CREDIT_ENGINE_ABI, DEPLOYED_ADDRESSES, type NetworkName } from "../contracts/credoraAbis";

const NETWORK: NetworkName = (process.env.NEXT_PUBLIC_NETWORK as NetworkName) || "sepolia";
const ENGINE_ADDRESS = DEPLOYED_ADDRESSES[NETWORK].CreditEngine as `0x${string}`;

const INCOME_BONUSES = [
  { threshold: 2_000, points: 40 },
  { threshold: 4_000, points: 50 },
  { threshold: 6_000, points: 60 },
  { threshold: 8_000, points: 50 },
  { threshold: 12_000, points: 30 },
  { threshold: 20_000, points: 20 },
];

const ASSET_BONUSES = [
  { threshold: 5_000, points: 30 },
  { threshold: 10_000, points: 40 },
  { threshold: 20_000, points: 50 },
  { threshold: 40_000, points: 45 },
  { threshold: 80_000, points: 35 },
];

const LIABILITY_PENALTIES = [
  { threshold: 2_000, points: 20 },
  { threshold: 5_000, points: 35 },
  { threshold: 10_000, points: 45 },
  { threshold: 20_000, points: 55 },
  { threshold: 40_000, points: 65 },
];

const RESERVE_BONUSES = [
  { margin: 5_000, points: 20 },
  { margin: 15_000, points: 35 },
  { margin: 30_000, points: 45 },
];

function sumThresholdPoints(value: number, thresholds: Array<{ threshold: number; points: number }>) {
  return thresholds.reduce(
    (total, item) => (value >= item.threshold ? total + item.points : total),
    0
  );
}

function sumReservePoints(assets: number, liabilities: number) {
  return RESERVE_BONUSES.reduce(
    (total, item) => (assets >= liabilities + item.margin ? total + item.points : total),
    0
  );
}

function calculateDecryptedScore(profile: { income?: number; assets?: number; liabilities?: number }) {
  const income = Number(profile.income ?? 0);
  const assets = Number(profile.assets ?? 0);
  const liabilities = Number(profile.liabilities ?? 0);

  const score =
    300 +
    sumThresholdPoints(income, INCOME_BONUSES) +
    sumThresholdPoints(assets, ASSET_BONUSES) +
    sumReservePoints(assets, liabilities) -
    sumThresholdPoints(liabilities, LIABILITY_PENALTIES);

  return Math.min(850, Math.max(300, score));
}

export function useCreditEngine() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Compute state
  const [isComputing, setIsComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);
  const [computeTxHash, setComputeTxHash] = useState<`0x${string}` | undefined>();

  // Decrypt state
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptTxHash, setDecryptTxHash] = useState<`0x${string}` | undefined>();

  // Score — restored from sessionStorage only if previously decrypted in this session
  const [decryptedScore, setDecryptedScore] = useState<number | null>(null);

  // Read score existence from live contract
  const { data: hasScoreLive, refetch: refetchScore } = useReadContract({
    address: ENGINE_ADDRESS,
    abi: CREDIT_ENGINE_ABI,
    functionName: "hasScore",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Track compute tx
  const { isLoading: isConfirmingCompute, isSuccess: isComputeSuccess } = useWaitForTransactionReceipt({
    hash: computeTxHash,
  });

  // Track decrypt tx
  const { isLoading: isConfirmingDecrypt, isSuccess: isDecryptSuccess } = useWaitForTransactionReceipt({
    hash: decryptTxHash,
  });

  // Refetch hasScore after compute confirms
  useEffect(() => {
    if (isComputeSuccess) refetchScore();
  }, [isComputeSuccess, refetchScore]);

  useEffect(() => {
    if (typeof window === "undefined" || !address) {
      setDecryptedScore(null);
      return;
    }

    const stored = window.sessionStorage.getItem(`credora_decrypted_${address.toLowerCase()}`);
    setDecryptedScore(stored ? Number(stored) : null);
  }, [address]);

  // Reveal score locally after decrypt tx confirms
  useEffect(() => {
    if (isDecryptSuccess && address) {
      const raw = sessionStorage.getItem(`credora_profile_${address.toLowerCase()}`);
      if (raw) {
        const profile = JSON.parse(raw);
        const score = calculateDecryptedScore(profile);
        setDecryptedScore(score);
        sessionStorage.setItem(`credora_decrypted_${address.toLowerCase()}`, String(score));
      }
    }
  }, [isDecryptSuccess, address]);

  const hasScore = Boolean(hasScoreLive) || decryptedScore !== null;

  /**
   * Step 1: Compute score — sends real tx to CreditEngine.computeScore()
   * Wallet popup → on-chain FHE computation → tx confirmed
   */
  const computeScore = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");

    setIsComputing(true);
    setComputeError(null);
    setComputeTxHash(undefined);
    // Clear previous score when recomputing
    setDecryptedScore(null);
    setDecryptTxHash(undefined);
    sessionStorage.removeItem(`credora_decrypted_${address.toLowerCase()}`);

    try {
      const hash = await writeContractAsync({
        address: ENGINE_ADDRESS,
        abi: CREDIT_ENGINE_ABI,
        functionName: "computeScore",
        args: [address],
      });
      setComputeTxHash(hash);
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : "Failed to compute score");
    } finally {
      setIsComputing(false);
    }
  }, [address, writeContractAsync]);

  /**
   * Step 2: Decrypt score — sends real tx (grantPoolAccess) then reveals locally.
   * Wallet popup → on-chain ACL grant → tx confirmed → local score reveal
   */
  const decryptScore = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");

    setIsDecrypting(true);
    setDecryptError(null);
    setDecryptTxHash(undefined);

    try {
      const hash = await writeContractAsync({
        address: ENGINE_ADDRESS,
        abi: CREDIT_ENGINE_ABI,
        functionName: "grantPoolAccess",
      });
      setDecryptTxHash(hash);
    } catch (err) {
      setDecryptError(err instanceof Error ? err.message : "Failed to decrypt score");
    } finally {
      setIsDecrypting(false);
    }
  }, [address, writeContractAsync]);

  const getTier = useCallback(() => {
    if (decryptedScore === null) return null;
    if (decryptedScore >= 700) {
      return { tier: "A", label: "Excellent", rate: 5.0, maxLoan: 10, color: "#22ee88" };
    } else if (decryptedScore >= 500) {
      return { tier: "B", label: "Fair", rate: 12.0, maxLoan: 5, color: "#f59e0b" };
    } else {
      return { tier: "C", label: "Ineligible", rate: 0, maxLoan: 0, color: "#ef4444" };
    }
  }, [decryptedScore]);

  return {
    hasScore,
    decryptedScore,
    tier: getTier(),
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
    refetchScore,
  };
}
