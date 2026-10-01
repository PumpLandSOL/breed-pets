// real UI captures for the demo video. usage: node _studio/shots.cjs <port> <wallet> <petId>
'use strict';
const { open, sleep } = require('./cdp.cjs'); const path = require('path'); const fs = require('fs');
const [, , PORT, W, PET] = process.argv; const B = 'http://localhost:' + PORT; const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const c = await open(B + '/', 1440, 860, 9691); await sleep(3500);
  const S = async (n) => { await sleep(1200); await c.shot(path.join(OUT, n + '.png')); console.log(n); };
  await S('01-landing');
  await c.ev(`localStorage.setItem('breed_w','${W}');location.href='/app'`); await sleep(4500); await S('02-feed');
  await c.ev(`openHatch()`); await S('03-hatch'); await c.ev(`closeModal()`);
  await c.ev(`setView('mine')`); await S('04-mine');
  await c.ev(`openProfile('${PET}')`); await S('05-profile'); await c.ev(`closeModal&&closeModal()`);
  await c.ev(`location.href='/docs'`); await sleep(3000); await S('06-docs');
  c.close();
})().catch((e) => { console.error(e); process.exit(1); });
