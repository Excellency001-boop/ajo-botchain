# Ajo — thrift circles, kept honest by code

**The savings circle your grandmother trusted, now enforced by a smart contract on BOT Chain.**

Ajo digitises the West-African rotating savings circle — *àjọ* (Yoruba), *èsúsú*, *adashe*, *susu* — on [BOT Chain](https://www.botchain.ai) Mainnet. A group of neighbours each contribute a fixed amount every round; each round the whole pot is paid out to one member in turn, until everyone has been paid once. In the traditional version a human treasurer holds the money — and sometimes disappears with it. In Ajo, **no one holds the money: the contract collects it and the contract pays it out.** On-time payments build an on-chain trust score that travels with each member to future circles. An AI agent explains the state of every circle in plain language and can autonomously trigger payouts the moment a round is fully funded.

Built for the **BOT Chain Africa Builder Challenge 2026**.

- **Track:** Real-World Application · Consumer · AI Agents
- **Chain:** BOT Chain Mainnet (chainId `677`, native token `BOT`, ~2s finality, near-zero fees)
- **Live:** contract `0xFd47723Dd774511a3A4D7EB8Be868B31f4036683` ([verified on scan.botchain.ai](https://scan.botchain.ai/address/0xFd47723Dd774511a3A4D7EB8Be868B31f4036683#code)) · [live site](https://excellency001-boop.github.io/ajo-botchain/)

---

## Why BOT Chain — built for it, not ported to it

A thrift circle is *defined* by small, frequent money movements: a few hundred naira in, every week, for months. That pattern only survives on-chain if two things are true:

1. **Fees are effectively zero.** If it costs ₦200 in gas to contribute ₦200, the circle is dead on arrival. BOT Chain's near-zero fees make everyday-sized contributions viable — which is the whole point of ajo.
2. **Finality is near-instant.** A payout has to feel like handing over cash. BOT Chain's ~2-second finality means a member sees the pot arrive before they've pocketed their phone.

On a slow or expensive chain, Ajo would be a demo that no real person could afford to use. On BOT Chain it's a product a market woman in Ogbomoso could actually run. Ajo also leans into BOT Chain's AI-native design: an autonomous agent watches every circle and settles funded rounds itself — an AI agent taking real on-chain action, which is exactly what this L1 was built for. That's the difference between *ported to* BOT Chain and *built for* it.

---

## What's in here

```
ajo/
├── contracts/Ajo.sol       the whole protocol — one readable, commented Solidity file
├── test/Ajo.test.js        full lifecycle test suite (create → join → start → contribute → payout)
├── scripts/deploy.js       deploys to BOT Chain Mainnet and wires the address into the app
├── web/                    the React app (wallet connect, create/join/contribute, live rounds)
└── agent/                  the Ajo agent — plain-language advisor (Claude) + autonomous on-chain keeper
```

## How the circle works (the contract)

1. **Create** — anyone opens a circle: a name, the per-round contribution, the number of members (= number of rounds), and how long a round stays "on time". The organiser becomes member #1.
2. **Join** — others join until the circle is full.
3. **Start** — the organiser starts the rotation once the circle is full. Round 0 opens; its recipient is member #1.
4. **Contribute** — every round, every member pays the fixed contribution. Paying inside the window counts as on-time and lifts your trust score.
5. **Disburse** — once every member has funded the round, *anyone* (including the AI keeper) can release the whole pot to that round's recipient. The round advances; the next member is up.
6. Repeat until every member has taken their hand once. The circle completes; reputations are updated on-chain.

No member can stall a payout (anyone can call `disburse`), no one can pay twice in a round, and no one can take the pot out of turn. The money only ever moves according to the rules encoded in [`contracts/Ajo.sol`](contracts/Ajo.sol).

---

## Run it locally

```bash
# 1. Contracts — install, compile, and prove it works
cd ajo
npm install
npm test            # 5 passing: full circle runs, payouts exact, guards hold
```

```bash
# 2. The app
cd web
npm install
npm run dev         # http://localhost:5173
```

```bash
# 3. The AI agent (optional but it's the AI-native hook)
cd agent
cp .env.example .env   # add your ANTHROPIC_API_KEY (and AJO_CONTRACT after you deploy)
npm install
npm start              # advisor on :8787; add AGENT_PRIVATE_KEY to enable the autonomous keeper
```

## Deploy to BOT Chain Mainnet

```bash
cd ajo
echo "PRIVATE_KEY=<your funded BOT Chain key>" > .env
npm run deploy
```

`deploy.js` prints the contract address and its explorer link, and writes it into both
`deployments/botchain.json` and `web/src/deployment.json` — so the app lights up with the
live contract automatically. Add that address to `agent/.env` as `AJO_CONTRACT` to point the
agent at it.

Network is pre-configured in [`hardhat.config.js`](hardhat.config.js):
RPC `https://rpc.botchain.ai`, chainId `677`, explorer `https://scan.botchain.ai`.

---

## The AI agent

Two jobs, one process ([`agent/server.js`](agent/server.js)):

- **Advisor** — the app's "Ajo agent" panel asks the agent to read each circle's on-chain state and reply in one warm, plain-language sentence ("2 members still to pay in — you'll receive 6 BOT the moment the last one does"). Powered by Claude; the app falls back to a local advisor if the agent is offline, so the demo never breaks.
- **Keeper** — with a funded `AGENT_PRIVATE_KEY`, the agent watches every circle and autonomously calls `disburse()` the instant a round is fully funded. A payout never waits on a human. This is Ajo's AI-native core: an agent taking real on-chain action, settling in ~2s at near-zero fees — the thing BOT Chain was built for.

The chain is always the source of truth; the agent only interprets it and nudges it forward.
