import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  BOT_CHAIN, CONTRACT_ADDRESS, GITHUB_URL, connectWallet, readContract,
  loadAllCircles, short, formatEther, parseEther,
} from "./ajo.js";
import { askAgent } from "./agent.js";

export default function App() {
  const [wallet, setWallet] = useState(null); // { signer, address, contract }
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 4200);
  }, []);

  const deployed = Boolean(CONTRACT_ADDRESS);

  const refresh = useCallback(async () => {
    if (!deployed) { setLoading(false); return; }
    try {
      const c = wallet?.contract || readContract();
      setCircles(await loadAllCircles(c));
    } catch (e) {
      console.error(e);
      notify("Couldn't reach BOT Chain. Retrying…", true);
    } finally {
      setLoading(false);
    }
  }, [wallet, deployed, notify]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!deployed) return;
    const t = setInterval(refresh, 12000); // BOT Chain finalizes in ~2s; poll gently.
    return () => clearInterval(t);
  }, [refresh, deployed]);

  async function onConnect() {
    try {
      const w = await connectWallet();
      setWallet(w);
      notify(`Connected ${short(w.address)} on BOT Chain`);
    } catch (e) {
      notify(e.message || "Connection failed", true);
    }
  }

  return (
    <>
      <TopBar wallet={wallet} onConnect={onConnect} />
      <Hero onConnect={onConnect} connected={Boolean(wallet)} />

      <WhyBotChain />
      <AgentStrip />

      <main className="wrap">
        {!deployed && (
          <div className="banner">
            <b>Almost live.</b> The Ajo contract isn't published to BOT Chain Mainnet yet.
            Run <code>npm run deploy</code> and this page will fill with real circles.
          </div>
        )}

        <section className="section" id="circles">
          <div className="section-head">
            <h3>The circles</h3>
            <p>{circles.length ? `${circles.length} on-chain · live from BOT Chain` : "None yet. Start the first one."}</p>
          </div>
          {loading ? (
            <div className="empty"><div className="em">Reading the ledger…</div></div>
          ) : circles.length === 0 ? (
            <div className="empty">
              <div className="em">No circles have been woven yet.</div>
              <p>Create one below. You will be its first member.</p>
            </div>
          ) : (
            <div className="grid">
              {circles.map((c) => (
                <CircleCard key={c.id} c={c} wallet={wallet} onConnect={onConnect} refresh={refresh} notify={notify} />
              ))}
            </div>
          )}
        </section>

        <CreateCircle wallet={wallet} onConnect={onConnect} onCreated={refresh} notify={notify} />
      </main>

      <footer className="wrap">
        <div className="foot-links">
          {deployed && (
            <a className="foot-link" href={`${BOT_CHAIN.explorer}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
              <span className="foot-ic">⛓</span> Contract on {BOT_CHAIN.explorer.replace("https://", "")} <span className="verified">✓ verified</span>
            </a>
          )}
          <a className="foot-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
            <span className="foot-ic">◍</span> Source on GitHub
          </a>
        </div>
        <div className="foot-note">
          Built for <b>BOT Chain</b>. A contribution or a payout settles in about 2 seconds, and the fee is
          almost nothing. That is what makes small, everyday ajo circles work on-chain. <b>Àjọ</b> · Èsúsú · Adashe.
        </div>
      </footer>

      {toast && <div className={`toast ${toast.err ? "err" : ""}`}>{toast.msg}</div>}
    </>
  );
}

/* ------------------------------------------------------------------ TopBar */
function TopBar({ wallet, onConnect }) {
  return (
    <header className="topbar">
      <div className="wrap">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Ajo</h1>
            <span>Thrift circles, kept honest</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="chain-pill"><span className="dot" /> {BOT_CHAIN.name}</span>
          {wallet
            ? <span className="chain-pill mono">{short(wallet.address)}</span>
            : <button className="btn btn-indigo btn-sm" onClick={onConnect}>Connect wallet</button>}
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- Hero */
function Hero({ onConnect, connected }) {
  const seats = 6;
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">Àjọ · Èsúsú · Adashe · on-chain</span>
          <h2>The savings circle your grandmother trusted. <em>Now kept honest by code.</em></h2>
          <p>
            Everyone pays in a little each round. Each round, one member collects the whole pot.
            It goes round in turn until everyone has been paid. <b>No treasurer holds the money.
            The contract does.</b> So nobody can run off with the pot. And when you pay on time,
            you build a trust score that follows you to your next circle.
          </p>
          <div className="hero-cta">
            {!connected && <button className="btn btn-primary" onClick={onConnect}>Connect &amp; join a circle</button>}
            <a className="btn btn-ghost" href="#circles">See live circles ↓</a>
          </div>
          <div className="hero-proof">
            <span className="proof-item"><b>0</b> treasurers</span>
            <span className="proof-sep" />
            <span className="proof-item"><b>~2s</b> payouts</span>
            <span className="proof-sep" />
            <span className="proof-item"><b>≈0</b> fees</span>
            <span className="proof-sep" />
            <span className="proof-item"><b>100%</b> on-chain</span>
          </div>
        </div>
        <CircleArt seats={seats} active={2} />
      </div>
    </section>
  );
}

function CircleArt({ seats, active }) {
  const items = Array.from({ length: seats });
  return (
    <div className="circle-art">
      <div className="ring" />
      {items.map((_, i) => {
        const angle = (i / seats) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + 39 * Math.cos(angle);
        const y = 50 + 39 * Math.sin(angle);
        return (
          <div key={i} className={`seat ${i === active ? "active" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}>
            {i === active ? "🫲" : "🧍"}
          </div>
        );
      })}
      <div className="hand">
        <small>this week</small>
        <b>Seat 3</b>
        <small>takes the hand</small>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Why BOT Chain band */
function WhyBotChain() {
  return (
    <section className="whyband">
      <div className="wrap whyband-inner">
        <div className="whyband-lead">
          <span className="eyebrow light">Why BOT Chain</span>
          <h3>Ajo is built <em>for</em> BOT Chain. Not ported to it.</h3>
          <p>
            A thrift circle is small money moving often. A little in every week, for months. That
            only works on-chain if the fees are almost nothing and the money moves fast. If it costs
            200 naira in gas to send 200 naira, the circle is dead before it starts. BOT Chain has
            <b> near-zero fees</b> and <b>about 2-second finality</b>. That is what lets a real ajo,
            the kind market women in Ogbomoso run, live on-chain.
          </p>
        </div>
        <div className="whyband-stats">
          <div className="wstat"><div className="wstat-n">~2s</div><div className="wstat-l">to finality. A payout clears before you pocket your phone.</div></div>
          <div className="wstat"><div className="wstat-n">≈0</div><div className="wstat-l">fees. So small weekly contributions actually make sense.</div></div>
          <div className="wstat"><div className="wstat-n">EVM</div><div className="wstat-l">native. Same rules, open for every member to check.</div></div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- The Ajo agent (AI) strip */
function AgentStrip() {
  return (
    <section className="wrap agentstrip">
      <div className="agentstrip-card">
        <div className="agentstrip-halo" />
        <div className="agentstrip-body">
          <span className="eyebrow light">AI-native, on-chain</span>
          <h3>Meet the Ajo agent</h3>
          <p>
            Every circle has an agent watching it. It does two real jobs. Not decoration.
          </p>
          <div className="agentroles">
            <div className="agentrole">
              <div className="agentrole-tag">Advisor</div>
              <p>It reads each circle's live on-chain state and explains it in plain words. Who is next for the hand, who still owes, what to do now.</p>
            </div>
            <div className="agentrole">
              <div className="agentrole-tag">Autonomous keeper</div>
              <p>The moment a round is fully funded, the agent calls the payout <em>itself</em>, on-chain. No member ever has to chase it. This is the AI acting, not just talking.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ CreateCircle */
function CreateCircle({ wallet, onConnect, onCreated, notify }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("1");
  const [size, setSize] = useState(6);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!wallet) return onConnect();
    if (!name.trim()) return notify("Give your circle a name", true);
    setBusy(true);
    try {
      const tx = await wallet.contract.createCircle(
        name.trim(), parseEther(String(amount)), Number(size), Number(days) * 86400
      );
      notify("Creating circle… confirming on BOT Chain");
      await tx.wait();
      notify(`"${name}" is live. You're member #1.`);
      setName("");
      onCreated();
    } catch (e) {
      notify(reason(e), true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="section-head">
        <h3>Start a circle</h3>
        <p>You become the organizer and its first member</p>
      </div>
      <div className="card card-pad">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Circle name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ogbomoso Traders Ajo" />
            </div>
            <div>
              <label>Contribution per round (BOT)</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label>Members</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {[3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} people · {n} rounds</option>)}
              </select>
            </div>
            <div>
              <label>Round window (days)</label>
              <select value={days} onChange={(e) => setDays(e.target.value)}>
                {[1, 3, 7, 14, 30].map((n) => <option key={n} value={n}>{n} day{n > 1 ? "s" : ""}</option>)}
              </select>
              <div className="hint">Paying inside the window builds your on-chain trust score.</div>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Confirming…" : wallet ? "Create circle" : "Connect to create"}
              </button>
              <span className="hint">Each round, the full pot ({Number(amount) * Number(size)} BOT) goes to one member in turn.</span>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- CircleCard */
function CircleCard({ c, wallet, onConnect, refresh, notify }) {
  const [busy, setBusy] = useState("");
  const me = wallet?.address?.toLowerCase();
  const iAmMember = c.members.some((m) => m.toLowerCase() === me);
  const iAmOrganizer = c.organizer.toLowerCase() === me;
  const myRound = c.members.findIndex((m) => m.toLowerCase() === me);
  const iPaidThisRound = false; // resolved on click; kept simple for the card view

  const status = c.completed ? "done" : c.started ? "live" : "open";
  const badge = { open: ["badge-open", "Open · joining"], live: ["badge-live", `Round ${c.currentRound + 1}/${c.maxMembers}`], done: ["badge-done", "Completed"] }[status];

  async function act(kind, fn) {
    if (!wallet) return onConnect();
    setBusy(kind);
    try {
      const tx = await fn();
      notify("Confirming on BOT Chain…");
      await tx.wait();
      notify("Done ✓");
      refresh();
    } catch (e) {
      notify(reason(e), true);
    } finally {
      setBusy("");
    }
  }

  const roundFull = c.funded === c.total && c.total > 0;

  return (
    <article className="card circle-card">
      <div className="top">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
          <div>
            <h4 className="name">{c.name || `Circle #${c.id}`}</h4>
            <div className="sub">by {short(c.organizer)}{iAmOrganizer && " · you"}</div>
          </div>
          <span className={`badge ${badge[0]}`}>{badge[1]}</span>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="k">Per round</div>
          <div className="v">{formatEther(c.contribution)} <small>BOT</small></div>
        </div>
        <div className="stat">
          <div className="k">Full pot</div>
          <div className="v">{formatEther(c.pot)} <small>BOT</small></div>
        </div>
        <div className="stat">
          <div className="k">Members</div>
          <div className="v">{c.memberCount}<small>/{c.maxMembers}</small></div>
        </div>
      </div>

      {c.started && !c.completed && (
        <>
          <div style={{ padding: "0 20px 6px", fontSize: 13, color: "var(--ink-soft)" }}>
            This week's hand → <b style={{ color: "var(--clay-dark)" }}>{short(c.recipient)}{c.recipient?.toLowerCase() === me && " (you!)"}</b>
            {" · "}{c.funded}/{c.total} paid in
          </div>
          <div className="beads">
            {c.members.map((m, i) => {
              const isRecipient = i === c.currentRound;
              return <span key={i} className={`bead ${isRecipient ? "recipient" : ""} ${i < c.funded && !isRecipient ? "funded" : ""}`} title={short(m)} />;
            })}
          </div>
        </>
      )}

      <div className="roster">
        <div className="roster-head">Members &amp; trust</div>
        {c.members.map((m, i) => {
          const isRecipient = c.started && !c.completed && i === c.currentRound;
          const mine = m.toLowerCase() === me;
          const score = c.trust?.[i] ?? 50;
          return (
            <div key={i} className={`roster-row ${isRecipient ? "is-recipient" : ""}`}>
              <span className="roster-seat">{i + 1}</span>
              <span className="roster-addr mono">{short(m)}{mine && <em> · you</em>}{isRecipient && <em className="hand-tag"> · this week's hand</em>}</span>
              <span className={`trust-chip ${score >= 80 ? "good" : score >= 50 ? "ok" : "low"}`} title="On-chain trust score (on-time payments)">{score}</span>
            </div>
          );
        })}
        {c.memberCount < c.maxMembers && (
          <div className="roster-row empty-seat">
            <span className="roster-seat">+</span>
            <span className="roster-addr">{c.maxMembers - c.memberCount} seat{c.maxMembers - c.memberCount > 1 ? "s" : ""} open</span>
          </div>
        )}
      </div>

      <AgentLine circle={c} me={me} />

      <div className="card-actions">
        {status === "open" && !iAmMember && c.memberCount < c.maxMembers && (
          <button className="btn btn-primary btn-sm" disabled={busy === "join"} onClick={() => act("join", () => wallet.contract.join(c.id))}>
            {busy === "join" ? "…" : "Join circle"}
          </button>
        )}
        {status === "open" && iAmOrganizer && c.memberCount === c.maxMembers && (
          <button className="btn btn-indigo btn-sm" disabled={busy === "start"} onClick={() => act("start", () => wallet.contract.start(c.id))}>
            {busy === "start" ? "…" : "Start rotation"}
          </button>
        )}
        {status === "live" && iAmMember && (
          <button className="btn btn-primary btn-sm" disabled={busy === "pay"} onClick={() => act("pay", () => wallet.contract.contribute(c.id, { value: c.contribution }))}>
            {busy === "pay" ? "…" : `Contribute ${formatEther(c.contribution)} BOT`}
          </button>
        )}
        {status === "live" && roundFull && (
          <button className="btn btn-indigo btn-sm" disabled={busy === "pay2"} onClick={() => act("pay2", () => wallet.contract.disburse(c.id))}>
            {busy === "pay2" ? "…" : "Pay out this round"}
          </button>
        )}
        {status === "open" && iAmMember && !iAmOrganizer && (
          <span className="hint">You're in. Waiting for the organizer to start.</span>
        )}
        {status === "done" && <span className="hint">Every member has taken their hand. 🎉</span>}
      </div>
    </article>
  );
}

/* --------------------------------------------------------- AgentLine (AI) */
function AgentLine({ circle, me }) {
  const [text, setText] = useState("");
  useEffect(() => {
    let alive = true;
    askAgent(circle, me).then((t) => { if (alive) setText(t); });
    return () => { alive = false; };
  }, [circle.id, circle.currentRound, circle.funded, circle.started, me]);
  if (!text) return null;
  return (
    <div style={{ padding: "0 20px 4px" }}>
      <div className="agent" style={{ padding: 14 }}>
        <h4 style={{ fontSize: 15, margin: 0 }}><span className="halo" /> Ajo agent</h4>
        <div className="say" style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ utils */
function reason(e) {
  const m = e?.info?.error?.message || e?.shortMessage || e?.message || "Transaction failed";
  if (m.includes("AlreadyContributedThisRound")) return "You've already paid this round.";
  if (m.includes("RoundNotFunded")) return "Not everyone has paid yet.";
  if (m.includes("WrongContribution")) return "Contribution amount is off.";
  if (m.includes("user rejected")) return "You cancelled the transaction.";
  if (m.includes("insufficient funds")) return "Not enough BOT for gas + contribution.";
  return m.length > 90 ? m.slice(0, 90) + "…" : m;
}
