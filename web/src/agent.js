// The Ajo agent, as seen by the UI.
//
// If the AI agent service (see /agent) is running, we ask it for a warm, plain-language
// read on the circle. It is the same brain that also sends reminders and auto-pays rounds.
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
    /* service asleep, so use the local advisor below */
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

// A compact rule-based version of what the LLM says. Good enough that the demo
// stands on its own even offline, and it keeps the agent's "voice" consistent.
function localAdvice(c, me) {
  const mine = me && c.members.some((m) => m.toLowerCase() === me);
  const isRecipient = me && c.recipient && c.recipient.toLowerCase() === me;
  const people = (n) => `${n} ${n === 1 ? "person" : "people"}`;

  if (c.completed) return `The circle is complete. Everybody has collected their hand. I have saved each person's trust on-chain. 🎉`;

  if (!c.started) {
    const left = c.maxMembers - c.memberCount;
    if (left === 0) return `The circle is full now. The organizer can start it, and the first hand goes to <b>${short(c.members[0])}</b>.`;
    if (mine) return `You are in, so relax. We just need <b>${people(left)}</b> more before we can start.`;
    return `We need <b>${people(left)}</b> more to begin. Join now so your turn is set early.`;
  }

  const waiting = c.total - c.funded;
  if (waiting === 0) return `Everybody has paid this round. The <b>${formatEther(c.pot)} BOT</b> is ready for <b>${short(c.recipient)}</b>. I am sending it now.`;

  if (isRecipient) return `This turn is yours. Just <b>${people(waiting)}</b> left to pay, then the full <b>${formatEther(c.pot)} BOT</b> comes to you.`;
  if (mine) return `Round ${c.currentRound + 1} is open. This turn goes to <b>${short(c.recipient)}</b>. Drop your money on time and your trust stays strong. ${people(waiting)} still to pay.`;
  return `Round ${c.currentRound + 1} of ${c.maxMembers}. <b>${c.funded}/${c.total}</b> have paid. This turn goes to <b>${short(c.recipient)}</b>.`;
}
