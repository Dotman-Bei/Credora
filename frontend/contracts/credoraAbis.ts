/**
 * Credora Protocol — Contract ABIs & Deployment Config
 *
 * ABIs are defined inline (matching compiled output from Solidity contracts).
 * In FHEVM, encrypted types (euint64, externalEuint64, ebool) are represented
 * as uint256 in the ABI — they're opaque handles pointing to off-chain ciphertexts.
 *
 * Update DEPLOYED_ADDRESSES after each deployment.
 */

// ═══════════════════════════════════════════
//  Deployment Addresses (update after deploy)
// ═══════════════════════════════════════════

export const DEPLOYED_ADDRESSES = {
  sepolia: {
    EncryptedProfile: "0xC13253260b0A83360B32825A43B69a5740b0D191",
    CreditEngine: "0xBf0FF8E645f06b67D1250848Dce4366B4c35D078",
    LendingPool: "0xDf20BE5e3433F3Cc9F99464D6fCdF3458BC37952",
  },
  localhost: {
    EncryptedProfile: "0x0000000000000000000000000000000000000000",
    CreditEngine: "0x0000000000000000000000000000000000000000",
    LendingPool: "0x0000000000000000000000000000000000000000",
  },
} as const;

export type NetworkName = keyof typeof DEPLOYED_ADDRESSES;

// ═══════════════════════════════════════════
//  EncryptedProfile ABI
// ═══════════════════════════════════════════

export const ENCRYPTED_PROFILE_ABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitProfile",
    inputs: [
      { name: "encIncome", type: "uint256", internalType: "externalEuint64" },
      { name: "encAssets", type: "uint256", internalType: "externalEuint64" },
      { name: "encLiabilities", type: "uint256", internalType: "externalEuint64" },
      { name: "inputProof", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitProfilePlaintext",
    inputs: [
      { name: "rawIncome", type: "uint64" },
      { name: "rawAssets", type: "uint64" },
      { name: "rawLiabilities", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getProfile",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "income", type: "uint256", internalType: "euint64" },
      { name: "assets", type: "uint256", internalType: "euint64" },
      { name: "liabilities", type: "uint256", internalType: "euint64" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasProfile",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantEngineAccess",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setCreditEngine",
    inputs: [{ name: "engine", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "creditEngine",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ProfileSubmitted",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "ProfileUpdated",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
] as const;

// ═══════════════════════════════════════════
//  CreditEngine ABI
// ═══════════════════════════════════════════

export const CREDIT_ENGINE_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "profileAddr", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "computeScore",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getScore",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "euint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasScore",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantPoolAccess",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setLendingPool",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "profileContract",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lendingPool",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ScoreComputed",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
] as const;

// ═══════════════════════════════════════════
//  LendingPool ABI
// ═══════════════════════════════════════════

export const LENDING_POOL_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "engineAddr", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestLoan",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fulfillLoan",
    inputs: [
      { name: "borrower", type: "address" },
      { name: "eligible", type: "bool" },
      { name: "rateBps", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "repay",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getRepaymentAmount",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLoanDetails",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [
      { name: "principal", type: "uint256" },
      { name: "rateBps", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "availableLiquidity",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "loanStatus",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TIER_A_RATE_BPS",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TIER_B_RATE_BPS",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TIER_A_MAX_LOAN",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TIER_B_MAX_LOAN",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creditEngine",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "relayer",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "LoanRequested",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanIssued",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "principal", type: "uint256", indexed: false },
      { name: "rateBps", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanRejected",
    inputs: [{ name: "borrower", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "LoanRepaid",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "totalPaid", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PoolDeposit",
    inputs: [
      { name: "depositor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// ═══════════════════════════════════════════
//  Loan Status Enum (mirrors Solidity)
// ═══════════════════════════════════════════

export enum LoanStatus {
  None = 0,
  Pending = 1,
  Active = 2,
  Repaid = 3,
  Rejected = 4,
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  [LoanStatus.None]: "No Loan",
  [LoanStatus.Pending]: "Pending Approval",
  [LoanStatus.Active]: "Active",
  [LoanStatus.Repaid]: "Repaid",
  [LoanStatus.Rejected]: "Rejected",
};
