// Thin ethers.js layer between the UI and the Ajo contract on BOT Chain.
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther } from "ethers";
import abi from "./abi.json";
import deployment from "./deployment.json";

// The app targets whichever BOT Chain network the contract was deployed to
// (testnet 968 while we ship fast, mainnet 677 for the final submission). These
// values come from deployment.json, which the deploy script writes automatically.
const NETWORKS = {
  677: { name: "BOT Chain · Mainnet", explorer: "https://scan.botchain.ai" },
  968: { name: "BOT Chain · Testnet", explorer: "https://scan.bohr.life" },
};
const _chainId = deployment.chainId || 677;
const _meta = NETWORKS[_chainId] || NETWORKS[677];

export const BOT_CHAIN = {
  chainId: _chainId,
  chainIdHex: "0x" + _chainId.toString(16),
  name: _meta.name,
  rpc: deployment.rpc || "https://rpc.botchain.ai",
  explorer: deployment.explorer || _meta.explorer,
  symbol: "BOT",
};

export const CONTRACT_ADDRESS = deployment.address || "";
export const GITHUB_URL = "https://github.com/Excellency001-boop/ajo-botchain";
export { formatEther, parseEther };

// Read-only provider: lets anyone browse circles without a wallet connected.
export function readProvider() {
  return new JsonRpcProvider(BOT_CHAIN.rpc, BOT_CHAIN.chainId);
}

export function readContract() {
  if (!CONTRACT_ADDRESS) return null;
  return new Contract(CONTRACT_ADDRESS, abi, readProvider());
}

// Ask the injected wallet (MetaMask etc.) to switch to — or add — BOT Chain.
export async function ensureBotChain(eth) {
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BOT_CHAIN.chainIdHex }] });
  } catch (err) {
    // 4902 = chain not added yet; add it, then it becomes selected.
    if (err.code === 4902 || (err.data && err.data.originalError && err.data.originalError.code === 4902)) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BOT_CHAIN.chainIdHex,
          chainName: BOT_CHAIN.name,
          nativeCurrency: { name: "BOT", symbol: BOT_CHAIN.symbol, decimals: 18 },
          rpcUrls: [BOT_CHAIN.rpc],
          blockExplorerUrls: [BOT_CHAIN.explorer],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet() {
  const eth = window.ethereum;
  if (!eth) throw new Error("No wallet found. Install MetaMask to join a circle.");
  await eth.request({ method: "eth_requestAccounts" });
  await ensureBotChain(eth);
  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { signer, address, contract: new Contract(CONTRACT_ADDRESS, abi, signer) };
}

// ---- Read helpers -----------------------------------------------------------

export async function loadCircle(contract, id) {
  const c = await contract.getCircle(id);
  const members = await contract.getMembers(id);
  const status = await contract.roundStatus(id);
  // On-chain trust score (0–100) for each member — the reputation that travels with them.
  const trust = await Promise.all(members.map((m) => contract.trustScore(m).then(Number).catch(() => 50)));
  return {
    id,
    organizer: c.organizer,
    name: c.name,
    contribution: c.contribution,
    maxMembers: Number(c.maxMembers),
    roundDuration: Number(c.roundDuration),
    currentRound: Number(c.currentRound),
    roundStart: Number(c.roundStart),
    started: c.started,
    completed: c.completed,
    memberCount: Number(c.memberCount),
    members,
    trust,
    funded: Number(status.funded),
    total: Number(status.total),
    pot: status.potIfComplete,
    recipient: members.length ? members[Number(c.currentRound)] : null,
  };
}

export async function loadAllCircles(contract) {
  const count = Number(await contract.circleCount());
  const ids = Array.from({ length: count }, (_, i) => count - 1 - i); // newest first
  return Promise.all(ids.map((i) => loadCircle(contract, i)));
}

export function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}
