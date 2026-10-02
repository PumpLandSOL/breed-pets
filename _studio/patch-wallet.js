// one-shot: robust wallet connect (EIP-6963 picker, verified Robinhood Chain, real errors, mobile deep links). (run once)
'use strict';
const fs = require('fs'); const path = require('path');
const F = path.join(__dirname, '..', 'client', 'app.html'); let s = fs.readFileSync(F, 'utf8');
if (s.includes('eip6963')) throw new Error('already patched');
const a = s.indexOf("$('connectBtn').onclick=async()=>{"); const b = s.indexOf("}catch(e){toast('Connection rejected')}\n};", a);
if (a < 0 || b < 0) throw new Error('connect handler not found');
const end = b + "}catch(e){toast('Connection rejected')}\n};".length;
s = s.slice(0, a) + `// ---- wallet connect: every injected wallet (EIP-6963), verified Robinhood Chain, real error text ----
const CHAIN_HEX='0x1237';
const WALLETS=[];
addEventListener('eip6963:announceProvider',e=>{const d=e.detail;if(d&&d.provider&&!WALLETS.some(x=>x.info.uuid===d.info.uuid))WALLETS.push(d)});
dispatchEvent(new Event('eip6963:requestProvider'));
const errText=e=>{const m=(e&&((e.data&&e.data.message)||e.message))||String(e||'');if((e&&e.code===4001)||/reject|denied|cancel/i.test(m))return 'request rejected in your wallet';return m.replace(/^Error:\\s*/,'').slice(0,120)||'wallet error'};
async function ensureChain(eth){
  const cur=async()=>String(await eth.request({method:'eth_chainId'})).toLowerCase();
  if(await cur()===CHAIN_HEX)return;
  try{await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:CHAIN_HEX}]})}
  catch(sw){const c=sw&&(sw.code||(sw.data&&sw.data.originalError&&sw.data.originalError.code));
    if(c===4902||/unrecognized|not added|unknown chain|wallet_addEthereumChain/i.test((sw&&sw.message)||'')){
      await eth.request({method:'wallet_addEthereumChain',params:[{chainId:CHAIN_HEX,chainName:'Robinhood Chain',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:['https://rpc.mainnet.chain.robinhood.com'],blockExplorerUrls:['https://explorer.mainnet.chain.robinhood.com']}]});
    }else throw sw}
  if(await cur()!==CHAIN_HEX)throw new Error('switch your wallet to Robinhood Chain (4663) — MetaMask and Rabby support it');
}
async function useWallet(eth){
  closeModal();
  try{
    const a=await eth.request({method:'eth_requestAccounts'});
    if(!a||!a[0]||!isEvm(a[0]))throw new Error('no account returned by the wallet');
    await ensureChain(eth);
    wallet=a[0].toLowerCase();localStorage.setItem('breed_w',wallet);renderWallet();toast('Connected '+short(wallet)+' — go hatch something');loadMine();
    if(eth.on&&!eth._breedBound){eth._breedBound=1;eth.on('accountsChanged',x=>{if(x&&x[0]){wallet=x[0].toLowerCase();localStorage.setItem('breed_w',wallet);renderWallet();loadMine()}})}
  }catch(e){toast(errText(e))}
}
function walletSheet(html){$('prof').innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><b style="font-size:18px">Connect a wallet</b><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>'+html;$('modal').classList.add('on')}
$('connectBtn').onclick=async()=>{
  if(wallet){wallet='';localStorage.removeItem('breed_w');MINE=[];renderWallet();toast('Disconnected');return}
  dispatchEvent(new Event('eip6963:requestProvider'));await new Promise(r=>setTimeout(r,150));
  const list=WALLETS.filter(x=>x.provider);
  if(list.length>1){
    walletSheet('<div style="color:var(--sub);font-size:14px;margin-bottom:12px">Pick one. MetaMask and Rabby support Robinhood Chain.</div>'+list.map((x,i)=>'<button class="btn btn-ghost wpick" data-i="'+i+'" style="width:100%;display:flex;gap:12px;align-items:center;justify-content:flex-start;margin-bottom:8px">'+(x.info.icon?'<img src="'+x.info.icon+'" width="24" height="24" alt="">':'')+esc(x.info.name)+'</button>').join(''));
    document.querySelectorAll('.wpick').forEach(b=>b.onclick=()=>useWallet(list[+b.dataset.i].provider));return}
  const eth=list.length?list[0].provider:window.ethereum;
  if(eth)return useWallet(eth);
  // no injected wallet (usually a phone browser): open this page inside a wallet app
  const here=location.host+location.pathname;
  walletSheet('<div style="color:var(--sub);font-size:14px;margin-bottom:14px">No wallet found in this browser. Open BREED inside your wallet app:</div>'+
    '<a class="btn btn-pink" style="width:100%;margin-bottom:8px;display:block;text-align:center" href="https://metamask.app.link/dapp/'+here+'">Open in MetaMask</a>'+
    '<a class="btn btn-ghost" style="width:100%;margin-bottom:8px;display:block;text-align:center" href="https://rabby.io">Get Rabby</a>'+
    '<div style="color:var(--mut);font-size:12px;margin-top:6px">On desktop, install MetaMask or Rabby and reload.</div>');
};` + s.slice(end);
fs.writeFileSync(F, s); console.log('wallet patched');
