# Credora — Deployment Guide

> From zero to a live demo on Sepolia testnet.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 18 | https://nodejs.org |
| pnpm | >= 8 | `npm install -g pnpm` |
| Git | any | https://git-scm.com |
| MetaMask | latest | Browser extension |
| Sepolia ETH | ~0.5 ETH | Faucet: https://sepoliafaucet.com |

You also need API keys:

| Key | Where to Get | Purpose |
|-----|-------------|---------|
| `INFURA_API_KEY` | https://infura.io | Sepolia RPC for Hardhat |
| `ETHERSCAN_API_KEY` | https://etherscan.io/apis | Contract verification |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | https://alchemy.com | Frontend RPC reads |

---

## Step 1: Clone the Template

```bash
# Clone the fhevm-react-template (monorepo with contracts + frontend)
git clone https://github.com/zama-ai/fhevm-react-template.git credora
cd credora

# Initialize the Hardhat submodule
git submodule update --init --recursive

# Install all dependencies
pnpm install
```

This gives you:
```
credora/
├── packages/
│   ├── fhevm-hardhat-template/   ← contracts go here
│   ├── fhevm-sdk/                ← FHEVM client SDK
│   └── nextjs/                   ← frontend goes here
```

---

## Step 2: Add Credora Contracts

Copy the contracts from our `contracts/` directory into the template:

```bash
# Remove the example contract
rm packages/fhevm-hardhat-template/contracts/FHECounter.sol

# Copy Credora contracts
cp -r ../contracts/* packages/fhevm-hardhat-template/contracts/

# Copy the deployment script
cp ../deploy/01_deploy_credora.ts packages/fhevm-hardhat-template/deploy/

# Remove the example deploy script if it exists
rm -f packages/fhevm-hardhat-template/deploy/deploy.ts
```

Verify the structure:
```bash
ls packages/fhevm-hardhat-template/contracts/
# Should show:
#   CreditEngine.sol
#   EncryptedProfile.sol
#   LendingPool.sol
#   interfaces/
#     ICreditEngine.sol
#     IEncryptedProfile.sol
```

---

## Step 3: Configure Environment Variables

### Hardhat Variables (for deployment)

```bash
cd packages/fhevm-hardhat-template

# Set wallet mnemonic (the deployer account)
npx hardhat vars set MNEMONIC
# Paste your 12/24 word mnemonic when prompted

# Set Infura API key (for Sepolia RPC)
npx hardhat vars set INFURA_API_KEY
# Paste your Infura project ID

# Set Etherscan API key (for verification)
npx hardhat vars set ETHERSCAN_API_KEY
# Paste your Etherscan API key

cd ../..
```

### Frontend Variables

Create `packages/nextjs/.env.local`:

```env
# Required: Alchemy API key for frontend RPC reads
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# Optional: WalletConnect project ID (improves wallet reliability)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_id_here

# Network selection
NEXT_PUBLIC_NETWORK=sepolia

# FHEVM Gateway (Sepolia)
NEXT_PUBLIC_GATEWAY_URL=https://gateway.sepolia.zama.ai

# RPC override (if not using Alchemy)
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/your_infura_key_here
```

---

## Step 4: Compile Contracts

```bash
cd packages/fhevm-hardhat-template

# Compile all contracts
npx hardhat compile

# Expected output:
#   Compiled 5 Solidity files successfully
#   - contracts/EncryptedProfile.sol
#   - contracts/CreditEngine.sol
#   - contracts/LendingPool.sol
#   - contracts/interfaces/IEncryptedProfile.sol
#   - contracts/interfaces/ICreditEngine.sol

cd ../..
```

If compilation fails:
- Check Solidity version is `^0.8.26` in `hardhat.config.ts`
- Ensure `@fhevm/solidity` is installed: `pnpm add @fhevm/solidity -w --filter fhevm-hardhat-template`

---

## Step 5: Deploy to Sepolia

### Option A: Deploy via Template Script

```bash
pnpm deploy:sepolia
```

### Option B: Deploy Manually

```bash
cd packages/fhevm-hardhat-template

npx hardhat deploy --network sepolia --tags Credora

# Expected output:
# ═══════════════════════════════════════════
#   Credora Protocol — Deployment
#   Deployer: 0xYourAddress
# ═══════════════════════════════════════════
#
#   EncryptedProfile deployed at: 0x...
#   CreditEngine deployed at: 0x...
#   LendingPool deployed at: 0x...
#
#   Wiring contracts...
#   EncryptedProfile.setCreditEngine → 0x...
#   CreditEngine.setLendingPool → 0x...
#   LendingPool seeded with 1.0 ETH
#
# ═══════════════════════════════════════════
#   Deployment Complete!
# ═══════════════════════════════════════════
```

**Save the three contract addresses.** You'll need them for the frontend.

---

## Step 6: Verify Contracts on Etherscan

Verify each contract so the source code is public and interactions are transparent:

```bash
cd packages/fhevm-hardhat-template

# Verify EncryptedProfile (no constructor args)
npx hardhat verify --network sepolia ENCRYPTED_PROFILE_ADDRESS

# Verify CreditEngine (constructor arg: EncryptedProfile address)
npx hardhat verify --network sepolia CREDIT_ENGINE_ADDRESS "ENCRYPTED_PROFILE_ADDRESS"

# Verify LendingPool (constructor arg: CreditEngine address)
npx hardhat verify --network sepolia LENDING_POOL_ADDRESS "CREDIT_ENGINE_ADDRESS"
```

Replace the placeholder addresses with your actual deployed addresses.

After verification, each contract will show verified source on:
`https://sepolia.etherscan.io/address/YOUR_ADDRESS#code`

---

## Step 7: Connect Frontend to Deployed Contracts

### 7a: Update Contract Addresses

Edit `packages/nextjs/contracts/deployedContracts.ts` (or the Credora file at `frontend/contracts/credoraAbis.ts`):

```typescript
export const DEPLOYED_ADDRESSES = {
  sepolia: {
    EncryptedProfile: "0xYOUR_PROFILE_ADDRESS",
    CreditEngine: "0xYOUR_ENGINE_ADDRESS",
    LendingPool: "0xYOUR_POOL_ADDRESS",
  },
  // ...
};
```

### 7b: Copy Frontend Files into Template

```bash
# Copy hooks
cp -r ../frontend/hooks/* packages/nextjs/hooks/

# Copy providers
cp -r ../frontend/providers/* packages/nextjs/providers/ 2>/dev/null || mkdir -p packages/nextjs/providers && cp -r ../frontend/providers/* packages/nextjs/providers/

# Copy components
cp -r ../frontend/components/* packages/nextjs/components/

# Copy pages (may need to merge with existing app/ structure)
cp -r ../frontend/app/* packages/nextjs/app/

# Copy styles
cp -r ../frontend/styles/* packages/nextjs/styles/ 2>/dev/null || mkdir -p packages/nextjs/styles && cp -r ../frontend/styles/* packages/nextjs/styles/

# Copy contract ABIs
cp -r ../frontend/contracts/* packages/nextjs/contracts/
```

### 7c: Wire FhevmProvider into the App

Edit `packages/nextjs/app/layout.tsx` — add `<FhevmProvider>` inside the existing provider stack:

```tsx
import { FhevmProvider } from "../providers/FhevmProvider";

// Inside the provider chain (after WagmiProvider, inside RainbowKitProvider):
<FhevmProvider>
  {children}
</FhevmProvider>
```

### 7d: Import Credora Styles

Add to the top of `packages/nextjs/app/layout.tsx`:

```tsx
import "../styles/credora.css";
```

---

## Step 8: Launch Frontend

```bash
# Development mode (with hot reload)
pnpm dev

# OR production build
pnpm build && pnpm start
```

Open `http://localhost:3000` in your browser.

---

## Step 9: Smoke Test

1. **Connect MetaMask** to Sepolia
2. Navigate to `/profile`
3. Enter: income=5000, assets=20000, liabilities=3000
4. Click "Encrypt & Submit Profile" — confirm in MetaMask
5. Wait for tx confirmation
6. Navigate to `/score`
7. Click "Compute Encrypted Score" — confirm tx
8. Click "Decrypt My Score" — sign EIP-712 message
9. Score should display (with this input: ~850, Tier A)
10. Navigate to `/borrow`
11. Enter 1 ETH, click "Request Loan"
12. Wait for relayer fulfillment (see below)

---

## Step 10: Run the Relayer (Loan Fulfillment)

The lending pool uses async decryption. After a user calls `requestLoan()`, the encrypted eligibility boolean is marked for decryption. A relayer script watches for these events and posts the results.

For the demo, you can manually fulfill loans using Hardhat console:

```bash
cd packages/fhevm-hardhat-template

npx hardhat console --network sepolia
```

```javascript
// In the Hardhat console:
const pool = await ethers.getContractAt("LendingPool", "LENDING_POOL_ADDRESS");

// Fulfill a loan (eligible, Tier A rate)
await pool.fulfillLoan("BORROWER_ADDRESS", true, 500);

// OR reject a loan
// await pool.fulfillLoan("BORROWER_ADDRESS", false, 0);
```

For production, you'd build an automated relayer that:
1. Listens for `LoanRequested` events
2. Reads decrypted values from the Gateway
3. Calls `fulfillLoan()` with the results

---

## Troubleshooting

### "FHEVM not initialized"
- Ensure `NEXT_PUBLIC_RPC_URL` or `NEXT_PUBLIC_ALCHEMY_API_KEY` is set
- Check browser console for FHEVM SDK initialization errors
- Verify you're connected to Sepolia (chain ID 11155111)

### "CreditEngine: no profile for user"
- The CreditEngine contract must have ACL access to the profile
- Check that `setCreditEngine()` was called during deployment
- If profile was submitted before engine was set, call `grantEngineAccess()` from the profile page

### "LendingPool: no credit score"
- Compute the score first on `/score`
- Check that `setLendingPool()` was called during deployment
- If score was computed before pool was set, call `grantPoolAccess()`

### MetaMask Nonce Issues (after restarting Hardhat)
- MetaMask → Settings → Advanced → Clear Activity Tab Data
- Restart browser entirely (not just the tab)

### Compilation Errors
```bash
# Ensure FHEVM packages are installed
cd packages/fhevm-hardhat-template
pnpm add @fhevm/solidity
```

### Insufficient Gas / ETH
- Get Sepolia ETH from https://sepoliafaucet.com
- FHE operations emit events consumed by coprocessors — gas is standard EVM gas
- Score computation uses ~6 FHE ops → moderate gas cost

---

## Network Reference

| Parameter | Value |
|-----------|-------|
| Network | Sepolia Testnet |
| Chain ID | 11155111 |
| Currency | SepoliaETH |
| RPC | `https://sepolia.infura.io/v3/YOUR_KEY` |
| Explorer | https://sepolia.etherscan.io |
| FHEVM Gateway | https://gateway.sepolia.zama.ai |
| Faucet | https://sepoliafaucet.com |

---

## Security Checklist (Pre-Demo)

- [ ] Deployer mnemonic is NOT committed to git
- [ ] `.env.local` is in `.gitignore`
- [ ] Contract ownership remains with deployer
- [ ] LendingPool relayer is set to a trusted address
- [ ] Pool is funded with sufficient test ETH
- [ ] All 3 contracts are verified on Etherscan
