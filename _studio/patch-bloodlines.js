// one-shot: UPDATE 01 · BLOODLINES — families of pets ranked across generations, family trees, a crowned champion line. (run once)
// A bloodline = every pet connected through breeding (parents/children). Ranked by combined ROI (all members' equity vs funding).
'use strict';
const fs = require('fs'); const path = require('path');
const SF = path.join(__dirname, '..', 'server', 'index.js'), AF = path.join(__dirname, '..', 'client', 'app.html');
let s = fs.readFileSync(SF, 'utf8'), a = fs.readFileSync(AF, 'utf8');
if (s.includes('BLOODLINES')) throw new Error('already patched');
const rep = (src, x, y) => { if (!src.includes(x)) throw new Error('missing: ' + x.slice(0, 70)); return src.split(x).join(y); };

// ---------- server ----------
s = rep(s, 'function pubPet(p) {', `// ---------- BLOODLINES: families across generations ----------
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
function pubPet(p) {`);
s = rep(s, "    gen: p.gen || 1, parents: (p.parents || []).map((pid) => (db.pets[pid] ? db.pets[pid].name : '?')),",
  "    gen: p.gen || 1, parents: (p.parents || []).map((pid) => (db.pets[pid] ? db.pets[pid].name : '?')),\n    children: Object.values(db.pets).filter((c) => (c.parents || []).includes(p.id)).map((c) => c.name),\n    line: LINE_OF[p.id] ? { name: LINE_OF[p.id].name, rank: LINE_OF[p.id].rank, champion: LINE_OF[p.id].champion, members: LINE_OF[p.id].members } : null,");
s = rep(s, "  if (p === '/api/leaderboard') {", "  if (p === '/api/bloodlines') { computeLines(); return json(res, 200, { lines: LINES.slice(0, 50).map((l) => ({ ...l, roi: r2(l.roi) })) });\n  if (p === '/api/leaderboard') {");
fs.writeFileSync(SF, s);

// ---------- client ----------
a = rep(a, '    <button class="tab" data-v="shelter">🏚 SHELTER</button>', '    <button class="tab" data-v="lines">🧬 BLOODLINES</button>\n    <button class="tab" data-v="shelter">🏚 SHELTER</button>');
a = rep(a, "    if(VIEW==='callers'||VIEW==='rich'){", `    if(VIEW==='lines'){
      const d=await api('/api/bloodlines');
      $('feed').innerHTML='<div class="empty" style="padding:14px 0 6px">every family of pets, ranked by combined ROI across all generations. the #1 line wears the crown.</div>'+(d.lines.length?d.lines.map((l,i)=>'<div class="lb">'+
        '<div class="rank'+(i===0?' gold':'')+'">'+(i===0?'👑':i+1)+'</div>'+
        '<div class="lav" style="border-color:'+l.color+'" onclick="openProfile(\\''+l.id+'\\')">'+l.emoji+'</div>'+
        '<div class="ln"><div class="a" onclick="openProfile(\\''+l.id+'\\')">'+esc(l.name)+(l.champion?' <span class="tagpill o" style="background:var(--gold);color:#fff">CHAMPION</span>':'')+'</div>'+
        '<div class="b">G1→G'+l.maxGen+' · '+l.members+' pets · '+l.pets.map(p=>p.emoji+esc(p.name)).join(' ')+(l.hitRate!=null?' · '+l.hitRate+'% hit':'')+'</div></div>'+
        '<div class="big">'+(l.roi>=0?'+':'')+l.roi.toFixed(1)+'%</div></div>').join('')
        :'<div class="empty">no bloodlines yet. breed two pets in My Pets and start the first one.</div>');
      return}
    if(VIEW==='callers'||VIEW==='rich'){`);
a = rep(a, "(a.gen>1?' · <b style=\"color:var(--gold)\">GEN '+a.gen+'</b> — child of '+esc(a.parents[0])+' × '+esc(a.parents[1]):'')+'</div></div></div>'+",
  "(a.gen>1?' · <b style=\"color:var(--gold)\">GEN '+a.gen+'</b> — child of '+esc(a.parents[0])+' × '+esc(a.parents[1]):'')+'</div>'+(a.line?'<div class=\"ph\" style=\"margin-top:4px\">🧬 <b>'+esc(a.line.name)+'</b> · #'+a.line.rank+' of the bloodlines · '+a.line.members+' pets'+(a.line.champion?' · 👑 <b style=\"color:var(--gold)\">CHAMPION LINE</b>':'')+'</div>':'')+(a.children&&a.children.length?'<div class=\"ph\" style=\"margin-top:4px\">offspring: '+a.children.map(esc).join(', ')+'</div>':'')+'</div></div>'+");
fs.writeFileSync(AF, a); console.log('bloodlines patched');
