# Ajo — BOT Chain Africa Builder Challenge 2026 · Submission Pack

Everything you need to submit and present. Fill the `[ ]` blanks after you deploy.

---

## 1. Project pitch (paste into the submission form)

**Ajo — thrift circles, kept honest by code.**

**What it is:** Ajo puts the West-African rotating savings circle (àjọ / èsúsú / adashe) on-chain. Neighbours each contribute a fixed amount every round; each round the whole pot goes to one member in turn, until everyone has been paid once. Traditionally a human treasurer holds the cash — and sometimes runs off with it. In Ajo the smart contract collects and pays out, so no one can steal the pot or take it out of turn. On-time payments build an on-chain trust score that follows each member to future circles.

**Why BOT Chain:** Built and deployed on BOT Chain Mainnet. Small, frequent contributions and payouts are only viable when fees are near-zero and finality is instant — exactly what BOT Chain's AI-native L1 delivers (~2s finality, negligible fees, EVM-compatible). An AI agent reads each circle's on-chain state, explains it in plain language, and autonomously triggers payouts the moment a round is fully funded.

**Track:** Real-World Application · Consumer · AI Agents

**Live on BOT Chain Mainnet:**
- Contract: `[ 0x… ]`
- Explorer: `https://scan.botchain.ai/address/[ 0x… ]`
- Demo video: `[ link ]`
- Repo: `[ link ]`

**What works today:**
- Create a circle, join it, start the rotation — all on Mainnet
- Contribute per round; the contract enforces exact amounts and one payment per member per round
- Automatic payout of the full pot to each round's recipient, in turn, until the circle completes
- On-chain trust score (on-time vs late payments) per member, portable across circles
- AI agent: plain-language circle advisor + autonomous keeper that disburses funded rounds

**Built with mentorship:** [ one line on a specific improvement a BOT Chain mentor helped with — e.g. "tightened the payout guard after mentor feedback on reentrancy" ]

**What's next:** ERC-20 stablecoin contributions, SMS/WhatsApp reminders from the agent, and reputation-gated circles that only admit members above a trust threshold.

---

## 2. Ninety-second demo script (Demo Day, Ogbomoso)

> Practise this out loud twice. Have the app open, agent running, and a second wallet ready.

1. **Hook (10s).** "Everyone here knows àjọ. You put money in every week, and each week someone collects the hand. The problem is the person holding the money. Ajo removes that person — the contract holds it."
2. **Show the circle (15s).** Open the app. "This is a real circle, live on BOT Chain Mainnet." Point to the contract link in the footer. "Six members, one BOT each per round, six-BOT pot."
3. **Contribute (20s).** Connect wallet, click **Contribute**. "That settled in about two seconds, and the fee was basically nothing — that's why this works for small everyday amounts. On most chains it wouldn't."
4. **Payout (20s).** Switch to the second wallet / the last member, contribute. "Now the round is fully funded — watch." The AI keeper (or the Pay-out button) releases the pot. "The whole pot just went to this round's recipient, automatically, by the rules in the contract. No treasurer touched it."
5. **The agent + trust (15s).** Point to the Ajo agent panel. "The agent explains every circle in plain language, and it's what triggered that payout on its own. And every on-time payment builds a trust score that follows you to your next circle."
6. **Close (10s).** "Ajo — the savings circle Africa already trusts, now enforced by code, on BOT Chain. Thank you."

---

## 3. Judge Q&A — be ready for these

- **"What stops someone taking the pot early?"** They can't. `disburse` only pays `members[currentRound]`, and only once every member has funded the round. The recipient order is fixed when the circle starts.
- **"What if someone doesn't pay?"** The round can't be disbursed until everyone has funded it, so the pot is never released short. Non-payment is visible on-chain and drags down that member's trust score; the roadmap adds reputation-gated circles that exclude chronic defaulters. (Be honest that enforcing contribution from a defaulter is a social/roadmap problem, not yet an on-chain slashing one.)
- **"Why not just use a bank / mobile money?"** Ajo needs no bank account, no treasurer, and no trust in a middleman — the rules are the contract, and the trust score is portable. That's the point.
- **"Why BOT Chain specifically?"** Micro-amounts and frequent payouts die on high fees or slow finality. BOT Chain's near-zero fees and ~2s finality make everyday-sized circles actually usable.
- **"Is the AI just for show?"** No — the keeper takes real on-chain action (`disburse`) autonomously; the advisor is a convenience layer. Both read live chain state.
- **"Did you build this yourself?"** Yes — walk them through `Ajo.sol`: the `Circle` struct, `contribute`, and the checks-effects-interactions in `disburse`. Knowing these three cold is your credibility.

---

## 4. Pre-Demo-Day checklist

- [ ] Contract deployed to BOT Chain Mainnet (`npm run deploy`), address in the pitch above
- [ ] App shows the live contract (footer link resolves on scan.botchain.ai)
- [ ] A real circle created and started on Mainnet, mid-rotation, ready to demo
- [ ] Second wallet funded with BOT for the live contribution
- [ ] Agent running with `ANTHROPIC_API_KEY` (advisor) and a funded `AGENT_PRIVATE_KEY` (keeper)
- [ ] 60–90s demo video recorded and linked (judges review Aug 15–20 and will click it first)
- [ ] You can explain the `Circle` struct, `contribute`, and `disburse` from memory
- [ ] Submitted via the official Project Submission Form before **Aug 13, 11:59 PM WAT**
