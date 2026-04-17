import { ethers } from "hardhat";

async function main() {
  const pool = await ethers.getContractAt(
    "LendingPool",
    "0xDf20BE5e3433F3Cc9F99464D6fCdF3458BC37952"
  );
  const tx = await pool.deposit({ value: ethers.parseEther("5") });
  console.log("Depositing 5 ETH... tx:", tx.hash);
  await tx.wait();
  console.log("Done — 5 ETH deposited to pool");
}

main().catch(console.error);
