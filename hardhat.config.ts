import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import * as dotenv from "dotenv";

dotenv.config();

const MNEMONIC = process.env.MNEMONIC || "test test test test test test test test test test test junk";
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: { mnemonic: MNEMONIC },
      chainId: 11155111,
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    deploy: "./deploy",
  },
};

export default config;
