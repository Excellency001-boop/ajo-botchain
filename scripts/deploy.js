// Deploys the Ajo contract to whatever network Hardhat is pointed at.
// Usage: npm run deploy   (targets BOT Chain Mainnet via hardhat.config.js)
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const net = await hre.ethers.provider.getNetwork();
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  // Pick the right explorer/RPC for whichever BOT Chain network we're on.
  const chainId = Number(net.chainId);
  const CHAINS = {
    677: { rpc: "https://rpc.botchain.ai", explorer: "https://scan.botchain.ai", label: "BOT Chain Mainnet" },
    968: { rpc: "https://rpc.bohr.life", explorer: "https://scan.bohr.life", label: "BOT Chain Testnet" },
  };
  const chain = CHAINS[chainId] || { rpc: "", explorer: "", label: `chain ${chainId}` };

  console.log("Network:  ", chain.label, "chainId", chainId);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", hre.ethers.formatEther(balance), "BOT");

  console.log("\nDeploying Ajo…");
  const Ajo = await hre.ethers.getContractFactory("Ajo");
  const ajo = await Ajo.deploy();
  await ajo.waitForDeployment();
  const address = await ajo.getAddress();

  console.log("\n✅ Ajo deployed to:", address);
  console.log("   Explorer:", `${chain.explorer}/address/${address}`);

  // Write the address + ABI where the web app and agent can pick them up.
  const artifact = await hre.artifacts.readArtifact("Ajo");
  const out = {
    address,
    chainId,
    network: chain.label,
    rpc: chain.rpc,
    explorer: chain.explorer, // base explorer; the app appends /address/<addr>
    contractUrl: `${chain.explorer}/address/${address}`,
    abi: artifact.abi,
  };
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(path.join(deploymentsDir, "botchain.json"), JSON.stringify(out, null, 2));
  // Also drop a copy into the web app so the frontend always has the live address.
  const webDir = path.join(__dirname, "..", "web", "src");
  if (fs.existsSync(webDir)) {
    fs.writeFileSync(path.join(webDir, "deployment.json"), JSON.stringify(out, null, 2));
  }
  console.log("   Wrote deployments/botchain.json (+ web/src/deployment.json)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
