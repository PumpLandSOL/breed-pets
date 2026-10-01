// one-shot: Pyth Hermes now returns 401 without a key, so the tape comes from Yahoo's keyless spark endpoint. (run once)
'use strict';
const fs = require('fs'); const path = require('path'); const F = path.join(__dirname, '..', 'server', 'index.js'); let s = fs.readFileSync(F, 'utf8');
if (s.includes('YSPARK')) throw new Error('already patched');
const a = s.indexOf('async function pollPyth() {'), b = s.indexOf('pollPyth();', a); if (a < 0 || b < 0) throw new Error('pollPyth not found');
s = s.slice(0, a) + `const YSPARK = 'https://query1.finance.yahoo.com/v7/finance/spark';
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
` + s.slice(b);
fs.writeFileSync(F, s); console.log('prices patched');
