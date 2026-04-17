import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Credora Protocol — Deployment Script
 *
 * Deploys all 3 contracts in order and wires them together:
 *   1. EncryptedProfile  (stores encrypted financial data)
 *   2. CreditEngine      (computes encrypted credit scores)
 *   3. LendingPool       (handles loan requests, eligibility, borrow/repay)
 *
 * Post-deployment wiring:
 *   - EncryptedProfile.setCreditEngine(CreditEngine)
 *   - CreditEngine.setLendingPool(LendingPool)
 *
 * Then seeds the LendingPool with initial liquidity (1 ETH on testnet).
 */
const deployCredora: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, execute } = hre.deployments;

  console.log("\n═══════════════════════════════════════════");
  console.log("  Credora Protocol — Deployment");
  console.log("  Deployer:", deployer);
  console.log("═══════════════════════════════════════════\n");

  // ── Step 1: Deploy EncryptedProfile ──
  const profile = await deploy("EncryptedProfile", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log("  EncryptedProfile deployed at:", profile.address);

  // ── Step 2: Deploy CreditEngine ──
  const engine = await deploy("CreditEngine", {
    from: deployer,
    args: [profile.address],
    log: true,
    autoMine: true,
  });
  console.log("  CreditEngine deployed at:", engine.address);

  // ── Step 3: Deploy LendingPool ──
  const pool = await deploy("LendingPool", {
    from: deployer,
    args: [engine.address],
    log: true,
    autoMine: true,
  });
  console.log("  LendingPool deployed at:", pool.address);

  // ── Step 4: Wire contracts together ──
  console.log("\n  Wiring contracts...");

  // Tell EncryptedProfile about CreditEngine (so new profiles grant ACL to engine)
  await execute("EncryptedProfile", { from: deployer, log: true }, "setCreditEngine", engine.address);
  console.log("  EncryptedProfile.setCreditEngine →", engine.address);

  // Tell CreditEngine about LendingPool (so new scores grant ACL to pool)
  await execute("CreditEngine", { from: deployer, log: true }, "setLendingPool", pool.address);
  console.log("  CreditEngine.setLendingPool →", pool.address);

  // ── Step 5: Seed pool with initial liquidity (testnet only) ──
  const network = hre.network.name;
  if (network === "localhost" || network === "hardhat" || network === "sepolia") {
    const seedAmount = hre.ethers.parseEther("1.0");
    await execute("LendingPool", { from: deployer, value: seedAmount, log: true }, "deposit");
    console.log("  LendingPool seeded with 1.0 ETH");
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════");
  console.log("  EncryptedProfile:", profile.address);
  console.log("  CreditEngine:   ", engine.address);
  console.log("  LendingPool:    ", pool.address);
  console.log("═══════════════════════════════════════════\n");
};

deployCredora.tags = ["Credora"];
export default deployCredora;
