# Ajo

**Ajo puts thrift circles on-chain. The contract keeps them honest.**

Ajo is the West African savings circle you already know. Yoruba people call it *àjọ*. Others call it *èsúsú*, *adashe*, or *susu*. A group of people each put in a fixed amount every round. Each round, one person collects the whole pot. It goes round in turn until everyone has been paid once.

In the normal way, one human keeps the money. Sometimes that person runs off with it. Everybody has heard that story. Ajo removes that person. Nobody holds the money now. The contract collects it, and the contract pays it out. So no one can steal the pot, and no one can take it out of turn. When you pay on time, you build a trust score that follows you to your next circle. Every circle also has an AI agent that explains what is happening in plain words, and pays out a round on its own the moment it is fully funded.

Built for the **BOT Chain Africa Builder Challenge 2026**.

- **Track:** Real-World Application, Consumer, AI Agents
- **Chain:** BOT Chain Mainnet (chainId `677`, token `BOT`, about 2s finality, near-zero fees)
- **Live site:** https://excellency001-boop.github.io/ajo-botchain/
- **Contract (verified):** [`0xFd47723Dd774511a3A4D7EB8Be868B31f4036683`](https://scan.botchain.ai/address/0xFd47723Dd774511a3A4D7EB8Be868B31f4036683#code)

## Why BOT Chain

A thrift circle is small money moving often. A little in every week, for months. That only works on-chain if two things are true.

1. **The fees are almost nothing.** If it costs 200 naira in gas to send a 200 naira contribution, the circle is dead before it starts. BOT Chain fees are tiny, so everyday-sized contributions make sense.
2. **The money moves fast.** A payout should feel like handing over cash. BOT Chain settles in about 2 seconds, so a member sees the pot land before they pocket their phone.

On a slow or costly chain, Ajo would just be a demo nobody could afford to use. On BOT Chain it is something a market woman in Ogbomoso could actually run. Ajo also uses BOT Chain the way it was meant to be used. An agent watches every circle and settles funded rounds itself. That is an AI agent taking real action on-chain, which is what this L1 is built for. That is the difference between porting to BOT Chain and building for it.

## What is in here

```
ajo/
  contracts/Ajo.sol     the whole protocol, one readable, commented Solidity file
  test/Ajo.test.js      full lifecycle tests (create, join, start, contribute, payout)
  scripts/deploy.js     deploys to BOT Chain and wires the address into the app
  web/                  the React app (connect wallet, create/join/contribute, live rounds)
  agent/                the Ajo agent (advisor + autonomous keeper)
```

## How a circle works

1. **Create.** Anyone opens a circle. You set a name, the amount each member pays per round, how many members (which is also the number of rounds), and how long a round stays on time. The person who creates it becomes member 1.
2. **Join.** Others join until the circle is full.
3. **Start.** The organizer starts the rotation once the circle is full. Round 0 opens. Its recipient is member 1.
4. **Contribute.** Every round, every member pays the fixed amount. Paying inside the time window counts as on time and lifts your trust score.
5. **Disburse.** Once every member has funded the round, anyone (including the AI keeper) can release the whole pot to that round's recipient. The round moves on, and the next member is up.
6. This repeats until everyone has taken their hand once. Then the circle is complete and every member's trust score is updated on-chain.

No member can hold up a payout, because anyone can call `disburse`. No one can pay twice in a round. No one can take the pot out of turn. The money only ever moves by the rules written in [`contracts/Ajo.sol`](contracts/Ajo.sol).

## Run it locally

```bash
# 1. Contracts. Install, compile, and run the tests.
cd ajo
npm install
npm test
```

```bash
# 2. The app.
cd web
npm install
npm run dev
```

```bash
# 3. The AI agent (optional, but it is the AI-native part).
cd agent
cp .env.example .env   # add your ANTHROPIC_API_KEY (and AJO_CONTRACT after you deploy)
npm install
npm start              # advisor on :8787. Add AGENT_PRIVATE_KEY to turn on the keeper.
```

## Deploy

Testnet first (free faucet at faucet.botchain.ai/basic), then Mainnet.

```bash
cd ajo
echo "PRIVATE_KEY=your_funded_key" > .env
npm run deploy:testnet   # BOT Chain testnet (chainId 968)
npm run deploy           # BOT Chain mainnet (chainId 677)
```

`deploy.js` prints the contract address and explorer link, and writes it into `deployments/` and `web/src/deployment.json`. The app picks it up automatically. Network settings are in [`hardhat.config.js`](hardhat.config.js).

## The AI agent

Two jobs, one process ([`agent/server.js`](agent/server.js)).

- **Advisor.** The app asks the agent to read a circle's live on-chain state and reply in one plain sentence, like "2 members still to pay in. You get 6 BOT the moment the last one pays." It uses Claude. If the agent is off, the app falls back to a local advisor, so the demo never goes blank.
- **Keeper.** With a funded `AGENT_PRIVATE_KEY`, the agent watches every circle and calls `disburse()` itself the moment a round is fully funded. No member ever has to chase a payout. This is the AI acting on-chain, settling in about 2 seconds at near-zero fees.

The chain is always the source of truth. The agent only reads it and moves it forward.
