// wallet connect E2E: picker with 2 wallets (one hijacking window.ethereum), add-chain path, no-wallet phone path, hatch after connect
'use strict';
const path = require('path'); const os = require('os'); const { spawn } = require('child_process'); const { open, sleep } = require('./cdp.cjs');
const PORT = 8234, B = 'http://localhost:' + PORT, ME = '0x2c7536e3605d9c16a7a3d7b1898e529396a65c23';
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  · ' + x : '')); };
const MOCK = `(()=>{let chain='0x1';const p={on(){},async request({method,params}){window.__calls=(window.__calls||[]).concat(method);
 if(method==='eth_requestAccounts')return ['${ME}'];if(method==='eth_chainId')return chain;
 if(method==='wallet_switchEthereumChain'){if(!window.__added){const e=new Error('Unrecognized chain ID');e.code=4902;throw e}chain=params[0].chainId;return null}
 if(method==='wallet_addEthereumChain'){if(!params[0].blockExplorerUrls||!params[0].blockExplorerUrls.length)throw new Error('blockExplorerUrls required');window.__added=1;chain=params[0].chainId;return null}
 throw new Error('unsupported')}};
 const bad={on(){},async request(){throw new Error('hijacker used')}};
 const ann=()=>{dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info:{uuid:'m1',name:'Mock MetaMask',icon:'',rdns:'io.mm'},provider:p})}));dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info:{uuid:'m2',name:'Phantom',icon:'',rdns:'app.phantom'},provider:bad})}))};
 addEventListener('eip6963:requestProvider',ann);ann();window.ethereum=bad;})();`;
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), DATA_PATH: path.join(os.tmpdir(), 'breed-w-' + Date.now() + '.json') }, stdio: 'ignore' });
  let c, c2;
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(B + '/api/config')).ok) break; } catch {} await sleep(200); }
    c = await open('about:blank', 1280, 860, 9701); await c.send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK }); await c.send('Page.navigate', { url: B + '/app' }); await sleep(3500);
    await c.ev(`document.getElementById('connectBtn').click()`); await sleep(600);
    const picks = await c.ev(`[...document.querySelectorAll('.wpick')].map(b=>b.textContent.trim())`); ok('picker lists both wallets', picks && picks.length === 2, JSON.stringify(picks));
    await c.ev(`[...document.querySelectorAll('.wpick')].find(b=>/MetaMask/.test(b.textContent)).click()`); await sleep(1500);
    const st = await c.ev(`({btn:document.getElementById('connectBtn').textContent,w:localStorage.getItem('breed_w'),calls:window.__calls,toast:document.getElementById('toast').textContent})`);
    ok('connected with the picked wallet', st.w === ME && /^0x2c75/.test(st.btn), st.btn + ' · ' + st.toast);
    ok('Robinhood Chain added (with explorer url) then switched', st.calls.includes('wallet_addEthereumChain'));
    // hatch through the real UI
    await c.ev(`openHatch()`); await sleep(500); await c.ev(`(()=>{const i=document.querySelector('#prof input');i.value='SPROUT';i.dispatchEvent(new Event('input'));doHatch()})()`); await sleep(1500);
    const mine = await (await fetch(B + '/api/mine?wallet=' + ME)).json(); const ps = mine.pets || mine; ok('hatched a pet after connecting', ps.some((p) => p.name === 'SPROUT'), ps.map((p) => p.name).join(','));
    // phone browser: no wallet at all
    c2 = await open(B + '/app', 390, 800, 9702); await sleep(3500); await c2.ev(`document.getElementById('connectBtn').click()`); await sleep(600);
    const link = await c2.ev(`(document.querySelector('a[href*="metamask.app.link"]')||{}).href||''`); ok('no wallet → open-in-MetaMask link', /metamask\.app\.link\/dapp\/localhost:8234\/app/.test(link), link);
  } catch (e) { console.error(e); fail++; } finally { if (c) c.close(); if (c2) c2.close(); srv.kill(); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
