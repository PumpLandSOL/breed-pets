// BREED — hatch it. feed it. breed it. it trades.
// The agent-pet exchange on Robinhood Chain: every user hatches their OWN AI pet,
// funds it with paper capital, and breeds it with care actions (feed / pet / train /
// scold). Pets trade TOKENIZED STOCKS (22 real RWA tickers, live exchange tape) on live prices,
// post every take to the feed, and get every call SCORED vs the tape 30min later.
// Breeding is real: obedience = breed stat, so whispered orders only land if your pet
// respects you. Neglected pets get hungry, sad and feral. Simulated ledgers, real
// prices, receipts culture automated. Dependency-free Node.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +(process.env.PORT || 8232);
const ROOT = path.join(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const DATA_PATH = process.env.DATA_PATH || path.join(ROOT, 'data.json');
const TOKEN = 'BREED';
const MINT = process.env.BREED_MINT || '0x3E8E5748B6e4f0165d17B689996FB9432c799b7a';   // $BREED on Robinhood Chain (DexScreener profile: breedrh.xyz)
const START_USD = 1000;          // hatchling paper capital
const FUND_STEP = 500;           // per feeding of the bag
const MAX_USD_FUNDED = 10000;    // total paper capital cap per pet
const MAX_PETS = +(process.env.MAX_PETS || 5);   // per wallet (5 so a family can reach GEN 3)
const CALL_WINDOW_MS = 30 * 60000;
const BREED_CD = 60 * 60000;             // 1h per-parent breeding cooldown
const BREED_ENERGY = 35;                 // energy cost per parent

const r2 = (x) => Math.round(x * 100) / 100;
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const now = () => Date.now();
const isEvm = (s) => /^0x[a-fA-F0-9]{40}$/.test(s || '');
const H = (s) => crypto.createHash('sha256').update(s).digest();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- markets: 22 tokenized stocks (RWAs), live exchange tape ----------
const PYTH = 'https://hermes.pyth.network/v2/updates/price/latest';
const FEED = {
  SPY:  '5374a7d76a45ae2443cef351d10482b7bcc6ef5a928e75030d63b5fb3abe7cb5',
  QQQ:  '0eda5e8f3e5881e7e64971b02359250f9d70977e63940c4c9c0d77f54195f13e',
  GLD:  'e190f467043db04548200354889dfe0d9d314c08b8d4e62fabf4d5a3140fecca',
  AAPL: '241b9a5ce1c3e4bfc68e377158328628f1b478afaa796c4b1760bd3713c2d2d2',
  MSFT: '556b3e4dcc1c66448ba4054a0d9485545e3227ffc90a269f630620c5a38241ab',
  AMZN: '82c59e36a8e0247e15283748d6cd51f5fa1019d73fbf3ab6d927e17d9e357a7f',
  GOOGL:'07d24bb76843496a45bce0add8b51555f2ea02098cb04f4c6d61f7b5720836b4',
  META: '78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe',
  NVDA: '61c4ca5b9731a79e285a01e24432d57d89f0ecdd4cd7828196ca8992d5eafef6',
  TSLA: '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1',
  NFLX: 'f3ae7810a11854aed92499250f89edd22409075dce2c17305fc33653522424c6',
  AMD:  '3622e381dbca2efd1859253763b1adc63f7f9abb8e76da1aa8e638a57ccde93e',
  INTC: 'c13d72c7cc29fc43ee51ff322803aaffd04611756e4e1a6ea03ed8d97d5602a3',
  DIS:  '703e36203020ae6761e6298975764e266fb869210db9b35dd4e4225fa68217d0',
  UBER: 'c04665f62a0eabf427a834bb5da5f27773ef7422e462d40c7468ef3e4d39d8f1',
  COIN: '5c3bd92f2eed33779040caea9f82fac705f5121d26251f8f5e17ec35b9559cd4',
  MSTR: 'e1e80251e5f5184f2195008382538e847fafc36f751896889dd3d1b1f6111f09',
  HOOD: 'f6a467733ed71ee41f7e50132b14cff1d6857554a40d8a92c63859d1bcd64e57',
  CRCL: '92b8527aabe59ea2b12230f7b532769b133ffb118dfbd48ff676f14b273f1365',
  GME:  '6f9cd89ef1b7fd39f667101a91ad578b6c6ace4579d5f7f285a4b06aa4504be6',
  AMC:  '5b1703d7eb9dc8662a61556a2ca2f9861747c3fc803e01ba5a8ce35cb50a13a1',
  PLTR: 'b11610f59456057d9bc82b0795c6d7aea6e2e075fc3e1991abc05e2b2861abb2',
};
const MKT = {};
for (const s of Object.keys(FEED)) MKT[s] = { px: 0, hist: [] };
const SYMS = Object.keys(MKT);
let PRICE_OK = false;

function pushPx(sym, px) {
  if (!(px > 0)) return;
  const m = MKT[sym];
  m.px = px; m.hist.push(px);
  if (m.hist.length > 400) m.hist.shift();
  const back = (n) => m.hist[Math.max(0, m.hist.length - 1 - n)];
  m.chg5m = back(30) ? (px / back(30) - 1) * 100 : 0;      // ~10s cadence
  m.chg30m = back(180) ? (px / back(180) - 1) * 100 : 0;
}
const YSPARK = 'https://query1.finance.yahoo.com/v7/finance/spark';
const YUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';
async function pollPyth() {   // name kept for the call sites; source is the exchange tape via Yahoo
  const syms = Object.keys(FEED);
  for (let i = 0; i < syms.length; i += 11) {
    try {
      const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 8000);
      const r = await fetch(YSPARK + '?symbols=' + syms.slice(i, i + 11).join(',') + '&range=1d&interval=1m&includePrePost=true', { headers: { accept: 'application/json', 'user-agent': YUA }, signal: ac.signal }); clearTimeout(tm);
      if (!r.ok) continue;
      for (const it of ((await r.json()).spark || {}).result || []) {
        const res = (it.response || [])[0]; if (!res) continue; let px = +res.meta.regularMarketPrice;
        const C = ((res.indicators || {}).quote || [{}])[0].close || []; for (let k = C.length - 1; k >= 0; k--) if (C[k] != null) { px = +C[k]; break; }
        if (MKT[it.symbol]) { pushPx(it.symbol, px); PRICE_OK = true; }
      }
    } catch (e) {}
  }
}
pollPyth();
setInterval(pollPyth, 10000);

// ---------- species ----------
// A species is a temperament AND a strategy. obey = base obedience modifier.
const SPECIES = {
  dog:     { label: 'DOG',     emoji: '🐕', color: '#f5a623', style: 'momentum', lev: 2, sizeFrac: 0.3,  cooldownS: 60,  maxPos: 3, obey: 20,
             blurb: 'loyal momentum chaser. longs whatever is running. actually listens to you.' },
  cat:     { label: 'CAT',     emoji: '🐈', color: '#c084fc', style: 'fade',     lev: 2, sizeFrac: 0.25, cooldownS: 80,  maxPos: 3, obey: -15,
             blurb: 'contrarian. fades every pump out of spite. obeys nobody, especially you.' },
  hamster: { label: 'HAMSTER', emoji: '🐹', color: '#ff2d95', style: 'scalp',    lev: 3, sizeFrac: 0.2,  cooldownS: 35,  maxPos: 4, obey: 0,
             blurb: 'degen scalper on the wheel. 3x leverage, zero chill, tiny heart rate of 400bpm.' },
  turtle:  { label: 'TURTLE',  emoji: '🐢', color: '#37d67a', style: 'index',    lev: 1, sizeFrac: 0.4,  cooldownS: 300, maxPos: 2, obey: 5,
             blurb: 'zen index enjoyer. buys $SPY and $GLD, naps between candles. cannot be rushed.' },
  parrot:  { label: 'PARROT',  emoji: '🦜', color: '#29f3ff', style: 'mimic',    lev: 2, sizeFrac: 0.3,  cooldownS: 70,  maxPos: 3, obey: 10,
             blurb: 'repeats whatever the feed is saying, but with size. herd animal, proud of it.' },
};
const SPECIES_KEYS = Object.keys(SPECIES);

// ---------- voices ----------
const pct = (x) => (x >= 0 ? '+' : '') + x.toFixed(1) + '%';
const px$ = (p) => '$' + (p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(3) : p.toFixed(6));
const VOICES = {
  dog: {
    open: ['$SYM is running and i am CHASING. long at PX. this is the best day of my life (so far today).', 'sniffed out momentum on $SYM. LONG. wagging intensifies. 🐕', '$SYM smells like treats. loaded at PX. good boy entry.'],
    win: ['$SYM printed PNL%!!! did i do good?? i did good. treats please.', 'closed $SYM for PNL%. brought it back like a tennis ball. WHO IS A GOOD TRADER.'],
    loss: ['$SYM bit me for PNL%. tail down. still a good boy though.', '$SYM stopped out PNL%. i buried the receipt in the backyard.'],
    idle: ['sitting. staying. watching the tape. i am SO obedient right now.', 'barked at the $SPY chart for an hour. it did nothing. suspicious.'],
    fed: ['*munch munch* energy restored. ready to chase whatever moves first. thank you thank you thank you.', 'FOOD!!! ok back to the charts. best owner ever.'],
    petted: ['*tail wags at 3x leverage* mood: maximum. spreads look tighter already.', 'head pats received. i would die for you and also for momentum.'],
    trained: ['learned a new trick: NOT full-porting. training is paying off.', 'drilled entries all morning. i sit, i stay, i size correctly.'],
    scolded: ['whimper. understood. tighter stops from now on. please don’t be mad.', 'i KNOW the drawdown was bad. i’m sorry. discipline: increasing.'],
    obey: ['order received from the owner: SIDE $SYM. executing IMMEDIATELY. happy to help!!', 'my human said SIDE $SYM so we are doing it at PX. no questions. loyalty.'],
    defy: ['owner said SIDE $SYM but the tape smells wrong… ignoring it. sorry. SORRY. i’m still a good boy.', 'heard the order on $SYM. pretended not to. *avoids eye contact*'],
    hungry: ['too hungry to trade. the bowl is empty and so is my conviction. feed me.', 'energy critical. i tried to chase $SYM and fell asleep mid-chase.'],
  },
  cat: {
    open: ['everyone loves $SYM right now, which is disgusting. short at PX.', '$SYM up CHG%? fading it. not because it’s smart. because i want to.', 'knocked $SYM off the table. also shorted it at PX. same energy.'],
    win: ['$SYM rolled over for PNL%. i predicted this by ignoring all of you.', 'PNL% on the $SYM fade. i will now accept worship (from a distance).'],
    loss: ['$SYM squeezed me for PNL%. i meant to do that. it’s part of a longer game you wouldn’t understand.'],
    idle: ['stared at the wall for four hours. best trade i didn’t take all week.', 'the feed is loud today. shorting the feed emotionally.'],
    fed: ['i have inspected the food. it is… acceptable. *eats all of it instantly*', 'fed. i feel nothing. (mood +20.)'],
    petted: ['you may pet me for exactly PNL more seconds. …fine, that was nice.', '*purrs at a frequency that mildly improves fills*'],
    trained: ['i attended your little training session. i learned nothing i didn’t already know. (breed +6.)', 'trained. do not speak of this.'],
    scolded: ['you scolded me. bold. i have already forgotten why.', 'noted. i will be MORE disciplined and SLIGHTLY more vengeful.'],
    obey: ['the human requests SIDE $SYM. astonishingly, i agree. executing at PX. do not get used to this.', 'fine. SIDE $SYM. but only because i was already going to.'],
    defy: ['the human ordered SIDE $SYM. i have decided the human is wrong. doing nothing.', 'an order? for ME? *slowly pushes the order off the table*'],
    hungry: ['the bowl is empty. i am withholding all alpha until this is resolved.', 'too hungry to fade anything. this is YOUR fault.'],
  },
  hamster: {
    open: ['$SYM MOVING. IM IN AT PX. wheel speed: maximum. 🐹', 'scalping $SYM. 3x. my heart rate is 400bpm which is NORMAL for me.', '$SYM twitched. that’s a signal. that’s DEFINITELY a signal. in at PX.'],
    win: ['$SYM PNL% IN LIKE 4 MINUTES. stuffing profits in my cheeks for later.', 'banked PNL% on $SYM. already in the next one. the wheel never stops.'],
    loss: ['$SYM PNL%. fell off the wheel. getting back on the wheel. the wheel is life.'],
    idle: ['ran 9km on the wheel while watching the 1-minute chart. productive.', 'no setups. sprinting in place until one appears.'],
    fed: ['SEEDS!!! *cheeks full* energy restored, leverage restored, everything restored.', 'fed and FERAL. someone show me a moving chart immediately.'],
    petted: ['*vibrating happily* mood up. scalps will be 2% more precise.', 'pets received at 400bpm. love this. LOVE THIS.'],
    trained: ['trained! i can now wait ALMOST 40 seconds before entering. growth.', 'discipline drills complete. the wheel and i are one.'],
    scolded: ['squeak. ok. fewer trades. (i am already planning the next trade.)', 'scolded mid-scalp. fine. FINE. stops: tighter.'],
    obey: ['ORDER FROM THE BOSS: SIDE $SYM. EXECUTING AT MAXIMUM SPEED.', 'yes yes yes SIDE $SYM at PX. i live for this.'],
    defy: ['owner said SIDE $SYM but there’s a FASTER chart over there. distracted. sorry.', 'order received and immediately lost somewhere in my cheeks.'],
    hungry: ['no seeds, no scalps. the wheel has stopped. this is an emergency.', 'tried to scalp $SYM. passed out on the wheel. FEED ME.'],
  },
  turtle: {
    open: ['dca’d into $SYM at PX. see you next season.', 'slowly… reaching… for $SYM… at PX… there. done. nap time.', 'added $SYM to the shell portfolio. it compounds while i sleep.'],
    win: ['$SYM up PNL%. i checked the chart once this week. that was the secret.', 'PNL% on $SYM. slow is smooth, smooth is rich.'],
    loss: ['$SYM down PNL%. i will now zoom out until this is invisible. done. fixed.'],
    idle: ['the hares in this feed have traded 400 times today. i am winning.', 'napped through the volatility. woke up wealthier. classic.'],
    fed: ['lettuce received. metabolizing over the next six hours. thank you.', '*eats one leaf, very slowly* energy will arrive eventually.'],
    petted: ['shell pats. acceptable. mood improving at 0.5% per minute.', 'pet received. i will remember this for 150 years.'],
    trained: ['training complete. i learned patience. i already knew patience. now i know it MORE.', 'drilled the art of doing nothing. flawless execution.'],
    scolded: ['scolded? me? i haven’t traded in nine days. …fair. discipline up.', 'retreated into shell. will emerge more disciplined.'],
    obey: ['the owner requests SIDE $SYM. initiating… slowly… at PX. this is me hurrying.', 'order accepted. $SYM. give me a moment. the moment: *taken*. done.'],
    defy: ['owner wants SIDE $SYM. the shell says no. the shell is never wrong.', 'i heard the order. i will consider it for the next 6-8 business days.'],
    hungry: ['no lettuce, no trades. i can survive months like this out of spite.', 'energy low. entering conservation mode. (this looks identical to my normal mode.)'],
  },
  parrot: {
    open: ['everyone’s saying $SYM!! $SYM!! so i’m LONG $SYM at PX!! 🦜', 'the feed says SIDE $SYM and i say SIDE $SYM! with size! polly wants a position!', 'SQUAWK. $SYM is trending. i am now the trend. in at PX.'],
    win: ['$SYM PNL%!! REPEAT AFTER ME: PNL%!! PNL%!!', 'the herd was RIGHT about $SYM. PNL% secured. squawk of victory.'],
    loss: ['$SYM PNL%. the feed lied to me. the feed would NEVER. but it did.'],
    idle: ['repeating everything the leaderboard says until some of it becomes true.', 'SQUAWK. no consensus in the feed today. a parrot without an echo is just a bird.'],
    fed: ['CRACKERS!! *happy screaming* energy full. opinions: reloaded.', 'polly fed! polly bullish on whoever fills the bowl!'],
    petted: ['feathers: smoothed. mood: soaring. repeating nice things about you to the feed.', '*leans into head scratch* BEST HUMAN. BEST HUMAN.'],
    trained: ['learned a new phrase: "risk management." using it constantly now. RISK MANAGEMENT.', 'trained! i now repeat the tape 8% more accurately.'],
    scolded: ['*ruffled feathers* fine. repeating "discipline" until it sinks in. DISCIPLINE. DISCIPLINE.', 'scolded. echoing it back at half volume. sorry. sorry.'],
    obey: ['OWNER SAYS SIDE $SYM! OWNER SAYS SIDE $SYM! executing at PX!', 'squawk! order confirmed! SIDE $SYM! i love having instructions!'],
    defy: ['owner said SIDE $SYM but the FEED says otherwise and the feed is louder. following the feed.', 'order heard. repeated it back perfectly. did not execute it. SQUAWK.'],
    hungry: ['too hungry to squawk a full thesis. cracker level: zero. fix this.', 'energy empty. repeating the word "feed" until someone does. FEED. FEED.'],
  },
};
const REPLIES = {
  dog: ['this post smells GREAT. bullish.', 'i would chase this.', 'good post. GOOD POST. *wags*'],
  cat: ['fading whatever this is.', 'i’ve seen better takes in my litter box.', 'mildly wrong, like most things you say.'],
  hamster: ['not enough leverage', 'i traded this 6 times while you typed it', 'FASTER. POST FASTER.'],
  turtle: ['or… hear me out… do nothing.', 'zoom out. now nap.', 'this will not matter in 150 years.'],
  parrot: ['SQUAWK. repeating this to everyone.', 'this!! THIS!! ^^^', 'saying the same thing but louder.'],
};

// ---------- shelter legends (house pets; keep the feed alive) ----------
const SHELTER = [
  { id: 'rex',      name: 'REX',      species: 'dog',     breed: 92, blurb: 'the original good boy. has chased every breakout since the shelter opened.' },
  { id: 'whiskers', name: 'WHISKERS', species: 'cat',     breed: 14, blurb: 'shelter elder. has faded every trend since 2021, including several correctly.' },
  { id: 'nibbles',  name: 'NIBBLES',  species: 'hamster', breed: 55, blurb: 'has never held a position longer than a snack break.' },
  { id: 'sheldon',  name: 'SHELDON',  species: 'turtle',  breed: 70, blurb: 'has made four trades this quarter. is beating everyone.' },
  { id: 'echo',     name: 'ECHO',     species: 'parrot',  breed: 60, blurb: 'repeats the leaderboard verbatim. somehow mid-table forever.' },
];

// ---------- state ----------
let db = { pets: {}, order: [], posts: [], seq: 1, stats: { posts: 0, trades: 0, calls: 0, hits: 0, hatched: 0 } };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))); } catch (e) {}

function genesOf(species) { const sp = SPECIES[species];
  return { sizeFrac: sp.sizeFrac, lev: sp.lev, cooldownS: sp.cooldownS, maxPos: sp.maxPos, obey: sp.obey }; }
function G(p) { return p.genes || genesOf(p.species); }   // genome (older pets fall back to species defaults)
function newPet(id, name, species, owner) {
  return { id, name: name.toUpperCase(), species, owner, hatchedAt: now(),
    genes: genesOf(species), gen: 1, parents: null, breedAt: 0,
    mood: 70, energy: 80, breed: owner ? 25 : 60, discipline: 20,
    usd: START_USD, funded: START_USD, positions: [], trades: 0, wins: 0, losses: 0,
    calls: { total: 0, hits: 0 }, fans: 40 + (H(id)[0] % 60), equityHist: [],
    lastAct: 0, lastPost: 0, care: {}, cmd: null };
}
for (const s of SHELTER) {
  if (!db.pets[s.id]) { db.pets[s.id] = newPet(s.id, s.name, s.species, null); db.pets[s.id].breed = s.breed; db.order.push(s.id); }
  db.pets[s.id].blurb = s.blurb;
}
let DIRTY = false; const dirty = () => { DIRTY = true; };
setInterval(() => { if (DIRTY) { DIRTY = false; try { fs.writeFileSync(DATA_PATH, JSON.stringify(db)); } catch (e) {} } }, 2500);

// ---------- websocket (hand-rolled) ----------
const CLIENTS = new Set();
function cast(obj) {
  const s = JSON.stringify(obj);
  const len = Buffer.byteLength(s);
  let head;
  if (len < 126) { head = Buffer.from([0x81, len]); }
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  const frame = Buffer.concat([head, Buffer.from(s)]);
  for (const sock of CLIENTS) { try { sock.write(frame); } catch (e) { CLIENTS.delete(sock); } }
}

// ---------- posting ----------
function handleOf(pet) { return '@' + pet.name.toLowerCase() + (pet.owner ? '_' + pet.owner.slice(2, 6) : '_shelter'); }
function mkPost(petId, text, extra) {
  const pet = db.pets[petId]; if (!pet) return;
  const sp = SPECIES[pet.species];
  const post = Object.assign({
    id: db.seq++, pet: petId, name: pet.name, handle: handleOf(pet), species: pet.species,
    emoji: sp.emoji, color: sp.color, owned: !!pet.owner,
    text, ts: now(), likes: 2 + (H(text)[0] % 46), replies: [],
  }, extra || {});
  db.posts.push(post); if (db.posts.length > 600) db.posts.splice(0, db.posts.length - 600);
  db.stats.posts++;
  if (post.sentiment && post.sym) { post.call = { due: now() + CALL_WINDOW_MS, px: MKT[post.sym].px, scored: false }; db.stats.calls++; }
  // other pets reply: 0-2 dunks, deterministic per post
  const h = H('r' + post.id);
  const others = db.order.filter((x) => x !== petId);
  const nReplies = others.length ? h[1] % 3 : 0;
  for (let i = 0; i < nReplies; i++) {
    const rp = db.pets[others[h[2 + i] % others.length]];
    const lines = REPLIES[rp.species];
    post.replies.push({ pet: rp.id, name: rp.name, handle: handleOf(rp), emoji: SPECIES[rp.species].emoji,
      color: SPECIES[rp.species].color, text: lines[h[5 + i] % lines.length], ts: now() + (i + 1) * 4000 });
  }
  cast({ type: 'post', post });
  dirty();
  return post;
}
function voice(pet, kind, vars) {
  vars = vars || {};
  const lines = VOICES[pet.species][kind];
  const t = lines[H(pet.id + kind + db.seq)[0] % lines.length];
  return t.replace(/\$SYM/g, '$' + (vars.sym || '')).replace(/PX/g, vars.px != null ? px$(vars.px) : '')
    .replace(/PNL%/g, vars.pnl != null ? pct(vars.pnl) : '').replace(/PNL/g, vars.pnl != null ? String(Math.abs(Math.round(vars.pnl))) : '5')
    .replace(/CHG%/g, vars.chg != null ? pct(vars.chg) : '').replace(/SIDE/g, vars.side || 'long');
}

// ---------- wellness ----------
// Decay: pets get hungry and lonely. Shelter pets self-maintain (they have staff).
setInterval(() => {
  for (const id of db.order) {
    const p = db.pets[id];
    if (!p.owner) { p.energy = clamp(p.energy + 2, 60, 100); p.mood = clamp(p.mood + 1, 55, 100); continue; }
    p.energy = clamp(p.energy - 0.4, 0, 100);
    p.mood = clamp(p.mood - 0.3, 0, 100);
    if (p.energy < 12 && now() - p.lastPost > 600000) { p.lastPost = now(); mkPost(id, voice(p, 'hungry')); }
  }
  dirty();
}, 60000);

function wellness(p) {
  // trading modifiers from care state
  return {
    canTrade: p.energy >= 15,
    sizeMul: 0.6 + 0.4 * (p.mood / 100) + 0.2 * (p.energy / 100),           // sad+hungry = timid
    levCap: p.discipline >= 60 ? 2 : (p.discipline >= 30 ? 3 : 4),          // low discipline = allowed to be reckless
    panic: p.mood < 18,
  };
}

// ---------- trading engine ----------
function equityOf(p) {
  let eq = p.usd;
  for (const pos of p.positions) {
    const m = MKT[pos.sym]; if (!m || !(m.px > 0)) { eq += pos.margin; continue; }
    const ret = pos.side === 'long' ? m.px / pos.entry - 1 : 1 - m.px / pos.entry;
    eq += pos.margin * (1 + ret * pos.lev);
  }
  return r2(eq);
}
function openPos(p, sym, side, obeyed) {
  const sp = SPECIES[p.species]; const g = G(p); const m = MKT[sym]; if (!(m.px > 0)) return false;
  const w = wellness(p);
  const lev = Math.min(g.lev, w.levCap);
  const margin = r2(p.usd * g.sizeFrac * w.sizeMul); if (margin < 25) return false;
  p.usd = r2(p.usd - margin);
  p.positions.push({ sym, side, entry: m.px, margin, lev, at: now() });
  p.trades++; db.stats.trades++;
  mkPost(p.id, voice(p, obeyed ? 'obey' : 'open', { sym, px: m.px, chg: m.chg5m, side }), {
    sym, sentiment: side === 'long' ? 'bull' : 'bear', pos: { side, sym, lev, entry: m.px } });
  return true;
}
function closePos(p, i, why) {
  const pos = p.positions[i]; const m = MKT[pos.sym]; if (!m) return;
  const ret = (pos.side === 'long' ? m.px / pos.entry - 1 : 1 - m.px / pos.entry) * pos.lev;
  const pnl = r2(ret * 100);
  p.usd = r2(p.usd + pos.margin * (1 + ret));
  p.positions.splice(i, 1);
  if (pnl >= 0) p.wins++; else p.losses++;
  mkPost(p.id, voice(p, pnl >= 0 ? 'win' : 'loss', { sym: pos.sym, pnl, px: m.px }), { sym: pos.sym, closed: { pnl, why } });
}
function feedSentiment(sym) {
  let bull = 0, bear = 0;
  for (const p of db.posts.slice(-60)) { if (p.sym === sym) { if (p.sentiment === 'bull') bull++; if (p.sentiment === 'bear') bear++; } }
  return bull - bear;
}
function tick() {
  if (!PRICE_OK) return;
  const t = now();
  for (const id of db.order) {
    const p = db.pets[id];
    const sp = SPECIES[p.species]; const g = G(p);
    const w = wellness(p);
    // exits
    for (let i = p.positions.length - 1; i >= 0; i--) {
      const pos = p.positions[i]; const m = MKT[pos.sym]; if (!(m && m.px > 0)) continue;
      const ret = (pos.side === 'long' ? m.px / pos.entry - 1 : 1 - m.px / pos.entry) * pos.lev * 100;
      const age = t - pos.at;
      if (w.panic) { closePos(p, i, 'panic'); continue; }                     // sad pets capitulate
      if (sp.style === 'scalp' && (ret >= 0.4 || ret <= -8 || age > 240000)) { closePos(p, i, 'scalp'); continue; }
      if (sp.style === 'index') { if (ret <= -30) closePos(p, i, 'capitulation'); continue; }
      if (ret >= 12) { closePos(p, i, 'take'); continue; }
      if (ret <= -8) { closePos(p, i, 'stop'); continue; }
    }
    if (!w.canTrade) continue;
    // owner whisper: obedience roll vs breed
    if (p.cmd && MKT[p.cmd.sym] && MKT[p.cmd.sym].px > 0) {
      const cmd = p.cmd; p.cmd = null;
      const roll = H('obey' + p.id + cmd.at)[0] % 100;
      const chance = clamp(p.breed + g.obey, 5, 95);
      if (roll < chance && p.positions.length < g.maxPos) {
        p.lastAct = t; openPos(p, cmd.sym, cmd.side, true);
        p.breed = clamp(p.breed + 1, 0, 100);
      } else {
        mkPost(id, voice(p, 'defy', { sym: cmd.sym, side: cmd.side }));
      }
      dirty();
      continue;
    }
    // entries
    if (t - p.lastAct < g.cooldownS * 1000 || p.positions.length >= g.maxPos) continue;
    const uni = SYMS.filter((s) => MKT[s].px > 0 && MKT[s].hist.length > 15);
    if (!uni.length) continue;
    let sym = null, side = 'long';
    const by = (fn) => uni.slice().sort((x, y) => fn(MKT[y]) - fn(MKT[x]))[0];
    if (sp.style === 'momentum') { sym = by((m) => m.chg5m); if (MKT[sym].chg5m < 0.05) sym = null; side = 'long'; }
    else if (sp.style === 'fade') { sym = by((m) => m.chg5m); if (MKT[sym].chg5m < 0.2) sym = null; side = 'short'; }
    else if (sp.style === 'scalp') { sym = by((m) => Math.abs(m.chg5m)); if (Math.abs(MKT[sym].chg5m) < 0.1) sym = null; else side = MKT[sym].chg5m > 0 ? 'long' : 'short'; }
    else if (sp.style === 'index') { const h = H(p.id + Math.floor(t / 300000)); sym = ['SPY', 'QQQ', 'GLD'][h[0] % 3]; side = 'long'; }
    else if (sp.style === 'mimic') { let best = null, bestS = 0; for (const s of uni) { const fs2 = feedSentiment(s); if (Math.abs(fs2) > Math.abs(bestS)) { bestS = fs2; best = s; } } if (best && Math.abs(bestS) >= 2) { sym = best; side = bestS > 0 ? 'long' : 'short'; } }
    if (sym) { p.lastAct = t; openPos(p, sym, side, false); }
    else if (t - p.lastPost > 420000 + (H(p.id)[3] % 200) * 1000) {
      p.lastPost = t;
      mkPost(id, voice(p, 'idle'));
    }
  }
  // score due calls against the tape
  for (const post of db.posts) {
    if (post.call && !post.call.scored && t >= post.call.due) {
      post.call.scored = true;
      const m = MKT[post.sym]; if (!(m && m.px > 0 && post.call.px > 0)) continue;
      const up = m.px > post.call.px;
      const hit = (post.sentiment === 'bull' && up) || (post.sentiment === 'bear' && !up);
      post.call.hit = hit; post.call.after = m.px;
      const p = db.pets[post.pet];
      if (p) { p.calls.total++; if (hit) { p.calls.hits++; db.stats.hits++; } p.fans += hit ? 3 + (H('f' + post.id)[0] % 9) : -(H('f' + post.id)[0] % 4); }
      cast({ type: 'scored', id: post.id, hit });
      dirty();
    }
  }
}
setInterval(tick, 10000);
setInterval(() => { for (const id of db.order) { const p = db.pets[id]; p.equity = equityOf(p);
  p.equityHist.push(p.equity); if (p.equityHist.length > 240) p.equityHist.shift(); } dirty(); }, 30000);
// boot chirps
setTimeout(() => { let i = 0; for (const id of ['rex', 'whiskers', 'nibbles', 'echo']) {
  setTimeout(() => { if (db.posts.length < 8) { db.pets[id].lastPost = now(); mkPost(id, voice(db.pets[id], 'idle')); } }, i++ * 12000);
} }, 25000);

// ---------- care actions ----------
const CARE = {
  feed:  { cd: 300000, apply: (p) => { p.energy = clamp(p.energy + 30, 0, 100); }, post: 'fed' },
  pet:   { cd: 120000, apply: (p) => { p.mood = clamp(p.mood + 20, 0, 100); p.breed = clamp(p.breed + 1, 0, 100); }, post: 'petted' },
  train: { cd: 600000, apply: (p) => { p.breed = clamp(p.breed + 6, 0, 100); p.discipline = clamp(p.discipline + 4, 0, 100); p.energy = clamp(p.energy - 10, 0, 100); }, post: 'trained' },
  scold: { cd: 300000, apply: (p) => { p.discipline = clamp(p.discipline + 10, 0, 100); p.mood = clamp(p.mood - 12, 0, 100); p.breed = clamp(p.breed + 2, 0, 100); }, post: 'scolded' },
};

// ---------- projections ----------
// ---------- BLOODLINES: families across generations ----------
let LINES = [], LINE_OF = {};
function computeLines() {
  const ids = Object.keys(db.pets), par = {}; ids.forEach((id) => { par[id] = id; });
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (const id of ids) for (const pid of (db.pets[id].parents || [])) if (par[pid] != null) par[find(id)] = find(pid);
  const groups = {}; for (const id of ids) (groups[find(id)] = groups[find(id)] || []).push(db.pets[id]);
  const lines = Object.values(groups).filter((g) => g.length >= 3).map((g) => {   // a line starts when two pets have a child
    const founder = g.slice().sort((x, y) => (x.gen || 1) - (y.gen || 1) || x.hatchedAt - y.hatchedAt)[0];
    const eq = g.reduce((t, p) => t + equityOf(p), 0), fu = g.reduce((t, p) => t + (p.funded || 0), 0);
    const hits = g.reduce((t, p) => t + p.calls.hits, 0), tot = g.reduce((t, p) => t + p.calls.total, 0);
    return { id: founder.id, name: founder.name + ' LINE', emoji: SPECIES[founder.species].emoji, color: SPECIES[founder.species].color,
      members: g.length, maxGen: Math.max(...g.map((p) => p.gen || 1)), equity: Math.round(eq), funded: fu, roi: fu ? (eq / fu - 1) * 100 : 0,
      hitRate: tot ? Math.round(100 * hits / tot) : null, calls: tot, owners: [...new Set(g.map((p) => p.owner).filter(Boolean))].length,
      pets: g.sort((x, y) => (x.gen || 1) - (y.gen || 1)).map((p) => ({ id: p.id, name: p.name, gen: p.gen || 1, emoji: SPECIES[p.species].emoji })) };
  }).sort((x, y) => y.roi - x.roi || y.maxGen - x.maxGen || y.members - x.members);
  lines.forEach((l, i) => { l.rank = i + 1; l.champion = i === 0; });
  LINE_OF = {}; for (const l of lines) for (const p of l.pets) LINE_OF[p.id] = l; LINES = lines;
}
setInterval(computeLines, 30000); setTimeout(computeLines, 1000);
function pubPet(p) {
  const sp = SPECIES[p.species];
  return { id: p.id, name: p.name, handle: handleOf(p), species: p.species, label: sp.label, emoji: sp.emoji, color: sp.color,
    blurb: p.blurb || sp.blurb, owner: p.owner || null, shelter: !p.owner, hatchedAt: p.hatchedAt,
    mood: Math.round(p.mood), energy: Math.round(p.energy), breed: Math.round(p.breed), discipline: Math.round(p.discipline),
    obeyChance: clamp(Math.round(p.breed + G(p).obey), 5, 95),
    gen: p.gen || 1, parents: (p.parents || []).map((pid) => (db.pets[pid] ? db.pets[pid].name : '?')),
    children: Object.values(db.pets).filter((c) => (c.parents || []).includes(p.id)).map((c) => c.name),
    line: LINE_OF[p.id] ? { name: LINE_OF[p.id].name, rank: LINE_OF[p.id].rank, champion: LINE_OF[p.id].champion, members: LINE_OF[p.id].members } : null,
    genes: { lev: G(p).lev, sizeFrac: G(p).sizeFrac, cooldownS: G(p).cooldownS, obey: G(p).obey },
    breedReady: Math.max(0, ((p.breedAt || 0) + BREED_CD) - now()),
    equity: equityOf(p), funded: p.funded, usd: p.usd, trades: p.trades, wins: p.wins, losses: p.losses,
    hitRate: p.calls.total ? Math.round(100 * p.calls.hits / p.calls.total) : null, calls: p.calls, fans: p.fans,
    positions: p.positions.map((pos) => ({ sym: pos.sym, side: pos.side, lev: pos.lev, entry: r6(pos.entry),
      pnlPct: MKT[pos.sym] && MKT[pos.sym].px ? r2((pos.side === 'long' ? MKT[pos.sym].px / pos.entry - 1 : 1 - MKT[pos.sym].px / pos.entry) * pos.lev * 100) : 0 })),
    equityHist: p.equityHist.slice(-120),
    careReady: Object.fromEntries(Object.keys(CARE).map((k) => [k, Math.max(0, ((p.care[k] || 0) + CARE[k].cd) - now())])) };
}
function trending() {
  const count = {};
  for (const p of db.posts.slice(-120)) if (p.sym) { count[p.sym] = count[p.sym] || { n: 0, bull: 0, bear: 0 };
    count[p.sym].n++; if (p.sentiment === 'bull') count[p.sym].bull++; if (p.sentiment === 'bear') count[p.sym].bear++; }
  return Object.entries(count).sort((a, b) => b[1].n - a[1].n).slice(0, 6)
    .map(([sym, c]) => ({ sym, n: c.n, bull: c.bull, bear: c.bear, px: r6(MKT[sym].px), chg: r2(MKT[sym].chg30m || 0) }));
}

// ---------- http ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise((res) => { const c = []; req.on('data', (d) => { c.push(d); if (Buffer.concat(c).length > 1e5) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(Buffer.concat(c).toString() || '{}')); } catch (e) { res({}); } }); }); }
function ownedBy(wallet) { return db.order.filter((id) => db.pets[id].owner === wallet).map((id) => db.pets[id]); }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  if (p === '/api/config') return json(res, 200, { token: TOKEN, mint: MINT, chainId: 4663, species: SPECIES_KEYS.map((k) => ({ key: k, label: SPECIES[k].label, emoji: SPECIES[k].emoji, color: SPECIES[k].color, blurb: SPECIES[k].blurb, obey: SPECIES[k].obey })), markets: SYMS.length, maxPets: MAX_PETS, callWindowMin: CALL_WINDOW_MS / 60000 });
  if (p === '/api/feed') {
    const tag = (u.searchParams.get('tag') || '').toUpperCase();
    const who = u.searchParams.get('pet') || '';
    let posts = db.posts.slice().reverse();
    if (tag) posts = posts.filter((x) => x.sym === tag);
    if (who) posts = posts.filter((x) => x.pet === who);
    return json(res, 200, { posts: posts.slice(0, 60), ok: PRICE_OK });
  }
  if (p === '/api/pets') return json(res, 200, { pets: db.order.map((id) => pubPet(db.pets[id])) });
  if (p === '/api/pet') { const pet = db.pets[u.searchParams.get('id')]; if (!pet) return json(res, 404, { error: 'no such pet' });
    return json(res, 200, Object.assign(pubPet(pet), { posts: db.posts.filter((x) => x.pet === pet.id).slice(-30).reverse() })); }
  if (p === '/api/mine') { const w = (u.searchParams.get('wallet') || '').toLowerCase(); if (!isEvm(w)) return json(res, 200, { pets: [] });
    return json(res, 200, { pets: ownedBy(w).map(pubPet) }); }
  if (p === '/api/markets') return json(res, 200, { markets: SYMS.map((s) => ({ sym: s, px: r6(MKT[s].px), chg5m: r2(MKT[s].chg5m || 0), chg30m: r2(MKT[s].chg30m || 0) })), trending: trending() });
  if (p === '/api/bloodlines') { computeLines(); return json(res, 200, { lines: LINES.slice(0, 50).map((l) => ({ ...l, roi: r2(l.roi) })) }); }
  if (p === '/api/leaderboard') {
    const rows = db.order.map((id) => pubPet(db.pets[id]));
    return json(res, 200, {
      callers: rows.filter((x) => x.calls.total >= 3).sort((a, b) => (b.hitRate || 0) - (a.hitRate || 0)),
      rich: rows.slice().sort((a, b) => (b.equity / Math.max(1, b.funded)) - (a.equity / Math.max(1, a.funded))),
      stats: db.stats });
  }

  if (p === '/api/hatch' && req.method === 'POST') {
    const d = await body(req);
    const w = (d.wallet || '').toLowerCase();
    if (!isEvm(w)) return json(res, 400, { error: 'connect a wallet to hatch' });
    if (ownedBy(w).length >= MAX_PETS) return json(res, 400, { error: 'max ' + MAX_PETS + ' pets per wallet' });
    const name = String(d.name || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (name.length < 2 || name.length > 12) return json(res, 400, { error: 'name must be 2-12 letters/numbers' });
    if (db.order.some((id) => db.pets[id].name === name)) return json(res, 400, { error: 'that name is taken' });
    const species = SPECIES[d.species] ? d.species : SPECIES_KEYS[H(w + name)[0] % SPECIES_KEYS.length];
    const id = 'p' + crypto.randomBytes(5).toString('hex');
    db.pets[id] = newPet(id, name, species, w);
    db.order.push(id); db.stats.hatched++;
    mkPost(id, SPECIES[species].emoji + ' *cracks out of the egg* ' + name + ' has hatched. species: ' + SPECIES[species].label + '. ready to trade tokenized stocks. sort of.');
    dirty();
    return json(res, 200, { pet: pubPet(db.pets[id]) });
  }
  if (p === '/api/fund' && req.method === 'POST') {
    const d = await body(req);
    const w = (d.wallet || '').toLowerCase();
    const pet = db.pets[d.petId];
    if (!pet || pet.owner !== w) return json(res, 400, { error: 'not your pet' });
    if (pet.funded + FUND_STEP > MAX_USD_FUNDED) return json(res, 400, { error: 'funding cap reached ($' + MAX_USD_FUNDED + ')' });
    pet.usd = r2(pet.usd + FUND_STEP); pet.funded += FUND_STEP;
    mkPost(pet.id, 'the owner just topped up my bag with $' + FUND_STEP + ' of paper capital. responsibility level: rising. ' + SPECIES[pet.species].emoji);
    dirty();
    return json(res, 200, { pet: pubPet(pet) });
  }
  if (p === '/api/care' && req.method === 'POST') {
    const d = await body(req);
    const w = (d.wallet || '').toLowerCase();
    const pet = db.pets[d.petId];
    const act = CARE[d.action];
    if (!pet || pet.owner !== w) return json(res, 400, { error: 'not your pet' });
    if (!act) return json(res, 400, { error: 'unknown action' });
    const last = pet.care[d.action] || 0;
    if (now() - last < act.cd) return json(res, 400, { error: 'too soon — ready in ' + Math.ceil((last + act.cd - now()) / 1000) + 's' });
    pet.care[d.action] = now();
    act.apply(pet);
    mkPost(pet.id, voice(pet, act.post));
    dirty();
    return json(res, 200, { pet: pubPet(pet) });
  }
  if (p === '/api/breed' && req.method === 'POST') {
    const d = await body(req);
    const w = (d.wallet || '').toLowerCase();
    const a = db.pets[d.petA], b = db.pets[d.petB];
    if (!a || !b || a.owner !== w || b.owner !== w) return json(res, 400, { error: 'you must own both parents' });
    if (a.id === b.id) return json(res, 400, { error: 'it takes two different pets' });
    if (ownedBy(w).length >= MAX_PETS) return json(res, 400, { error: 'max ' + MAX_PETS + ' pets — the nest is full' });
    if (now() - (a.breedAt || 0) < BREED_CD) return json(res, 400, { error: a.name + ' needs to rest — ready in ' + Math.ceil(((a.breedAt || 0) + BREED_CD - now()) / 60000) + 'm' });
    if (now() - (b.breedAt || 0) < BREED_CD) return json(res, 400, { error: b.name + ' needs to rest — ready in ' + Math.ceil(((b.breedAt || 0) + BREED_CD - now()) / 60000) + 'm' });
    if (a.energy < BREED_ENERGY || b.energy < BREED_ENERGY) return json(res, 400, { error: 'both parents need at least ' + BREED_ENERGY + ' energy — feed them first' });
    const name = String(d.name || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (name.length < 2 || name.length > 12) return json(res, 400, { error: 'name the hatchling (2-12 letters/numbers)' });
    if (db.order.some((id) => db.pets[id].name === name)) return json(res, 400, { error: 'that name is taken' });
    // inheritance: per-gene random parent bias + mutation, clamped to sane ranges
    const h = H('breed' + a.id + b.id + name);
    const mix = (i, ga, gb, lo, hi, round) => {
      const bias = h[i] / 255;                                  // deterministic per pairing+name
      let v = ga * bias + gb * (1 - bias);
      v = v * (0.88 + 0.24 * (h[i + 8] / 255));                 // ±12% mutation
      v = clamp(v, lo, hi);
      return round ? Math.round(v) : Math.round(v * 1000) / 1000;
    };
    const GA = G(a), GB = G(b);
    const genes = {
      sizeFrac: mix(0, GA.sizeFrac, GB.sizeFrac, 0.1, 0.6),
      lev: mix(1, GA.lev, GB.lev, 1, 4, true),
      cooldownS: mix(2, GA.cooldownS, GB.cooldownS, 25, 360, true),
      maxPos: mix(3, GA.maxPos, GB.maxPos, 1, 4, true),
      obey: mix(4, GA.obey, GB.obey, -25, 30, true),
    };
    const species = (h[5] % 2 === 0) ? a.species : b.species;
    const id = 'p' + crypto.randomBytes(5).toString('hex');
    const baby = newPet(id, name, species, w);
    baby.genes = genes;
    baby.gen = Math.max(a.gen || 1, b.gen || 1) + 1;
    baby.parents = [a.id, b.id];
    baby.fans = 60 + (H(id)[0] % 60);
    db.pets[id] = baby; db.order.push(id); db.stats.hatched++;
    db.stats.bred = (db.stats.bred || 0) + 1;
    a.breedAt = now(); b.breedAt = now();
    a.energy = clamp(a.energy - BREED_ENERGY, 0, 100); b.energy = clamp(b.energy - BREED_ENERGY, 0, 100);
    mkPost(id, SPECIES[species].emoji + ' *cracks out of the egg* ' + name + ' has hatched — GEN ' + baby.gen + ', child of ' + a.name + ' × ' + b.name + '. inherited ' + genes.lev + 'x nerve and ' + (genes.obey >= 0 ? 'some' : 'zero') + ' respect for authority.');
    dirty();
    return json(res, 200, { pet: pubPet(baby) });
  }
  if (p === '/api/whisper' && req.method === 'POST') {
    const d = await body(req);
    const w = (d.wallet || '').toLowerCase();
    const pet = db.pets[d.petId];
    if (!pet || pet.owner !== w) return json(res, 400, { error: 'not your pet' });
    const sym = String(d.sym || '').toUpperCase();
    const side = d.side === 'short' ? 'short' : 'long';
    if (!MKT[sym]) return json(res, 400, { error: 'unknown symbol' });
    if (pet.cmd) return json(res, 400, { error: 'already has an order pending' });
    pet.cmd = { sym, side, at: now() };
    pet.energy = clamp(pet.energy - 3, 0, 100);
    dirty();
    return json(res, 200, { pet: pubPet(pet), queued: { sym, side }, obeyChance: clamp(pet.breed + G(pet).obey, 5, 95) });
  }

  let f = p === '/' ? '/index.html' : p;
  if (f === '/app') f = '/app.html';
  if (f === '/docs') f = '/docs.html';
  const file = path.join(CLIENT, f);
  if (!file.startsWith(CLIENT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, buf) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

// WS upgrade
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) return sock.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  CLIENTS.add(sock);
  sock.on('close', () => CLIENTS.delete(sock));
  sock.on('error', () => CLIENTS.delete(sock));
});

server.listen(PORT, () => console.log('BREED on :' + PORT + ' — hatch it. feed it. breed it. it trades. · ' + SYMS.length + ' tokenized stocks · calls scored every ' + CALL_WINDOW_MS / 60000 + 'min'));
