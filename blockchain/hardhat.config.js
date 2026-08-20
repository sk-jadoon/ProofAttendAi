import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "dotenv/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],

  solidity: {
    version: "0.8.25",

    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },

    evmVersion: "cancun",
  },

  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : [],
    },
  },

  test: {
    mocha: {
      timeout: 40000,
    },
  },
});