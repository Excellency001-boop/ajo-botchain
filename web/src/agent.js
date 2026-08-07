// The Ajo agent, as seen by the UI.
//
// If the AI agent service (see /agent) is running, we ask it for a warm, plain-language
// read on the circle — the same brain that also sends reminders and auto-pays rounds.
// If it isn't reachable, we fall back to a local advisor so the app is never mute. The
// on-chain state is always the source of truth; the agent only interprets it.

import { formatEther, short } from "./ajo.js";

const AGENT_URL = import.meta.env.VITE_AGENT_URL || "http://localhost:8787";

export async function askAgent(circle, me) {
  try {
    const res = await fetch(`${AGENT_URL}/advise`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ circle: serialize(circle), me }),
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const { advice } = await res.json();
      if (advice) return advice;
    }
  } catch {
    /* service asleep — use the local advisor below */
  }
  return localAdvice(circle, me);
}

function serialize(c) {
  return {
    id: c.id, name: c.name, contribution: formatEther(c.contribution), pot: formatEther(c.pot),
    members: c.members, memberCount: c.memberCount, maxMembers: c.maxMembers,
    currentRound: c.currentRound, funded: c.funded, total: c.total,
    started: c.started, completed: c.completed, recipient: c.recipient, roundDuration: c.roundDuration,
  };
}

// A compact rule-based version of what the LLM says — good enough that the demo
// stands on its own even offline, and it keeps the agent's "voice" consistent.
function localAdvice(c, me) {
  const mine = me && c.members.some((m) => m.toLowerCase() === me);
  const isRecipient = me && c.recipient && c.recipient.toLowerCase() === me;

  if (c.completed) return `This circle has come full round — every member has taken their hand. Reputations updated on-chain. 🎉`;

  if (!c.started) {
    const left = c.maxMembers - c.memberCount;
    if (left === 0) return `The circle is <b>full</b>. Organizer can start the rotation — round 1's hand goes to <b>${short(c.members[0])}</b>.`;
    return `<b>${left}</b> seat${left > 1 ? "s" : ""} left before this circle can begin. ${mine ? "You're in — sit tight." : "Join now to lock your place in the payout order."}`;
  }

  const waiting = c.total - c.funded;
  if (waiting === 0) return `Everyone has paid this round. The pot of <b>${formatEther(c.pot)} BOT</b> is ready to release to <b>${short(c.recipient)}</b> — anyone can trigger the payout.`;

  if (isRecipient) return `It's <b>your hand</b> this round. ${waiting} member${waiting > 1 ? "s" : ""} still to pay in — you'll receive <b>${formatEther(c.pot)} BOT</b> the moment the last one does.`;
  if (mine) return `Round ${c.currentRound + 1} is open. This week's hand goes to <b>${short(c.recipient)}</b>. Pay in on time to keep your trust score high — ${waiting} still owing.`;
  return `Round ${c.currentRound + 1} of ${c.maxMembers}. <b>${c.funded}/${c.total}</b> paid; the hand goes to <b>${short(c.recipient)}</b>.`;
}
