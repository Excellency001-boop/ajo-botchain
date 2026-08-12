// One keeper sweep. Reads every circle, and pays out any round that is fully
// funded. Meant to be run on a timer (GitHub Actions) so payouts happen on their
// own without a server. The private key comes from the AGENT_PRIVATE_KEY secret.
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { readFileSync } from "fs";

const dep = JSON.parse(readFileSync("web/src/deployment.json", "utf8"));
const key = process.env.AGENT_PRIVATE_KEY;
if (!key) { console.log("No AGENT_PRIVATE_KEY set, nothing to do."); process.exit(0); }

(async () => {
  const provider = new JsonRpcProvider("https://rpc.botchain.ai", 677);
  const wallet = new Wallet(key, provider);
  const ajo = new Contract(dep.address, dep.abi, wallet);
  const count = Number(await ajo.circleCount());
  console.log(`Keeper sweep across ${count} circles as ${wallet.address}`);
  for (let id = 0; id < count; id++) {
    try {
      const c = await ajo.getCircle(id);
      if (!c.started || c.completed) continue;
      const s = await ajo.roundStatus(id);
      if (Number(s.funded) === Number(s.total) && Number(s.total) > 0) {
        console.log(`Circle ${id} round ${Number(c.currentRound) + 1} is fully funded, releasing the pot...`);
        const tx = await ajo.disburse(id);
        await tx.wait();
        console.log(`Paid out circle ${id}: ${tx.hash}`);
      }
    } catch (e) {
      console.log(`Circle ${id}: ${e.message}`); // harmless, try again next run
    }
  }
  console.log("Sweep done.");
})().catch((e) => { console.log(e.message); process.exit(0); });
