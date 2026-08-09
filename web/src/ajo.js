// Thin ethers.js layer between the UI and the Ajo contract on BOT Chain.
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther } from "ethers";
import abi from "./abi.json";
import deployment from "./deployment.json";
import { WALLETCONNECT_PROJECT_ID } from "./wc-config.js";

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

// Ask the injected wallet (MetaMask etc.) to switch to BOT Chain, or add it if missing.
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

export function isMobile() {
  return typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

// EIP-6963: every modern EVM wallet announces itself here, so we can list them all
// and let the user pick, instead of guessing one. This is what fixes the "PC shows
// multiple" clash and lets any wallet (MetaMask, OKX, Coinbase, Rabby, Trust) work.
const _wallets = [];
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => {
    const d = e.detail;
    if (d && d.info && !_wallets.some((w) => w.info.uuid === d.info.uuid)) _wallets.push(d);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

// Ask the wallets to announce, give them a moment, then return whatever we found.
export function discoverWallets() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve([]);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => resolve(_wallets.slice()), 250);
  });
}

export function metamaskDeepLink() {
  return "https://metamask.app.link/dapp/" + location.host + location.pathname;
}

// Connect with a chosen wallet (from the picker), or the default injected one.
export async function connectWith(provider) {
  const eth = provider || window.ethereum;
  if (!eth) {
    // No wallet inside this browser. On a phone, that is normal: the wallet lives in
    // the wallet app. Send them into MetaMask's in-app browser as a fallback.
    if (isMobile()) {
      window.location.href = metamaskDeepLink();
      throw new Error("Opening your wallet app. If nothing opens, open this page inside your wallet's own browser.");
    }
    throw new Error("No wallet found. Install a wallet like MetaMask, or open this page in your wallet's browser.");
  }
  await eth.request({ method: "eth_requestAccounts" });
  // Try to put them on BOT Chain, but do not fail the connection if the wallet is
  // already on it or does not allow switching this way.
  try { await ensureBotChain(eth); } catch (_) { /* keep going */ }
  const p = new BrowserProvider(eth);
  const signer = await p.getSigner();
  const address = await signer.getAddress();
  return { signer, address, contract: new Contract(CONTRACT_ADDRESS, abi, signer) };
}

export async function connectWallet() {
  return connectWith(null);
}

// WalletConnect: works on any phone browser. It shows a list of wallets, the user
// picks one, and it opens that wallet app to approve. Needs a free Project ID.
export function hasWalletConnect() {
  return Boolean(WALLETCONNECT_PROJECT_ID);
}

export async function connectWalletConnect() {
  if (!WALLETCONNECT_PROJECT_ID) throw new Error("WalletConnect is not set up yet.");
  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const wc = await EthereumProvider.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    chains: [BOT_CHAIN.chainId],
    optionalChains: [BOT_CHAIN.chainId],
    rpcMap: { [BOT_CHAIN.chainId]: BOT_CHAIN.rpc },
    showQrModal: true,
    metadata: {
      name: "Ajo",
      description: "Ajo puts thrift circles on-chain. The contract keeps them honest.",
      url: "https://excellency001-boop.github.io/ajo-botchain/",
      icons: ["https://excellency001-boop.github.io/ajo-botchain/favicon.ico"],
    },
  });
  await wc.connect(); // opens the wallet list, deep-links to the chosen wallet on phone
  return connectWith(wc);
}

// ---- Read helpers -----------------------------------------------------------

export async function loadCircle(contract, id) {
  const c = await contract.getCircle(id);
  const members = await contract.getMembers(id);
  const status = await contract.roundStatus(id);
  // On-chain trust score (0 to 100) for each member. This is the reputation that travels with them.
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
