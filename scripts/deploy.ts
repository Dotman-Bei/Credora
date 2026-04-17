import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n═══════════════════════════════════════════");
  console.log("  Credora Protocol — Deployment");
  console.log("  Deployer:", deployer.address);
  console.log("═══════════════════════════════════════════\n");

  // 1. Deploy EncryptedProfile
  const ProfileFactory = await ethers.getContractFactory("EncryptedProfile");
  const profile = await ProfileFactory.deploy();
  await profile.waitForDeployment();
  const profileAddr = await profile.getAddress();
  console.log("  EncryptedProfile deployed at:", profileAddr);

  // 2. Deploy CreditEngine
  const EngineFactory = await ethers.getContractFactory("CreditEngine");
  const engine = await EngineFactory.deploy(profileAddr);
  await engine.waitForDeployment();
  const engineAddr = await engine.getAddress();
  console.log("  CreditEngine deployed at:", engineAddr);

  // 3. Deploy LendingPool
  const PoolFactory = await ethers.getContractFactory("LendingPool");
  const pool = await PoolFactory.deploy(engineAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("  LendingPool deployed at:", poolAddr);

  // 4. Wire contracts
  console.log("\n  Wiring contracts...");
  let tx = await profile.setCreditEngine(engineAddr);
  await tx.wait();
  console.log("  EncryptedProfile.setCreditEngine →", engineAddr);

  tx = await engine.setLendingPool(poolAddr);
  await tx.wait();
  console.log("  CreditEngine.setLendingPool →", poolAddr);

  // 5. Seed pool with 0.01 ETH
  tx = await pool.deposit({ value: ethers.parseEther("0.01") });
  await tx.wait();
  console.log("  LendingPool seeded with 0.01 ETH");

  console.log("\n═══════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════");
  console.log("  EncryptedProfile:", profileAddr);
  console.log("  CreditEngine:   ", engineAddr);
  console.log("  LendingPool:    ", poolAddr);
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
