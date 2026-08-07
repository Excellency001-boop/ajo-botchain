require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// BOT Chain Mainnet — AI-native EVM Layer 1.
// RPC:      https://rpc.botchain.ai
// Chain ID: 677 (0x2a5)
// Token:    BOT
// Explorer: https://scan.botchain.ai
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    // BOT Chain Mainnet — chainId 677, token BOT, explorer scan.botchain.ai
    botchain: {
      url: process.env.BOTCHAIN_RPC || "https://rpc.botchain.ai",
      chainId: 677,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // BOT Chain Testnet (Bohr) — chainId 968, free faucet, explorer scan.bohr.life.
    // The team's recommended flow: deploy + verify here first, then apply for 1 BOT
    // and deploy to mainnet with `--network botchain`.
    botchain_testnet: {
      url: process.env.BOTCHAIN_TESTNET_RPC || "https://rpc.bohr.life",
      chainId: 968,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Block-explorer verification (Blockscout-style). Endpoint is best-effort;
  // if BOT Scan doesn't expose a verify API yet, we verify by flattening instead.
  etherscan: {
    apiKey: { botchain: "no-api-key-needed", botchain_testnet: "no-api-key-needed" },
    customChains: [
      {
        network: "botchain",
        chainId: 677,
        urls: {
          apiURL: "https://scan.botchain.ai/api",
          browserURL: "https://scan.botchain.ai",
        },
      },
      {
        network: "botchain_testnet",
        chainId: 968,
        urls: {
          apiURL: "https://scan.bohr.life/api",
          browserURL: "https://scan.bohr.life",
        },
      },
    ],
  },
};
