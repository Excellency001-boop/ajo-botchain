# Ajo — BOT Chain Africa Builder Challenge 2026 · Submission Pack

Everything you need to submit and present. Deployed, verified, and live — only the demo-video link and mentorship line are left to fill.

---

## 1. Project pitch (paste into the submission form)

**Ajo — thrift circles, kept honest by code.**

**What it is:** Ajo puts the West-African rotating savings circle (àjọ / èsúsú / adashe) on-chain. Neighbours each contribute a fixed amount every round; each round the whole pot goes to one member in turn, until everyone has been paid once. Traditionally a human treasurer holds the cash — and sometimes runs off with it. In Ajo the smart contract collects and pays out, so no one can steal the pot or take it out of turn. On-time payments build an on-chain trust score that follows each member to future circles.

**Why BOT Chain:** Built and deployed on BOT Chain Mainnet. Small, frequent contributions and payouts are only viable when fees are near-zero and finality is instant — exactly what BOT Chain's AI-native L1 delivers (~2s finality, negligible fees, EVM-compatible). An AI agent reads each circle's on-chain state, explains it in plain language, and autonomously triggers payouts the moment a round is fully funded.

**Track:** Real-World Application · Consumer · AI Agents

**Live on BOT Chain Mainnet:**
- Live site: https://excellency001-boop.github.io/ajo-botchain/
- Contract (verified ✓): https://scan.botchain.ai/address/0xFd47723Dd774511a3A4D7EB8Be868B31f4036683
- Contract address: `0xFd47723Dd774511a3A4D7EB8Be868B31f4036683`
- Repo: https://github.com/Excellency001-boop/ajo-botchain
- Demo video: `[ add your 60–90s video link ]`

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

> Open the app to the **"Market Women Adashe"** circle — it's already staged on Mainnet at round 2, 2/3 funded, so one live contribution triggers the payout. Practise this out loud twice.

1. **Hook (12s).** *Look up, don't read.* "My grandmother was in an àjọ. Every week she put money in, and every week one woman took the whole hand. It worked — until the year the person keeping the money disappeared with it. Everyone in this room knows that story. **Ajo makes it impossible.** The contract keeps the money now — no human treasurer, ever."
2. **Show it's real (13s).** "This isn't a mockup — it's live on BOT Chain Mainnet." Point to the footer: contract on scan.botchain.ai, verified ✓. "Real circle, real members, real trust scores you can see — all read straight from the chain."
3. **Contribute (20s).** Connect wallet → **Contribute** on Market Women Adashe. "That settled in about two seconds, and the fee was basically nothing. That's the whole reason this can exist — a market woman contributing ₦200 a week can't lose it to gas. On a slow or costly chain, Ajo would just be a demo. On BOT Chain it's a product."
4. **Payout, live (20s).** "That was the last contribution this round needed — watch." The AI keeper (or the **Pay out** button) releases the pot. "The full pot just went to this week's member, automatically, by the rules in the contract. Nobody could take it early, and nobody had to be trusted to hand it over."
5. **Agent + trust (15s).** Point to the Ajo agent. "That payout wasn't me — the agent did it on its own the moment the round was funded. It also explains every circle in plain language. And see these scores? Paying on time builds a trust score that follows you to your next circle."
6. **Close (10s).** "Ajo — the savings circle Africa has always trusted, now kept honest by code, built for BOT Chain. Thank you."

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

- [x] Contract deployed **and verified** on BOT Chain Mainnet (`0xFd47…6683`)
- [x] Live site up (https://excellency001-boop.github.io/ajo-botchain/) with footer links to contract + GitHub
- [x] A real circle staged on Mainnet, mid-rotation ("Market Women Adashe", round 2, 2/3 funded) — one live contribution triggers a payout
- [x] Trust scores visible in the UI (real 100s from the completed round)
- [ ] The demo wallet (deployer, in `.env` / `.demo-wallets.json`) imported into MetaMask, so you can contribute live on stage
- [ ] Agent running with `ANTHROPIC_API_KEY` (advisor) and a funded `AGENT_PRIVATE_KEY` (keeper) — optional; app has a local fallback if it's off
- [ ] 60–90s demo video recorded and linked (judges review Aug 15–20 and will click it first)
- [ ] You can explain the `Circle` struct, `contribute`, and `disburse` from memory
- [ ] Submitted via the official Project Submission Form before **Aug 13, 11:59 PM WAT**

> **Reset the demo circle** if you burn through the staged round before Demo Day: the state lives on-chain, so just fund round 2's last contribution (the deployer's) to see the payout, or re-run the staging with fresh helper wallets. Keep a little BOT in the deployer for gas.
