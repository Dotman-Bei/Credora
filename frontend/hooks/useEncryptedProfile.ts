"use client";

/**
 * useEncryptedProfile — Hook for the EncryptedProfile contract.
 *
 * Live mode: encrypts inputs via fhevmjs SDK, sends to deployed contract.
 * Fallback: simulates the flow when SDK is unavailable.
 */

import { useState, useCallback, useEffect } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useFhevm } from "../providers/FhevmProvider";
import { ENCRYPTED_PROFILE_ABI, DEPLOYED_ADDRESSES, type NetworkName } from "../contracts/credoraAbis";

const NETWORK: NetworkName = (process.env.NEXT_PUBLIC_NETWORK as NetworkName) || "sepolia";
const PROFILE_ADDRESS = DEPLOYED_ADDRESSES[NETWORK].EncryptedProfile as `0x${string}`;
const INSUFFICIENT_GAS_MESSAGE =
  "Your wallet needs Sepolia ETH to cover network gas fees before this profile can be created. Add Sepolia ETH and try again.";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to submit profile";
}

function isInsufficientFundsError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("insufficient funds") ||
    message.includes("exceeds balance") ||
    message.includes("gas required exceeds allowance") ||
    message.includes("funds for gas")
  );
}

interface ProfileSubmitConfig {
  functionName: "submitProfile" | "submitProfilePlaintext";
  args: readonly unknown[];
}

function getProfileStorageKey(address: string) {
  return `credora_profile_${address.toLowerCase()}`;
}

export interface ProfileInput {
  income: number;
  assets: number;
  liabilities: number;
}

export function useEncryptedProfile() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { encryptValues, isLive } = useFhevm();
  const { writeContractAsync } = useWriteContract();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [liveTxHash, setLiveTxHash] = useState<`0x${string}` | undefined>();
  const [hasStoredProfile, setHasStoredProfile] = useState(false);

  // Read profile existence from live contract
  const { data: hasProfileLive, refetch: refetchProfile } = useReadContract({
    address: PROFILE_ADDRESS,
    abi: ENCRYPTED_PROFILE_ABI,
    functionName: "hasProfile",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Only track real tx hashes (not mock ones)
  const { isLoading: isConfirmingLive, isSuccess: isSuccessLive } = useWaitForTransactionReceipt({
    hash: liveTxHash,
  });

  // Refetch after real tx confirms
  useEffect(() => {
    if (isSuccessLive) refetchProfile();
  }, [isSuccessLive, refetchProfile]);

  useEffect(() => {
    if (typeof window === "undefined" || !address) {
      setHasStoredProfile(false);
      return;
    }

    setHasStoredProfile(Boolean(window.sessionStorage.getItem(getProfileStorageKey(address))));
  }, [address]);

  const hasProfile = Boolean(hasProfileLive) || hasStoredProfile;
  const isConfirming = isConfirmingLive;
  const isSuccess = isSuccessLive;
  const txHash = liveTxHash;

  const resolveInsufficientGasMessage = useCallback(
    async (error: unknown, config: ProfileSubmitConfig | null) => {
      if (isInsufficientFundsError(error)) {
        return INSUFFICIENT_GAS_MESSAGE;
      }

      if (!address || !publicClient || !config) {
        return getErrorMessage(error);
      }

      try {
        const [balance, gasEstimate, feeEstimate] = await Promise.all([
          publicClient.getBalance({ address }),
          publicClient.estimateContractGas({
            account: address,
            address: PROFILE_ADDRESS,
            abi: ENCRYPTED_PROFILE_ABI,
            functionName: config.functionName,
            args: config.args as any,
          }),
          publicClient.estimateFeesPerGas(),
        ]);

        const gasPrice = feeEstimate.maxFeePerGas ?? feeEstimate.gasPrice;
        if (gasPrice && balance < gasEstimate * gasPrice) {
          return INSUFFICIENT_GAS_MESSAGE;
        }
      } catch (gasCheckError) {
        if (isInsufficientFundsError(gasCheckError)) {
          return INSUFFICIENT_GAS_MESSAGE;
        }
      }

      return getErrorMessage(error);
    },
    [address, publicClient]
  );

  const submitProfile = useCallback(
    async (input: ProfileInput) => {
      if (!address) throw new Error("Wallet not connected");

      setIsSubmitting(true);
      setSubmitError(null);
      setLiveTxHash(undefined);

      let submitConfig: ProfileSubmitConfig | null = null;

      try {
        if (isLive) {
          // Full client-side encryption path (requires working Gateway)
          const encrypted = await encryptValues(PROFILE_ADDRESS, [
            BigInt(input.income),
            BigInt(input.assets),
            BigInt(input.liabilities),
          ]);

          submitConfig = {
            functionName: "submitProfile",
            args: [
              encrypted.handles[0],
              encrypted.handles[1],
              encrypted.handles[2],
              encrypted.inputProof,
            ],
          };

          const hash = await writeContractAsync({
            address: PROFILE_ADDRESS,
            abi: ENCRYPTED_PROFILE_ABI,
            functionName: submitConfig.functionName,
            args: submitConfig.args as any,
          });
          setLiveTxHash(hash);

          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(getProfileStorageKey(address), JSON.stringify(input));
            setHasStoredProfile(true);
          }
        } else {
          // Plaintext path — real on-chain tx, encrypted inside the contract
          submitConfig = {
            functionName: "submitProfilePlaintext",
            args: [
              BigInt(input.income),
              BigInt(input.assets),
              BigInt(input.liabilities),
            ],
          };

          const hash = await writeContractAsync({
            address: PROFILE_ADDRESS,
            abi: ENCRYPTED_PROFILE_ABI,
            functionName: submitConfig.functionName,
            args: submitConfig.args as any,
          });
          setLiveTxHash(hash);

          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(getProfileStorageKey(address), JSON.stringify(input));
            setHasStoredProfile(true);
          }
        }
      } catch (err) {
        const message = await resolveInsufficientGasMessage(err, submitConfig);
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, encryptValues, writeContractAsync, isLive, resolveInsufficientGasMessage]
  );

  const grantEngineAccess = useCallback(async () => {
    if (!isLive) return;
    const hash = await writeContractAsync({
      address: PROFILE_ADDRESS,
      abi: ENCRYPTED_PROFILE_ABI,
      functionName: "grantEngineAccess",
    });
    setLiveTxHash(hash);
  }, [writeContractAsync, isLive]);

  const resetLocalProfile = useCallback(() => {
    if (typeof window !== "undefined" && address) {
      window.sessionStorage.removeItem(getProfileStorageKey(address));
    }

    setHasStoredProfile(false);
    setLiveTxHash(undefined);
    setSubmitError(null);
  }, [address]);

  return {
    hasProfile,
    isSubmitting,
    isConfirming,
    isSuccess,
    submitError,
    txHash,
    submitProfile,
    grantEngineAccess,
    resetLocalProfile,
    refetchProfile,
  };
}
