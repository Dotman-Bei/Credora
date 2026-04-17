# Credora

**Confidential On-Chain Credit Scoring & Lending Protocol**

Credora computes credit scores on-chain using Fully Homomorphic Encryption. Users submit encrypted financial data, receive an encrypted score, and borrow from a lending pool — all without revealing a single raw number.

Built on [Zama's fhEVM](https://docs.zama.org/protocol) and deployed to Sepolia testnet.

---

## The Problem

DeFi lending today has a privacy gap:

- **Traditional finance** uses credit scores but requires users to hand over sensitive data to centralized institutions that store, sell, and leak it.
- **Current DeFi** skips credit scoring entirely, relying on over-collateralization (150%+) because there's no way to assess creditworthiness without exposing private data on a public blockchain.

Users are forced to choose: **privacy or access to credit**. Neither option is acceptable.

## The Solution

Credora eliminates this tradeoff using **Fully Homomorphic Encryption (FHE)** — a cryptographic technique that allows computation directly on encrypted data.

```
User's browser                    Blockchain                     Result
┌──────────┐    encrypted       ┌──────────────┐              ┌──────────┐
│ income    │───────────────────▶│              │              │          │
│ assets    │   FHE ciphertext  │  FHE.mul()   │  encrypted   │ Score:   │
│ debts     │───────────────────▶│  FHE.add()   │─────────────▶│ 720      │
│           │                   │  FHE.sub()   │  score       │ (private)│
└──────────┘                    │  FHE.select()│              └──────────┘
 plaintext                      └──────────────┘
 never leaves                    computation on
 the browser                     ciphertext only
```

**What the blockchain sees:** encrypted handles (opaque pointers). Never the values.

**What the user gets:** a privately decrypted credit score and loan offers based on it.

**What the lender learns:** a single boolean — "eligible" or "not eligible." Nothing more.

## Why FHE Is Required

Other privacy approaches fall short for this use case:

| Approach | Problem |
|----------|---------|
| **ZK Proofs** | Prove statements about data but can't compute new values from encrypted inputs on-chain. A ZK proof can show "my income > X" but can't calculate a weighted credit score from multiple encrypted fields. |
| **MPC** | Requires multiple parties to be online and coordinate. Doesn't produce a persistent encrypted result that other contracts can use. |
| **TEEs** | Trust a hardware vendor. If the enclave is compromised, all data is exposed. |
| **FHE** | Computes arbitrary functions on encrypted data. The result is also encrypted. No trusted hardware, no coordination, no information leakage. |

Credora needs to: (1) accept multiple encrypted inputs, (2) perform weighted arithmetic on them, (3) store the encrypted result, and (4) let other contracts run threshold checks on that result — all without decryption. Only FHE supports this.

---

## Architecture

Three contracts, each with a single responsibility:

```
EncryptedProfile          CreditEngine              LendingPool
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Stores encrypted │─────▶│ Computes score  │─────▶│ Checks threshold│
│ income, assets,  │ ACL  │ from encrypted  │ ACL  │ issues loan or  │
│ liabilities      │      │ profile data    │      │ rejects         │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     euint64 x3              euint64 score            ebool eligible
```

### EncryptedProfile.sol

Accepts encrypted financial data from users. Each field is an `euint64` — a 64-bit unsigned integer encrypted under the network's FHE public key. The contract stores only opaque handles; raw values never touch the chain.

**FHE operations:** `FHE.fromExternal` (input validation), `FHE.allow` / `FHE.allowThis` (access control)

### CreditEngine.sol

Reads encrypted profile fields and computes a credit score using weighted arithmetic — entirely on ciphertext:

```
score = clamp((income × 3) + (assets × 2) − (liabilities × 5), 300, 850)
```

**FHE operations:** `FHE.mul` (weighting), `FHE.add` / `FHE.sub` (aggregation), `FHE.ge` (underflow guard), `FHE.lt` / `FHE.gt` (range clamping), `FHE.select` (encrypted branching), `FHE.asEuint64` (constant conversion)

### LendingPool.sol

Performs encrypted threshold comparisons against the score to determine loan eligibility and interest rate tier:

```
score ≥ 700  →  Tier A:  5% APR, max 10 ETH
score ≥ 500  →  Tier B: 12% APR, max  5 ETH
score < 500  →  Rejected
```

Only the eligibility boolean is decrypted (via the Gateway) — the pool never learns the score itself.

**FHE operations:** `FHE.ge` (threshold check), `FHE.or` (eligibility merge), `FHE.select` (rate selection), `FHE.allowForDecryption` (async decryption trigger)

---

## FHE Operations Summary

| Operation | Count | Purpose |
|-----------|-------|---------|
| `FHE.fromExternal` | 3 | Validate encrypted user inputs with ZKPoK |
| `FHE.mul` | 3 | Apply weight multipliers to financial factors |
| `FHE.add` | 1 | Aggregate positive score components |
| `FHE.sub` | 1 | Subtract liability penalty |
| `FHE.ge` | 3 | Underflow guard + threshold checks |
| `FHE.lt` / `FHE.gt` | 2 | Score range clamping |
| `FHE.select` | 5 | Encrypted conditional branching |
| `FHE.or` | 1 | Combine eligibility conditions |
| `FHE.asEuint64` | 8 | Convert plaintext constants |
| `FHE.allow` / `FHE.allowThis` | 15 | Cross-contract ACL grants |
| `FHE.allowForDecryption` | 2 | Trigger async Gateway decryption |

---

## Data Flow

### 1. Profile Submission

User enters plaintext values in the browser. The FHEVM SDK encrypts them client-side:

```
Browser: createEncryptedInput(contract, user).add64(5000).add64(20000).add64(3000).encrypt()
    → handles[0..2] + inputProof (ZKPoK attestation)

Transaction: submitProfile(handle0, handle1, handle2, inputProof)
    → Contract: FHE.fromExternal() validates → stores euint64 handles

On-chain storage: 0x7f3a...e8b2, 0xa1c9...4d07, 0x5e2b...91fa
Plaintext stored: none
```

### 2. Score Computation

Anyone can trigger computation for a user (the result stays encrypted):

```
CreditEngine.computeScore(userAddress)
    → Reads 3 encrypted handles from EncryptedProfile
    → Executes 8 FHE operations (all on ciphertext)
    → Stores encrypted score handle
    → Grants ACL to user + LendingPool
```

### 3. Private Score Viewing

Only the user can decrypt their own score:

```
Browser: generateKeypair() → createEIP712(pubKey) → wallet signs authorization
    → Gateway: verify ACL → KMS threshold decrypt (9/13) → re-encrypt for user
    → Browser: local decrypt → display "720"

Who sees the score: only the user's browser
```

### 4. Loan Request

```
LendingPool.requestLoan(1 ether)
    → FHE.ge(score, 700) → FHE.ge(score, 500) → FHE.or() → FHE.select()
    → FHE.allowForDecryption(isEligible) → Gateway decrypts boolean
    → Relayer calls fulfillLoan(user, true, 500) → ETH transferred

What the pool learned: eligible=true
What the pool did NOT learn: the actual score
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.26, fhEVM |
| FHE | Zama TFHE via `@fhevm/solidity` |
| Deployment | Hardhat, hardhat-deploy |
| Frontend | Next.js, React, Tailwind CSS |
| Wallet | RainbowKit, Wagmi, viem |
| Encryption (client) | fhevmjs SDK |
| Network | Sepolia Testnet |

---

## Project Structure

```
credora/
├── contracts/
│   ├── interfaces/
│   │   ├── IEncryptedProfile.sol
│   │   └── ICreditEngine.sol
│   ├── EncryptedProfile.sol        ← Encrypted data storage
│   ├── CreditEngine.sol            ← FHE score computation
│   └── LendingPool.sol             ← Threshold lending
├── deploy/
│   └── 01_deploy_credora.ts        ← Automated deployment + wiring
├── frontend/
│   ├── providers/FhevmProvider.tsx  ← SDK initialization + encrypt/decrypt
│   ├── hooks/
│   │   ├── useEncryptedProfile.ts   ← Profile submission
│   │   ├── useCreditEngine.ts       ← Score compute + decrypt
│   │   └── useLendingPool.ts        ← Borrow + repay
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── ScoreGauge.tsx           ← Animated score visualization
│   ├── app/
│   │   ├── page.tsx                 ← Landing
│   │   ├── profile/page.tsx         ← Create encrypted profile
│   │   ├── score/page.tsx           ← Compute + view score
│   │   └── borrow/page.tsx          ← Loan interface
│   ├── contracts/credoraAbis.ts     ← ABIs + addresses
│   └── styles/credora.css           ← Design system
├── DEPLOYMENT.md                    ← Step-by-step deployment guide
└── README.md
```

---

## Quick Start

```bash
# Clone the template
git clone https://github.com/zama-ai/fhevm-react-template.git credora
cd credora
git submodule update --init --recursive
pnpm install

# Configure secrets
cd packages/fhevm-hardhat-template
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
cd ../..

# Deploy to Sepolia
pnpm deploy:sepolia

# Update frontend with deployed addresses, then:
pnpm dev
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete guide with troubleshooting.

---

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Data exposure on-chain | All financial data stored as FHE ciphertext handles — never plaintext |
| Front-running encrypted inputs | ZKPoK attestation binds ciphertext to specific user + contract |
| Unauthorized decryption | ACL enforced per-handle: only granted addresses can request decryption |
| Single-point KMS compromise | Threshold decryption: 9 of 13 KMS parties must agree |
| Malicious score manipulation | Score computation is deterministic from encrypted inputs — no oracle dependency |
| Loan eligibility bypass | Eligibility boolean is computed on-chain from encrypted score — user cannot fake it |

---

## License

MIT
