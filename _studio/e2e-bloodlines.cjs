// Bloodlines E2E: two wallets each breed a family; /api/bloodlines ranks them, profiles carry lineage, the tab renders.
'use strict';
const path = require('path'); const os = require('os'); const { spawn } = require('child_process'); const { open, sleep } = require('./cdp.cjs');
const PORT = 8235, B = 'http://localhost:' + PORT;
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  · ' + x : '')); };
const post = (u, b) => fetch(B + u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), DATA_PATH: path.join(os.tmpdir(), 'breed-bl-' + Date.now() + '.json') }, stdio: 'ignore' });
  let c;
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(B + '/api/config')).ok) break; } catch {} await sleep(200); }
    const fam = async (w, a, b, kid, sa, sb) => { const A = (await post('/api/hatch', { wallet: w, name: a, species: sa })).pet; const Bp = (await post('/api/hatch', { wallet: w, name: b, species: sb })).pet; const K = await post('/api/breed', { wallet: w, petA: A.id, petB: Bp.id, name: kid }); return { A, Bp, K }; };
    const f1 = await fam('0x00000000000000000000000000000000000000a1', 'ROCKET', 'LUNA', 'COMET', 'dog', 'cat');
    const f2 = await fam('0x00000000000000000000000000000000000000a2', 'NIBS', 'SHELLY', 'PEBBLE', 'hamster', 'turtle');
    ok('both families bred a GEN 2', f1.K.pet && f1.K.pet.gen === 2 && f2.K.pet && f2.K.pet.gen === 2, (f1.K.error || '') + (f2.K.error || ''));
    const d = await (await fetch(B + '/api/bloodlines')).json();
    ok('two bloodlines ranked', d.lines.length === 2, d.lines.map((l) => l.rank + '.' + l.name + ' ' + l.members + 'p G' + l.maxGen).join(' | '));
    ok('exactly one champion, ranked #1', d.lines.filter((l) => l.champion).length === 1 && d.lines[0].champion);
    ok('founder names the line', d.lines.some((l) => l.name === 'ROCKET LINE' || l.name === 'LUNA LINE') && d.lines.some((l) => /NIBS|SHELLY/.test(l.name)));
    ok('shelter legends are not lines (no children)', !d.lines.some((l) => /REX|WHISKERS/.test(l.name)));
    const kid = await (await fetch(B + '/api/pet?id=' + f1.K.pet.id)).json(); const par = await (await fetch(B + '/api/pet?id=' + f1.A.id)).json();
    ok('child profile carries its line', kid.line && kid.line.members === 3, JSON.stringify(kid.line));
    ok('parent profile lists offspring', par.children && par.children.includes('COMET'), JSON.stringify(par.children));
    c = await open(B + '/app', 1280, 900, 9721); await sleep(3500);
    await c.ev(`document.querySelector('.tab[data-v=lines]').click()`); await sleep(1500);
    const txt = await c.ev(`document.getElementById('feed').innerText`); ok('Bloodlines tab renders the ranking', /LINE/.test(txt) && /CHAMPION/.test(txt) && /G1→G2/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 140));
    await c.ev(`openProfile('${f1.K.pet.id}')`); await sleep(1200); const pt = await c.ev(`document.getElementById('prof').innerText`);
    ok('profile shows the bloodline', /of the bloodlines/.test(pt), pt.split('\n').find((l) => /bloodlines/.test(l)));
    await c.shot(path.join(__dirname, 'shots', '07-bloodline-profile.png')); await c.ev(`closeModal()`); await sleep(400); await c.shot(path.join(__dirname, 'shots', '08-bloodlines.png'));
  } catch (e) { console.error(e); fail++; } finally { if (c) c.close(); srv.kill(); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
