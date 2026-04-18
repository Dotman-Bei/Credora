"use client";

/**
 * FhevmProvider — Real FHEVM SDK integration.
 *
 * Initializes fhevmjs for client-side encryption and private decryption.
 * Falls back to mock mode if the SDK fails to initialize (e.g., offline).
 */

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";

// fhevmjs types
type FhevmInstance = any;

interface FhevmContextValue {
  instance: FhevmInstance | null;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  encryptValues: (
    contractAddress: string,
    values: bigint[]
  ) => Promise<{ handles: bigint[]; inputProof: `0x${string}` }>;
  decryptValue: (
    handle: bigint,
    contractAddress: string
  ) => Promise<bigint>;
}

const FhevmContext = createContext<FhevmContextValue | null>(null);

const SEPOLIA_CHAIN_ID = 11155111;
const ACL_ADDRESS = "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D";
const KMS_ADDRESS = "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A";
const GATEWAY_URL = "https://gateway.sepolia.zama.ai";

export function FhevmProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    async function init() {
      try {
        const { createInstance } = await import("fhevmjs");
        const inst = await createInstance({
          kmsContractAddress: KMS_ADDRESS,
          aclContractAddress: ACL_ADDRESS,
          chainId: SEPOLIA_CHAIN_ID,
          networkUrl: process.env.NEXT_PUBLIC_RPC_URL || `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY || ""}`,
          gatewayUrl: GATEWAY_URL,
          network: (window as any).ethereum,
        });
        setInstance(inst);
      } catch (err) {
        console.warn("FHEVM SDK init failed, running in mock mode:", err);
        setError("FHEVM SDK unavailable — running in preview mode");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const isLive = instance !== null;

  /**
   * Encrypt values using the FHEVM SDK.
   * Creates a batched encrypted input with ZKPoK attestation.
   */
  const encryptValues = useCallback(
    async (contractAddress: string, values: bigint[]) => {
      if (!instance) {
        // Mock fallback
        await new Promise((r) => setTimeout(r, 500));
        return {
          handles: values.map((_, i) => BigInt(i + 1)),
          inputProof: `0x${"00".repeat(64)}` as `0x${string}`,
        };
      }

      // Get the connected signer address from window.ethereum
      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });
      const userAddress = accounts[0];

      const input = instance.createEncryptedInput(contractAddress, userAddress);

      for (const val of values) {
        input.add64(val);
      }

      const encrypted = input.encrypt();

      return {
        handles: encrypted.handles.map((h: string) => BigInt(h)),
        inputProof: encrypted.inputProof as `0x${string}`,
      };
    },
    [instance]
  );

  /**
   * Decrypt a value via the FHEVM Gateway reencryption flow.
   * The user signs an EIP-712 message authorizing decryption.
   * The plaintext is returned only to the user's browser.
   */
  const decryptValue = useCallback(
    async (handle: bigint, contractAddress: string) => {
      if (!instance) {
        // Mock fallback — return a simulated score
        await new Promise((r) => setTimeout(r, 1000));
        return BigInt(720);
      }

      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });
      const userAddress = accounts[0];

      const { publicKey, privateKey } = instance.generateKeypair();
      const eip712 = instance.createEIP712(publicKey, contractAddress);

      const signature = await (window as any).ethereum.request({
        method: "eth_signTypedData_v4",
        params: [userAddress, JSON.stringify(eip712)],
      });

      const plaintext = await instance.reencrypt(
        handle,
        privateKey,
        publicKey,
        signature,
        contractAddress,
        userAddress
      );

      return BigInt(plaintext);
    },
    [instance]
  );

  return (
    <FhevmContext.Provider
      value={{ instance, loading, error, isLive, encryptValues, decryptValue }}
    >
      {children}
    </FhevmContext.Provider>
  );
}

export function useFhevm() {
  const ctx = useContext(FhevmContext);
  if (!ctx) throw new Error("useFhevm must be used within <FhevmProvider>");
  return ctx;
}
