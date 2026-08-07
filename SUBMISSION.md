# Ajo. BOT Chain Africa Builder Challenge 2026. Submission pack

Everything to submit and present. Deployed, verified, and live. Only the demo video link and the mentorship line are left to fill.

## 1. Project pitch (paste into the submission form)

**Ajo puts thrift circles on-chain. The contract keeps them honest.**

**What it is.** Ajo is the West African savings circle (àjọ, èsúsú, adashe) on-chain. Everyone puts in a fixed amount every round. Each round, one member collects the whole pot. It goes round in turn until everyone has been paid. Normally one human keeps the money, and sometimes that person runs off with it. In Ajo the contract keeps the money and pays it out, so nobody can steal the pot or take it out of turn. Paying on time builds a trust score that follows each member to their next circle.

**Why BOT Chain.** Built and deployed on BOT Chain Mainnet. A thrift circle is small money moving often, and that only works if fees are almost nothing and the money moves fast. BOT Chain gives near-zero fees and about 2-second finality, so everyday-sized contributions actually make sense. An AI agent reads each circle's on-chain state, explains it in plain words, and pays out a round on its own the moment it is fully funded.

**Track.** Real-World Application, Consumer, AI Agents.

**Live on BOT Chain Mainnet.**
- Live site: https://excellency001-boop.github.io/ajo-botchain/
- Contract (verified): https://scan.botchain.ai/address/0xFd47723Dd774511a3A4D7EB8Be868B31f4036683
- Contract address: `0xFd47723Dd774511a3A4D7EB8Be868B31f4036683`
- Repo: https://github.com/Excellency001-boop/ajo-botchain
- Demo video: `add your 60 to 90 second video link`

**What works today.**
- Create a circle, join it, start the rotation, all on Mainnet.
- Contribute per round. The contract checks the exact amount and one payment per member per round.
- The full pot pays out to each round's recipient in turn, until the circle completes.
- On-chain trust score per member, from on-time versus late payments, portable across circles.
- The AI agent: a plain-language advisor plus an autonomous keeper that disburses funded rounds.

**Built with mentorship.** `add one line about a specific thing a BOT Chain mentor helped you improve.`

**What is next.** Stablecoin contributions, reminders over WhatsApp, and circles that only admit members above a trust score.

## 2. Ninety-second demo script (Demo Day, Ogbomoso)

> Open the app to the "Market Women Adashe" circle. It is already staged on Mainnet at round 2, funded 2 of 3, so one live contribution triggers the payout. Say it out loud twice before you present.

1. **Hook (12s).** Look up, do not read. "My grandmother was in an àjọ. Every week she put money in, and every week one woman took the whole hand. It worked, until the year the person keeping the money disappeared with it. Everybody in this room knows that story. Ajo makes it impossible. The contract keeps the money now. No human treasurer, ever."
2. **Show it is real (13s).** "This is not a mockup. It is live on BOT Chain Mainnet." Point to the footer. Contract on scan.botchain.ai, verified. "Real circle, real members, real trust scores, all read straight from the chain."
3. **Contribute (20s).** Connect wallet, tap Contribute on Market Women Adashe. "That settled in about two seconds, and the fee was almost nothing. That is the whole reason this can exist. A market woman putting in 200 naira a week cannot lose it to gas. On a slow or costly chain, Ajo would just be a demo. On BOT Chain it is a product."
4. **Payout, live (20s).** "That was the last contribution this round needed. Watch." The keeper, or the Pay out button, releases the pot. "The full pot just went to this week's member, on its own, by the rules in the contract. Nobody could take it early, and nobody had to be trusted to hand it over."
5. **Agent and trust (15s).** Point to the Ajo agent. "That payout was not me. The agent did it the moment the round was funded. It also explains every circle in plain words. And see these scores. Paying on time builds a trust score that follows you to your next circle."
6. **Close (10s).** "Ajo. The savings circle Africa has always trusted, now kept honest by code, built for BOT Chain. Thank you."

## 3. Judge Q&A. Be ready for these

- **"What stops someone taking the pot early?"** They cannot. `disburse` only pays `members[currentRound]`, and only after every member has funded the round. The order is fixed when the circle starts.
- **"What if someone does not pay?"** The round cannot pay out until everyone has funded it, so the pot is never released short. Non-payment shows on-chain and lowers that member's trust score. The roadmap adds circles that exclude members below a trust score. Be honest that forcing a defaulter to pay is a social and roadmap problem, not yet on-chain slashing.
- **"Why not just use a bank or mobile money?"** Ajo needs no bank account, no treasurer, and no trust in a middleman. The rules are the contract, and the trust score is portable. That is the point.
- **"Why BOT Chain?"** Small amounts and frequent payouts die on high fees or slow finality. BOT Chain's near-zero fees and about 2s finality make everyday circles usable.
- **"Is the AI just for show?"** No. The keeper takes real on-chain action (`disburse`) on its own. The advisor is the plain-language layer. Both read live chain state.
- **"Did you build this yourself?"** Yes. Walk them through `Ajo.sol`: the `Circle` struct, `contribute`, and the checks-effects-interactions order in `disburse`. Knowing those three cold is your credibility.

## 4. Before Demo Day

- [x] Contract deployed and verified on BOT Chain Mainnet (`0xFd47…6683`).
- [x] Live site up with footer links to the contract and GitHub.
- [x] A real circle staged on Mainnet, mid-rotation ("Market Women Adashe", round 2, funded 2 of 3), so one live contribution triggers a payout.
- [x] Trust scores show in the app (real 100s from the completed round).
- [ ] The demo wallet (deployer, in `.env` or `.demo-wallets.json`) imported into MetaMask, so you can contribute live on stage.
- [ ] Agent running with `ANTHROPIC_API_KEY` (advisor) and a funded `AGENT_PRIVATE_KEY` (keeper). Optional. The app has a local fallback if it is off.
- [ ] 60 to 90 second demo video recorded and linked. Judges review Aug 15 to 20 and will watch it first.
- [ ] You can explain `Circle`, `contribute`, and `disburse` from memory.
- [ ] Submitted on the official form before Aug 13, 11:59 PM WAT.

> If you use up the staged round before Demo Day, the state lives on-chain, so just fund round 2's last contribution to see the payout again, or re-run the staging with fresh helper wallets. Keep a little BOT in the deployer for gas.
