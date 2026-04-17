"use client";

/**
 * useLendingPool — Hook for the LendingPool contract.
 *
 * Always sends real on-chain transactions for requestLoan() and repay().
 */

import { useState, useCallback } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import {
  LENDING_POOL_ABI,
  DEPLOYED_ADDRESSES,
  LoanStatus,
  LOAN_STATUS_LABELS,
  type NetworkName,
} from "../contracts/credoraAbis";

const NETWORK: NetworkName = (process.env.NEXT_PUBLIC_NETWORK as NetworkName) || "sepolia";
const POOL_ADDRESS = DEPLOYED_ADDRESSES[NETWORK].LendingPool as `0x${string}`;

export interface LoanDetails {
  principal: number;
  rateBps: number;
  startTime: number;
  status: LoanStatus;
  statusLabel: string;
  principalEth: string;
  ratePercent: string;
}

export interface DemoLoanDecision {
  eligible: boolean;
  rateBps: number;
}

export function useLendingPool() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [fulfillTxHash, setFulfillTxHash] = useState<`0x${string}` | undefined>();
  const [isRepaying, setIsRepaying] = useState(false);
  const [repayError, setRepayError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [isSuccess, setIsSuccess] = useState(false);

  // Read loan status from live contract
  const { data: rawLoanStatus, refetch: refetchStatus } = useReadContract({
    address: POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "loanStatus",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read loan details
  const { data: rawLoanDetails, refetch: refetchDetails } = useReadContract({
    address: POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getLoanDetails",
    args: address ? [address] : undefined,
    query: { enabled: !!address && rawLoanStatus === 2 },
  });

  // Read repayment amount
  const { data: repaymentAmount } = useReadContract({
    address: POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getRepaymentAmount",
    args: address ? [address] : undefined,
    query: { enabled: !!address && rawLoanStatus === 2 },
  });

  // Read pool liquidity
  const { data: liquidity, refetch: refetchLiquidity } = useReadContract({
    address: POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "availableLiquidity",
  });

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const loanStatus = Number(rawLoanStatus ?? 0) as LoanStatus;
  const loanStatusLabel = LOAN_STATUS_LABELS[loanStatus] || "Unknown";

  const loanDetails: LoanDetails | null =
    rawLoanDetails
      ? {
          principal: Number((rawLoanDetails as any)[0]),
          rateBps: Number((rawLoanDetails as any)[1]),
          startTime: Number((rawLoanDetails as any)[2]),
          status: Number((rawLoanDetails as any)[3]) as LoanStatus,
          statusLabel: LOAN_STATUS_LABELS[Number((rawLoanDetails as any)[3]) as LoanStatus] || "Unknown",
          principalEth: formatEther((rawLoanDetails as any)[0]),
          ratePercent: (Number((rawLoanDetails as any)[1]) / 100).toFixed(2),
        }
      : null;

  const repaymentEth = repaymentAmount ? formatEther(repaymentAmount as bigint) : undefined;
  const liquidityEth = liquidity ? formatEther(liquidity as bigint) : "0";

  const finalizeDemoLoan = useCallback(
    async (decision: DemoLoanDecision): Promise<`0x${string}` | null> => {
      if (!address) throw new Error("Wallet not connected");

      setIsFinalizing(true);
      setFinalizeError(null);
      setFulfillTxHash(undefined);

      try {
        const response = await fetch("/api/loans/fulfill-demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            borrower: address,
            eligible: decision.eligible,
            rateBps: decision.rateBps,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.hash) {
          throw new Error(result.error || "Demo relayer could not finalize the loan request.");
        }

        const hash = result.hash as `0x${string}`;
        setFulfillTxHash(hash);
        await refetchStatus();
        await refetchDetails();
        return hash;
      } catch (err) {
        setFinalizeError(err instanceof Error ? err.message : "Failed to finalize the loan request");
        return null;
      } finally {
        setIsFinalizing(false);
      }
    },
    [address, refetchDetails, refetchStatus]
  );

  const requestLoan = useCallback(
    async (amountEth: string, decision: DemoLoanDecision): Promise<`0x${string}` | null> => {
      if (!address) throw new Error("Wallet not connected");
      if (!publicClient) throw new Error("Public client unavailable");

      setIsRequesting(true);
      setRequestError(null);
      setFinalizeError(null);
      setTxHash(undefined);
      setFulfillTxHash(undefined);
      setIsSuccess(false);

      try {
        // Read the REAL on-chain status (not stale React cache)
        const liveStatus = Number(
          await publicClient.readContract({
            address: POOL_ADDRESS,
            abi: LENDING_POOL_ABI,
            functionName: "loanStatus",
            args: [address],
          }) ?? 0
        ) as LoanStatus;

        // If a repay is still confirming, poll until the chain catches up
        if (liveStatus === LoanStatus.Active) {
          let retries = 0;
          let currentStatus: LoanStatus = liveStatus;
          while (currentStatus === LoanStatus.Active && retries < 30) {
            await new Promise((r) => setTimeout(r, 2000));
            currentStatus = Number(
              await publicClient.readContract({
                address: POOL_ADDRESS,
                abi: LENDING_POOL_ABI,
                functionName: "loanStatus",
                args: [address],
              }) ?? 0
            ) as LoanStatus;
            retries++;
          }
          if (currentStatus === LoanStatus.Active) {
            throw new Error("Previous loan is still active. Please wait for the repayment to confirm on-chain.");
          }
        }

        // Re-read after possible wait
        const statusNow = Number(
          await publicClient.readContract({
            address: POOL_ADDRESS,
            abi: LENDING_POOL_ABI,
            functionName: "loanStatus",
            args: [address],
          }) ?? 0
        ) as LoanStatus;

        // If a previous loan is stuck in Pending, auto-reject it first
        if (statusNow === LoanStatus.Pending) {
          const cleanupHash = await finalizeDemoLoan({ eligible: false, rateBps: 0 });
          if (!cleanupHash) {
            throw new Error("Failed to clear the previous pending loan request");
          }
          // Wait for the rejection to confirm on-chain
          await publicClient.waitForTransactionReceipt({ hash: cleanupHash });
        }

        await refetchStatus();

        const weiAmount = parseEther(amountEth);
        // Real transaction — wallet popup for confirmation
        const hash = await writeContractAsync({
          address: POOL_ADDRESS,
          abi: LENDING_POOL_ABI,
          functionName: "requestLoan",
          args: [weiAmount],
        });
        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        await refetchStatus();

        await finalizeDemoLoan(decision);

        setIsSuccess(true);
        await refetchStatus();
        await refetchDetails();
        return hash;
      } catch (err) {
        setRequestError(err instanceof Error ? err.message : "Failed to request loan");
        return null;
      } finally {
        setIsRequesting(false);
      }
    },
    [address, publicClient, writeContractAsync, refetchStatus, refetchDetails, finalizeDemoLoan]
  );

  const repay = useCallback(async (): Promise<`0x${string}` | null> => {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("Public client unavailable");

    setIsRepaying(true);
    setRepayError(null);
    setIsSuccess(false);

    try {
      if (!repaymentAmount) throw new Error("No repayment amount available");
      const hash = await writeContractAsync({
        address: POOL_ADDRESS,
        abi: LENDING_POOL_ABI,
        functionName: "repay",
        value: repaymentAmount as bigint,
      });
      // Don't set txHash here — it feeds useWaitForTransactionReceipt
      // which keeps isConfirming=true until the block confirms on Sepolia.
      setIsSuccess(true);
      setIsRepaying(false);

      // Refetch in the background after confirmation — don't block the UI
      publicClient.waitForTransactionReceipt({ hash }).then(() => {
        refetchStatus();
        refetchDetails();
        refetchLiquidity();
      });

      return hash;
    } catch (err) {
      setRepayError(err instanceof Error ? err.message : "Failed to repay loan");
      setIsRepaying(false);
      return null;
    }
  }, [address, publicClient, writeContractAsync, repaymentAmount, refetchStatus, refetchDetails, refetchLiquidity]);

  /**
   * Clear any on-chain loan state so a new profile can borrow fresh.
   * - Pending → auto-reject via relayer
   * - Active → auto-repay (wallet popup for ETH)
   */
  const resetLoanState = useCallback(async (): Promise<void> => {
    if (loanStatus === LoanStatus.Pending) {
      await finalizeDemoLoan({ eligible: false, rateBps: 0 });
      await refetchStatus();
    } else if (loanStatus === LoanStatus.Active) {
      const hash = await repay();
      if (!hash) throw new Error("Repayment failed — loan was not cleared");
    }
  }, [loanStatus, finalizeDemoLoan, repay, refetchStatus]);

  return {
    loanStatus,
    loanStatusLabel,
    loanDetails,
    repaymentAmount,
    repaymentEth,
    liquidity,
    liquidityEth,
    isRequesting,
    isFinalizing,
    isRepaying,
    isConfirming,
    isSuccess,
    requestError,
    finalizeError,
    repayError,
    txHash,
    fulfillTxHash,
    requestLoan,
    repay,
    resetLoanState,
    refetchStatus,
    refetchDetails,
  };
}
