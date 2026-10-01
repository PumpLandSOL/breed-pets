// one-shot: TAME -> BREED across the whole copy (case-preserving). The $TAME CA is cleared, not renamed. (run once)
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const TEXT = /\.(js|cjs|html|json|md|css|txt)$/;
const OLD_CA = '0x050b9B4f75F3B680885e99da3c38089c20D94278';
function walk(d, out = []) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (n === 'node_modules' || n === '.git') continue; if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; }
const map = [[/TAMING/g, 'BREEDING'], [/Taming/g, 'Breeding'], [/taming/g, 'breeding'], [/TAME/g, 'BREED'], [/Tame/g, 'Breed'], [/tame/g, 'breed']];
let files = 0, hits = 0;
for (const f of walk(ROOT)) {
  if (f === __filename) continue;
  let s = fs.readFileSync(f, 'utf8'); const before = s;
  s = s.split(OLD_CA).join('');                                   // never show TAME's contract on BREED
  for (const [re, to] of map) s = s.replace(re, () => { hits++; return to; });
  if (s !== before) { fs.writeFileSync(f, s); files++; }
  const base = path.basename(f); if (/tame/i.test(base)) { const nf = path.join(path.dirname(f), base.replace(/tame/g, 'breed').replace(/TAME/g, 'BREED')); fs.renameSync(f, nf); }
}
console.log('renamed', hits, 'occurrences in', files, 'files');
