// The Ajo agent — two jobs, one process:
//
//   1. Advisor  (/advise)  — turns raw on-chain circle state into a warm, plain-
//      language read, using Claude. This is what the app's "Ajo agent" panel shows.
//   2. Keeper   (background) — if a funded AGENT_PRIVATE_KEY is set, the agent
//      watches every circle and autonomously calls disburse() the moment a round
//      is fully funded, so a payout never waits on a human. This is the piece that
//      makes Ajo genuinely AI-native on BOT Chain: an agent acting on-chain,
//      settling in ~2s at near-zero fees.
//
// The chain is always the source of truth; the agent only interprets and nudges it.

import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { JsonRpcProvider, Wallet, Contract, formatEther } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";

const here = dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(readFileSync(join(here, "..", "web", "src", "abi.json"), "utf8"));

const RPC = process.env.BOTCHAIN_RPC || "https://rpc.botchain.ai";
const CONTRACT = process.env.AJO_CONTRACT || "";
const PORT = process.env.PORT || 8787;

const provider = new JsonRpcProvider(RPC, 677);
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, contract: CONTRACT || null, advisor: Boolean(anthropic), keeper: Boolean(process.env.AGENT_PRIVATE_KEY) });
});

// --- Advisor ---------------------------------------------------------------
// The app POSTs the circle state; we return one short, warm HTML sentence.
app.post("/advise", async (req, res) => {
  const { circle, me } = req.body || {};
  if (!circle) return res.status(400).json({ error: "circle required" });

  if (!anthropic) return res.json({ advice: "" }); // let the app use its local fallback

  const facts = describe(circle, me);
  try {
    const msg = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 220,
      thinking: { type: "disabled" }, // a quick formatting task; keep it fast
      output_config: { effort: "low" },
      system:
        "You are the Ajo agent for an on-chain thrift circle (ajo/esusu) on BOT Chain. " +
        "Speak warmly and plainly, like a trusted circle treasurer from Ogbomoso — never like a crypto bot. " +
        "Reply with ONE sentence (max 2), no preamble, no emoji spam (at most one). " +
        "You may wrap a key figure or name in <b>…</b>. Never invent numbers; use only the facts given.",
      messages: [{ role: "user", content: facts }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text?.trim() || "";
    res.json({ advice: text });
  } catch (e) {
    console.error("advise error:", e.message);
    res.json({ advice: "" }); // fail soft — the app falls back locally
  }
});

function describe(c, me) {
  const mine = me && (c.members || []).some((m) => m.toLowerCase() === me.toLowerCase());
  const isRecipient = me && c.recipient && c.recipient.toLowerCase() === me.toLowerCase();
  return [
    `Circle "${c.name}" — ${c.contribution} BOT per round, ${c.maxMembers} members, full pot ${c.pot} BOT.`,
    `Status: ${c.completed ? "completed" : c.started ? `round ${c.currentRound + 1} of ${c.maxMembers}, ${c.funded}/${c.total} members paid in` : `open, ${c.memberCount}/${c.maxMembers} joined`}.`,
    c.started && !c.completed ? `This round's pot goes to member ${c.recipient}.` : "",
    me ? `The person reading this ${mine ? "is a member" : "is not a member"}${isRecipient ? " AND is this round's recipient" : ""}.` : "",
    "Tell them what's happening and what to do next.",
  ].filter(Boolean).join(" ");
}

// --- Keeper (autonomous on-chain agent) ------------------------------------
async function startKeeper() {
  if (!process.env.AGENT_PRIVATE_KEY) {
    console.log("Keeper: disabled (no AGENT_PRIVATE_KEY). Advice-only mode.");
    return;
  }
  if (!CONTRACT) {
    console.log("Keeper: disabled (no AJO_CONTRACT set).");
    return;
  }
  const wallet = new Wallet(process.env.AGENT_PRIVATE_KEY, provider);
  const ajo = new Contract(CONTRACT, abi, wallet);
  const bal = await provider.getBalance(wallet.address);
  console.log(`Keeper: live as ${wallet.address} (${formatEther(bal)} BOT for gas). Watching circles…`);

  async function sweep() {
    try {
      const count = Number(await ajo.circleCount());
      for (let id = 0; id < count; id++) {
        const c = await ajo.getCircle(id);
        if (!c.started || c.completed) continue;
        const s = await ajo.roundStatus(id);
        if (Number(s.funded) === Number(s.total) && Number(s.total) > 0) {
          console.log(`Keeper: circle #${id} round ${Number(c.currentRound) + 1} fully funded → disbursing…`);
          const tx = await ajo.disburse(id);
          await tx.wait();
          console.log(`Keeper: paid out circle #${id}. tx ${tx.hash}`);
        }
      }
    } catch (e) {
      console.error("Keeper sweep error:", e.message);
    }
  }
  sweep();
  setInterval(sweep, 15000); // BOT Chain finalizes in ~2s; a gentle 15s cadence is plenty.
}

app.listen(PORT, () => {
  console.log(`Ajo agent listening on :${PORT}  (advisor: ${anthropic ? "on" : "off"})`);
  startKeeper();
});
