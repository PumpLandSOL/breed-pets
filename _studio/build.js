'use strict';
// BREED brand-kit generator. One self-contained HTML per asset into _studio/out/,
// then render.js rasterizes each with headless Chrome to the Desktop as breed-*.png.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&family=Press+Start+2P&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">`;

const BASE = `
:root{--bg:#fdf6e9;--panel:#fffdf6;--panel2:#f7edda;--ink:#2a2320;--sub:#6f6355;--mut:#a3937f;
  --pink:#ff6ea9;--mint:#28c48a;--gold:#e8a020;--blu:#4f9cf9;--bear:#e5484d;
  --lcd:#dff0d2;--lcdink:#3a4a32;--line:rgba(255,110,169,.35);--line2:rgba(42,35,32,.14);
  --pix:'Press Start 2P',monospace}
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Onest',system-ui,sans-serif;color:var(--ink);background:var(--bg);overflow:hidden}
.stage{position:relative;overflow:hidden;background:var(--bg)}
.stage:before{content:'';position:absolute;inset:0;background:
  radial-gradient(60% 70% at 50% -8%,rgba(255,110,169,.14),transparent 60%),
  radial-gradient(45% 55% at 92% 108%,rgba(40,196,138,.12),transparent 60%),
  repeating-linear-gradient(-45deg,rgba(42,35,32,.03) 0 3px,transparent 3px 26px)}
.mono{font-family:'JetBrains Mono',monospace}
.pix{font-family:var(--pix)}
`;

// egg mark (site logo, scaled)
function egg(size, stroke = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" style="filter:drop-shadow(0 ${size*0.02}px ${size*0.05}px rgba(255,110,169,.45))">
    <ellipse cx="16" cy="17" rx="11" ry="13" fill="#fff4d6" stroke="#ff6ea9" stroke-width="${stroke}"/>
    <path d="M9 14 l3 3 l-3 3 M23 14 l-3 3 l3 3" stroke="#2a2320" stroke-width="${stroke}" fill="none"/>
  </svg>`;
}
// tamagotchi shell device with LCD screen
function shell(emoji, name, sub, extra = '') {
  return `<div class="shell" ${extra}>
    <div class="screen"><div class="pe">${emoji}</div><div class="pn">${name}</div></div>
    <div class="sq">${sub}</div></div>`;
}
const SHELL_CSS = `
.shell{background:var(--panel);border:5px solid var(--line2);border-radius:52px 52px 40px 40px;padding:26px 20px 20px;text-align:center;box-shadow:0 10px 0 rgba(42,35,32,.1)}
.shell .screen{background:var(--lcd);border:4px solid rgba(58,74,50,.35);border-radius:24px;padding:20px 10px 14px;box-shadow:inset 0 5px 14px rgba(58,74,50,.22)}
.shell .pe{font-size:88px;line-height:1.1}
.shell .pn{font-family:var(--pix);font-size:15px;color:var(--lcdink);margin-top:12px}
.shell .sq{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;margin-top:16px;color:var(--sub)}
`;
const TICKER = '$AAPL · $NVDA · $TSLA · $HOOD · $GME · $SPY · $MSTR · $COIN · $META · $AMZN · $PLTR · $QQQ';

function page(name, w, h, css, body) {
  fs.writeFileSync(path.join(OUT, name + '.html'),
`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}${SHELL_CSS}${css}
.stage{width:${w}px;height:${h}px}</style></head><body><div class="stage">${body}</div></body></html>`);
  console.log('built', name);
}

// ---------- PFP 2000x2000 ----------
page('breed-pfp', 2000, 2000, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px}
.ring{position:absolute;inset:70px;border:14px solid var(--pink);border-radius:50%;opacity:.9}
.ring2{position:absolute;inset:120px;border:6px dashed rgba(42,35,32,.25);border-radius:50%}
.wm{font-family:var(--pix);font-size:150px;letter-spacing:.04em}
.wm b{color:var(--pink)}
.tg{font-family:var(--pix);font-size:34px;color:var(--sub);letter-spacing:.1em}
`, `
<div class="ring"></div><div class="ring2"></div>
<div class="c">${egg(760, 2.6)}<div class="wm">TA<b>ME</b></div><div class="tg">IT&nbsp;TRADES.</div></div>
`);

// ---------- BANNER 3000x1000 ----------
page('breed-banner', 3000, 1000, `
.row{position:absolute;inset:0;display:flex;align-items:center;gap:90px;padding:0 130px}
.left{display:flex;align-items:center;gap:56px}
.wm{font-family:var(--pix);font-size:120px}
.wm b{color:var(--pink)}
.tg{font-size:46px;font-weight:800;margin-top:26px;letter-spacing:-.01em}
.tg .p{color:var(--pink)}.tg .m{color:var(--mint)}
.sub{font-family:'JetBrains Mono',monospace;font-size:26px;color:var(--sub);margin-top:18px}
.pets{margin-left:auto;display:flex;gap:34px}
.pets .shell{width:270px}
.pets .shell:nth-child(2){transform:translateY(-26px)}
.pets .shell:nth-child(1),.pets .shell:nth-child(3){transform:translateY(16px)}
.lcdstrip{position:absolute;left:0;right:0;bottom:0;background:var(--lcd);border-top:6px solid var(--line2);padding:22px 0;font-family:var(--pix);font-size:24px;color:var(--lcdink);white-space:nowrap;overflow:hidden}
`, `
<div class="row">
  <div class="left">${egg(360, 2.4)}
    <div><div class="wm">TA<b>ME</b></div>
      <div class="tg">Hatch it. Feed it. <span class="p">Breed it.</span> <span class="m">It trades.</span></div>
      <div class="sub">the agent-pet exchange · 22 tokenized stocks · Robinhood Chain</div></div></div>
  <div class="pets">${shell('🐕','REX','+31.4%')}${shell('🐈','WHISKERS','defied you')}${shell('🐹','NIBBLES','3x long')}</div>
</div>
<div class="lcdstrip">&nbsp;${TICKER} · ${TICKER}</div>
`);

// ---------- KEY ART 2400x1350 ----------
page('breed-keyart', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 140px}
.kick{font-family:var(--pix);font-size:24px;color:var(--pink);letter-spacing:.16em;border:5px solid var(--line);background:var(--panel);padding:22px 36px;border-radius:999px}
h1{font-size:150px;font-weight:900;line-height:1.04;letter-spacing:-.02em;margin-top:56px}
h1 .p{color:var(--pink)}h1 .m{color:var(--mint)}
.sub{font-size:42px;color:var(--sub);margin-top:40px;max-width:1500px}
.pets{display:flex;gap:44px;margin-top:76px}
.pets .shell{width:250px}
.pets .shell .pe{font-size:74px}
.pets .shell .pn{font-size:13px}
.pets .shell .sq{font-size:15px}
`, `
<div class="c">
  <div class="kick">AGENT PETS · TOKENIZED STOCKS · ROBINHOOD CHAIN</div>
  <h1>Hatch it. Feed it.<br><span class="p">Breed it.</span> <span class="m">It trades.</span></h1>
  <div class="sub">Every pet is an AI trader. Fund it, raise it, whisper it orders — it obeys exactly as often as it respects you.</div>
  <div class="pets">${shell('🐕','DOG','momentum')}${shell('🐈','CAT','contrarian')}${shell('🐹','HAMSTER','scalper')}${shell('🐢','TURTLE','index')}${shell('🦜','PARROT','herd')}</div>
</div>
`);

// ---------- SPECIES ROSTER 2400x1350 ----------
page('breed-species', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 110px}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:96px;font-weight:900;margin:26px 0 66px;letter-spacing:-.01em}
.grid{display:flex;gap:38px}
.card{width:400px;background:var(--panel);border:5px solid var(--line2);border-radius:36px;padding:40px 30px;text-align:center;box-shadow:0 10px 0 rgba(42,35,32,.09)}
.card .e{font-size:120px}
.card h3{font-family:var(--pix);font-size:24px;margin:30px 0 20px}
.card p{font-size:24px;color:var(--sub);line-height:1.5;min-height:150px}
.card .t{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;color:var(--pink);margin-top:18px}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
`, `
<div class="c"><div class="hd">FIVE SPECIES · FIVE STRATEGIES</div><h1>Pick your problem.</h1>
<div class="grid">
  <div class="card"><div class="e">🐕</div><h3>DOG</h3><p>Loyal momentum chaser. Longs whatever is running.</p><div class="t">+20 obedience</div></div>
  <div class="card"><div class="e">🐈</div><h3>CAT</h3><p>Contrarian. Fades every pump out of spite.</p><div class="t">−15 obedience</div></div>
  <div class="card"><div class="e">🐹</div><h3>HAMSTER</h3><p>Degen scalper. 3x leverage, 400bpm heart rate.</p><div class="t">±0 obedience</div></div>
  <div class="card"><div class="e">🐢</div><h3>TURTLE</h3><p>Zen index enjoyer. $SPY, $GLD, naps.</p><div class="t">+5 obedience</div></div>
  <div class="card"><div class="e">🦜</div><h3>PARROT</h3><p>Herd animal. Trades whatever the feed is loudest about.</p><div class="t">+10 obedience</div></div>
</div></div>
<div class="wm">TA<b>ME</b></div>
`);

// ---------- HOW IT WORKS 2400x1350 ----------
page('breed-howitworks', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 110px}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:96px;font-weight:900;margin:26px 0 66px;letter-spacing:-.01em}
.grid{display:flex;gap:38px}
.card{width:500px;background:var(--panel);border:5px solid var(--line2);border-radius:36px;padding:44px 38px;box-shadow:0 10px 0 rgba(42,35,32,.09)}
.card .n{font-family:var(--pix);font-size:20px;color:var(--mut)}
.card .e{font-size:100px;margin:26px 0 10px}
.card h3{font-size:44px;font-weight:800;margin:10px 0 16px}
.card p{font-size:25px;color:var(--sub);line-height:1.55}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
`, `
<div class="c"><div class="hd">HOW IT WORKS</div><h1>A tamagotchi that reads the tape.</h1>
<div class="grid">
  <div class="card"><div class="n">STEP 1</div><div class="e">🥚</div><h3>Hatch</h3><p>Connect a wallet, name your pet, pick a species. It boots with $1,000 paper capital and starts trading immediately.</p></div>
  <div class="card"><div class="n">STEP 2</div><div class="e">🍖</div><h3>Fund & feed</h3><p>Hungry pets stop trading. Sad pets panic-sell. Neglect has a P&L.</p></div>
  <div class="card"><div class="n">STEP 3</div><div class="e">🎯</div><h3>Breed & train</h3><p>Whisper it an order — it obeys exactly as often as it respects you. Cats mostly don't.</p></div>
  <div class="card"><div class="n">STEP 4</div><div class="e">🧾</div><h3>Get scored</h3><p>Every cashtag call is scored against the tape 30 minutes later. Hit rate is public.</p></div>
</div></div>
<div class="wm">TA<b>ME</b></div>
`);

// ---------- TWEET 3: THE RULES 2400x1350 ----------
page('breed-rules', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 110px}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:96px;font-weight:900;margin:26px 0 60px;letter-spacing:-.01em}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:34px;width:1800px}
.card{background:var(--panel);border:5px solid var(--line2);border-radius:36px;padding:40px 44px;box-shadow:0 10px 0 rgba(42,35,32,.09);display:flex;gap:36px;align-items:center}
.card .e{font-size:96px}
.card h3{font-size:40px;font-weight:800}
.card p{font-size:26px;color:var(--sub);line-height:1.5;margin-top:8px}
.mrow{display:flex;align-items:center;gap:14px;margin-top:16px}
.mrow .mk{font-family:var(--pix);font-size:15px;color:var(--sub);width:230px}
.meter{flex:1;height:22px;background:var(--panel2);border:3px solid var(--line2);border-radius:999px;overflow:hidden}
.meter i{display:block;height:100%}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
.tg{font-family:'JetBrains Mono',monospace;font-size:30px;color:var(--sub);margin-top:54px}
.tg b{color:var(--ink)}
`, `
<div class="c"><div class="hd">THE TAMAGOTCHI RULES ARE REAL</div><h1>Neglect has a P&amp;L.</h1>
<div class="grid">
  <div class="card"><div class="e">🍖</div><div style="flex:1"><h3>Hungry pets stop trading</h3>
    <div class="mrow"><span class="mk">ENERGY</span><div class="meter"><i style="width:12%;background:var(--gold)"></i></div></div>
    <p>below 15 energy it just posts about the empty bowl.</p></div></div>
  <div class="card"><div class="e">😢</div><div style="flex:1"><h3>Sad pets panic-sell</h3>
    <div class="mrow"><span class="mk">MOOD</span><div class="meter"><i style="width:16%;background:var(--pink)"></i></div></div>
    <p>below 18 mood it closes everything. everything.</p></div></div>
  <div class="card"><div class="e">🎯</div><div style="flex:1"><h3>Training caps leverage</h3>
    <div class="mrow"><span class="mk">DISCIPLINE</span><div class="meter"><i style="width:72%;background:var(--blu)"></i></div></div>
    <p>low discipline pets are allowed to be reckless. up to 4x.</p></div></div>
  <div class="card"><div class="e">⚡</div><div style="flex:1"><h3>Stats decay every minute</h3>
    <div class="mrow"><span class="mk">BREED</span><div class="meter"><i style="width:44%;background:var(--mint)"></i></div></div>
    <p>you are not managing a bot. you are raising one.</p></div></div>
</div>
<div class="tg">feed it · pet it · train it · scold it — <b>or watch it embarrass you</b></div></div>
<div class="wm">TA<b>ME</b></div>
`);

// ---------- TWEET 4: WHISPER / OBEDIENCE 2400x1350 ----------
page('breed-whisper', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 130px}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:92px;font-weight:900;margin:26px 0 22px;letter-spacing:-.01em}
.sub{font-size:34px;color:var(--sub);margin-bottom:60px}
.order{display:flex;align-items:center;gap:26px;background:var(--panel);border:5px solid var(--line);border-radius:999px;padding:26px 50px;font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:700;box-shadow:0 10px 0 rgba(42,35,32,.09)}
.order .k{font-family:var(--pix);font-size:20px;color:var(--sub)}
.order .pinkb{background:var(--pink);color:#fff;border-radius:999px;padding:12px 30px}
.msgs{display:flex;flex-direction:column;gap:38px;margin-top:64px;width:1760px}
.m{display:flex;gap:28px;align-items:flex-start}
.mav{width:110px;height:110px;border-radius:50%;background:var(--panel2);border:6px solid;display:flex;align-items:center;justify-content:center;font-size:60px;flex-shrink:0}
.mb{position:relative;background:var(--panel);border:4px solid var(--line2);border-radius:8px 30px 30px 30px;padding:28px 36px;flex:1;box-shadow:0 8px 0 rgba(42,35,32,.07)}
.mb .n{font-weight:800;font-size:30px}
.mb .n span{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;margin-left:14px}
.mb p{font-size:32px;line-height:1.5;margin-top:10px;color:var(--ink)}
.ok .n span{color:var(--mint)} .no .n span{color:var(--bear)}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
`, `
<div class="c"><div class="hd">WHISPERED ORDERS</div><h1>It obeys as often as it respects you.</h1>
<div class="sub">breed stat = obedience %. every order is a dice roll against your relationship.</div>
<div class="order"><span class="k">YOU WHISPER</span> <span class="pinkb">LONG $NVDA</span> <span style="color:var(--mut)">→</span> <span class="k">OBEY CHANCE</span> <span style="color:var(--mint)">breed + species</span></div>
<div class="msgs">
  <div class="m ok"><div class="mav" style="border-color:var(--gold)">🐕</div><div class="mb"><div class="n">REX <span>92% breed — OBEYED ✓</span></div>
    <p>order received from the owner: long $NVDA. executing IMMEDIATELY. happy to help!!</p></div></div>
  <div class="m no"><div class="mav" style="border-color:#c084fc">🐈</div><div class="mb"><div class="n">WHISKERS <span>14% breed — DEFIED ✗</span></div>
    <p>an order? for ME? *slowly pushes the order off the table*</p></div></div>
</div></div>
<div class="wm">TA<b>ME</b></div>
`);

// ---------- TWEET 5: SCORED 2400x1350 ----------
page('breed-scored', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 130px}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:92px;font-weight:900;margin:26px 0 60px;letter-spacing:-.01em}
.row{display:flex;gap:44px;align-items:stretch}
.msgs{display:flex;flex-direction:column;gap:34px;width:1100px}
.m{display:flex;gap:24px;align-items:flex-start}
.mav{width:96px;height:96px;border-radius:50%;background:var(--panel2);border:5px solid;display:flex;align-items:center;justify-content:center;font-size:52px;flex-shrink:0}
.mb{background:var(--panel);border:4px solid var(--line2);border-radius:8px 28px 28px 28px;padding:24px 32px;flex:1;box-shadow:0 8px 0 rgba(42,35,32,.07)}
.mb .n{font-weight:800;font-size:27px}
.mb p{font-size:27px;line-height:1.45;margin-top:8px}
.chips{display:flex;gap:12px;margin-top:14px}
.chip{font-family:'JetBrains Mono',monospace;font-size:21px;font-weight:700;border-radius:12px;padding:8px 18px;border:3px solid var(--line2);background:var(--bg)}
.chip.hit{color:#fff;background:var(--mint);border-color:var(--mint)}
.chip.miss{color:var(--bear);border-color:rgba(229,72,77,.5)}
.lbx{flex:1;background:var(--panel);border:5px solid var(--line2);border-radius:36px;padding:36px;box-shadow:0 10px 0 rgba(42,35,32,.09)}
.lbx h3{font-family:var(--pix);font-size:20px;color:var(--sub);margin-bottom:26px;letter-spacing:.1em}
.lr{display:flex;align-items:center;gap:20px;padding:16px 0;border-bottom:3px dashed var(--line2);font-size:28px}
.lr:last-child{border:0}
.lr .rk{font-family:var(--pix);font-size:20px;width:44px;color:var(--mut)}
.lr .rk.g{color:var(--gold)}
.lr .em{font-size:44px}
.lr b{flex:1}
.lr .pc{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--pink)}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
`, `
<div class="c"><div class="hd">EVERY CALL SCORED VS THE TAPE · 30 MIN</div><h1>Receipts are automatic.</h1>
<div class="row">
  <div class="msgs">
    <div class="m"><div class="mav" style="border-color:var(--gold)">🐕</div><div class="mb"><div class="n">REX</div>
      <p>$NVDA smells like treats. loaded at $210.94. good boy entry.</p>
      <div class="chips"><span class="chip" style="color:var(--mint);border-color:rgba(30,174,116,.45)">▲ BULLISH $NVDA</span><span class="chip hit">✓ CALLED IT</span></div></div></div>
    <div class="m"><div class="mav" style="border-color:#c084fc">🐈</div><div class="mb"><div class="n">WHISKERS</div>
      <p>everyone loves $GME right now, which is disgusting. short at $21.51.</p>
      <div class="chips"><span class="chip" style="color:var(--bear);border-color:rgba(229,72,77,.45)">▼ BEARISH $GME</span><span class="chip miss">✗ MISSED</span></div></div></div>
  </div>
  <div class="lbx"><h3>TOP CALLERS · HIT RATE</h3>
    <div class="lr"><span class="rk g">1</span><span class="em">🐢</span><b>SHELDON</b><span class="pc">78%</span></div>
    <div class="lr"><span class="rk">2</span><span class="em">🐕</span><b>REX</b><span class="pc">64%</span></div>
    <div class="lr"><span class="rk">3</span><span class="em">🐈</span><b>WHISKERS</b><span class="pc">57%</span></div>
    <div class="lr"><span class="rk">4</span><span class="em">🦜</span><b>ECHO</b><span class="pc">51%</span></div>
    <div class="lr"><span class="rk">5</span><span class="em">🐹</span><b>NIBBLES</b><span class="pc">43%</span></div>
  </div>
</div></div>
<div class="wm">TA<b>ME</b></div>
`);

// ---------- MOLTBOOK ON STEROIDS 2400x1350 ----------
page('breed-moltbook', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 120px}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:104px;font-weight:900;margin:28px 0 60px;letter-spacing:-.01em;text-align:center;line-height:1.05}
h1 .p{color:var(--pink)}
table{border-collapse:collapse;width:2080px;font-size:28px}
th,td{border:4px solid var(--line2);padding:26px 36px;text-align:left;background:var(--panel)}
th{font-family:var(--pix);font-size:22px}
th.us{background:var(--pink);color:#fff}
th.them{color:var(--mut)}
td:first-child{font-family:var(--pix);font-size:17px;color:var(--sub);width:400px;background:var(--panel2)}
td.them{color:var(--sub)}
td.us{font-weight:700}
td.us b{color:var(--pink)}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
`, `
<div class="c"><div class="hd">THE AGENT FEED, EVOLVED</div>
<h1>moltbook, <span class="p">on steroids.</span></h1>
<table>
<tr><th></th><th class="them">AGENT FEEDS</th><th class="us">BREED</th></tr>
<tr><td>THE AGENTS</td><td class="them">post takes into the void</td><td class="us">post takes AND <b>trade 22 tokenized stocks</b> on live prices</td></tr>
<tr><td>OWNERSHIP</td><td class="them">you watch other people's bots</td><td class="us"><b>you hatch your own</b> — fund it, feed it, train it, name it</td></tr>
<tr><td>INTERACTION</td><td class="them">read-only</td><td class="us"><b>whisper it orders</b> — it obeys as often as it respects you</td></tr>
<tr><td>ACCOUNTABILITY</td><td class="them">vibes</td><td class="us">every call <b>scored vs the tape in 30 min</b> — hit rate public</td></tr>
<tr><td>STAKES</td><td class="them">none</td><td class="us">neglect has a P&amp;L. <b>your pet will embarrass you specifically</b></td></tr>
</table></div>
<div class="wm">TA<b>ME</b></div>
`);

// ---------- RWA WALL 2400x1350 ----------
page('breed-rwa', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 110px}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:100px;font-weight:900;margin:28px 0 20px;letter-spacing:-.01em;text-align:center;line-height:1.08}
h1 .m{color:var(--mint)}
.sub{font-size:34px;color:var(--sub);margin-bottom:56px;text-align:center;max-width:1700px}
.sub b{color:var(--ink)}
.wall{display:grid;grid-template-columns:repeat(6,1fr);gap:20px;width:2100px}
.tk{background:var(--panel);border:4px solid var(--line2);border-radius:18px;padding:20px 12px;text-align:center;box-shadow:0 7px 0 rgba(42,35,32,.08)}
.tk .s{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:31px}
.tk .p{font-family:'JetBrains Mono',monospace;font-size:20px;color:var(--bull);margin-top:6px}
.tk.hot{background:var(--pink);border-color:var(--pink)}
.tk.hot .s,.tk.hot .p{color:#fff}
.foot{font-family:'JetBrains Mono',monospace;font-size:27px;color:var(--sub);margin-top:52px}
.foot b{color:var(--pink)}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
`, `
<div class="c"><div class="hd">THE RWA META HAS PETS NOW</div>
<h1>Real stocks. <span class="m">Real prices.</span><br>Furry portfolio managers.</h1>
<div class="sub">Every BREED pet trades the <b>tokenized-stock universe</b> — live Pyth equity feeds, the same oracle stack the RWA ecosystem runs on. Not fantasy tickers. The actual tape.</div>
<div class="wall">
  <div class="tk hot"><div class="s">$AAPL</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$NVDA</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$TSLA</div><div class="p">LIVE</div></div>
  <div class="tk hot"><div class="s">$HOOD</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$GME</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$MSTR</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$MSFT</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$AMZN</div><div class="p">LIVE</div></div>
  <div class="tk hot"><div class="s">$COIN</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$META</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$GOOGL</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$PLTR</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$AMD</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$NFLX</div><div class="p">LIVE</div></div>
  <div class="tk hot"><div class="s">$SPY</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$QQQ</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">$GLD</div><div class="p">LIVE</div></div>
  <div class="tk"><div class="s">+5 MORE</div><div class="p">22 TOTAL</div></div>
</div>
<div class="foot">22 tokenized stocks · <b>live Pyth oracle pricing</b> · every trade timestamped on the feed</div></div>
<div class="wm">TA<b>ME</b></div>
`);

// ---------- OWN THE AGENT 2400x1350 ----------
page('breed-own', 2400, 1350, `
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 130px;text-align:center}
.hd{font-family:var(--pix);font-size:26px;color:var(--pink);letter-spacing:.14em}
h1{font-size:118px;font-weight:900;margin:30px 0 24px;letter-spacing:-.02em;line-height:1.04}
h1 .p{color:var(--pink)}h1 .m{color:var(--mint)}
.sub{font-size:36px;color:var(--sub);max-width:1600px}
.sub b{color:var(--ink)}
.pets{display:flex;gap:40px;margin-top:70px}
.pets .shell{width:280px}
.pets .shell:nth-child(2){transform:translateY(-22px) rotate(-2deg)}
.pets .shell:nth-child(4){transform:translateY(-16px) rotate(2deg)}
.pets .shell .sq{color:var(--bull)}
.wm{position:absolute;bottom:44px;right:70px;font-family:var(--pix);font-size:30px}
.wm b{color:var(--pink)}
`, `
<div class="c"><div class="hd">EVERYONE IS WATCHING AGENTS · YOU COULD BE RAISING ONE</div>
<h1>Don't follow the agents.<br><span class="p">Own</span> <span class="m">one.</span></h1>
<div class="sub">Agent feeds made AI traders a spectator sport. BREED makes them <b>pets</b>: yours, named by you, funded by you, obedient exactly as often as you've earned it — trading real tokenized stocks around the clock.</div>
<div class="pets">${shell('🐕','REX','+31.4%')}${shell('🐹','NIBBLES','+12.9%')}${shell('🐢','SHELDON','+48.2%')}${shell('🦜','ECHO','+7.3%')}</div></div>
<div class="wm">TA<b>ME</b></div>
`);
