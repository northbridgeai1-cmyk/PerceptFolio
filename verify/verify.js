/* PerceptFolio, the verifier (A2.5). Recomputes a record's hash chain from an evidence pack and
   checks the server-dated heads against it. Runs entirely in this page; the only request it can
   make is the optional fetch of the live head log for a code the reader types.

   The four functions below are copied from terminal/index.html VERBATIM. The test suite parses
   both files and fails if they differ, because a verifier that hashes differently from the
   terminal would verify nothing. */
const WORKER='https://crimson-hat-6ad9.northbridgeai1.workers.dev';

function canonicalJson(o){
  if(o===null||typeof o!=='object')return JSON.stringify(o);
  if(Array.isArray(o))return '['+o.map(canonicalJson).join(',')+']';
  return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(o[k])).join(',')+'}';
}
function chainRecord(id,h,mk,prevHash){
  return{callId:id,horizon:+h,
         intendedDate:mk.intended||null,actualDate:mk.actual||null,
         price:mk.price==null?null:+mk.price,
         spy:mk.spy==null?null:+mk.spy,
         beta:mk.beta==null?null:+mk.beta,
         prevHash:prevHash||''};
}
function reviewRecord(r,prevHash){
  return{kind:'review',sym:String(r.sym||''),at:+r.at,
         marks:(r.marks||[]).map(x=>({n:+x.n,mark:String(x.mark)})),
         prevHash:prevHash||''};
}
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');}

/* The pack's sealed entries, marks and reviews, in chain order. */
function entriesOf(pack){
  const out=[];
  (pack.calls||[]).forEach(c=>{
    Object.keys(c.marks||{}).forEach(h=>{ const mk=c.marks[h]; if(mk&&mk.hash&&mk.seq!=null)out.push({seq:+mk.seq,kind:'mark',id:c.id,sym:c.sym,h:+h,mk}); });
  });
  (pack.reviews||[]).forEach(r=>{ if(r&&r.hash&&r.seq!=null)out.push({seq:+r.seq,kind:'review',sym:r.sym,review:r}); });
  return out.sort((a,b)=>a.seq-b.seq);
}
async function recompute(pack){
  const entries=entriesOf(pack); let prev=''; const rows=[]; let broken=null;
  for(const e of entries){
    const have=e.kind==='review'?e.review.hash:e.mk.hash;
    const want=await sha(canonicalJson(e.kind==='review'?reviewRecord(e.review,prev):chainRecord(e.id,e.h,e.mk,prev)));
    const ok=want===have&&broken===null;
    if(!ok&&broken===null)broken=e;
    rows.push({e,ok,have,want});
    prev=have;
  }
  return{entries,rows,broken,head:prev,n:entries.length,contiguous:entries.every((e,i)=>e.seq===i)};
}
/* A7.1. Signatures: a seat signs each call over these fields with a P-256 key whose public half
   the firm registered; the pack carries the keys. The message is built exactly as the terminal
   builds it (PF_signedMessageOf). */
function signedMessageOf(c){ return canonicalJson({id:c.id,sym:c.sym,verdict:c.verdict||null,ts:c.ts,price:c.price==null?null:+c.price,spy:c.spy==null?null:+c.spy,rbv:c.rbv||null,seat:c.by?c.by.seat:null}); }
function b64uToBuf(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; const bin=atob(s); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i); return out.buffer; }
async function verifySignatures(pack){
  const keys=Array.isArray(pack.keys)?pack.keys:[]; const signed=(pack.calls||[]).filter(c=>c.by&&c.by.sig&&c.by.key);
  if(!signed.length)return{signed:0,ok:0,noKey:0};
  const imported={};
  for(const k of keys){ try{ imported[k.kid]=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:k.jwk.x,y:k.jwk.y},{name:'ECDSA',namedCurve:'P-256'},false,['verify']); }catch(e){} }
  let ok=0,noKey=0;
  for(const c of signed){ const key=imported[c.by.key]; if(!key){ noKey++; continue; } try{ if(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,b64uToBuf(c.by.sig),new TextEncoder().encode(signedMessageOf(c))))ok++; }catch(e){} }
  return{signed:signed.length,ok,noKey};
}
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=h=>h?h.slice(0,10)+'…'+h.slice(-6):'';
let PACK=null,RES=null;

function row(tbody,cells){ const tr=document.createElement('tr'); cells.forEach(c=>{ const td=document.createElement('td'); if(typeof c==='string')td.textContent=c; else{ td.textContent=c.text; if(c.cls)td.className=c.cls; } tr.appendChild(td); }); tbody.appendChild(tr); }

/* Which pack entry a server head names: the entry with seq n-1 must carry head. */
function headCheck(res,h){
  if(!(h.n>0))return{ok:false,text:'no count'};
  const e=res.entries[h.n-1];
  if(!e||e.seq!==h.n-1)return{ok:false,text:'the pack has no entry '+(h.n-1)};
  const have=e.kind==='review'?e.review.hash:e.mk.hash;
  return have===h.head?{ok:true,text:'entry '+(h.n-1)+' carries this head'}:{ok:false,text:'entry '+(h.n-1)+' carries a different hash'};
}
function renderHeads(list,live){
  const tb=$('heads').querySelector('tbody'); tb.innerHTML='';
  if(!list.length){ row(tb,['none','','','']); return{ok:0,n:0}; }
  let ok=0;
  list.forEach(h=>{ const c=headCheck(RES,h); if(c.ok)ok++; row(tb,[h.day+(h.at?' '+new Date(h.at).toISOString().slice(11,16)+'Z':'')+(live?' (live)':''),String(h.n),{text:short(h.head),cls:'mono'},{text:(c.ok?'yes: ':'no: ')+c.text,cls:c.ok?'ok':'bad'}]); });
  return{ok,n:list.length};
}
async function run(pack){
  PACK=pack; RES=await recompute(pack);
  const tb=$('checks').querySelector('tbody'); tb.innerHTML='';
  const fmt=pack.format==='perceptfolio-evidence/1';
  row(tb,['Pack format',{text:fmt?'recognised':'not a PerceptFolio evidence pack',cls:fmt?'ok':'bad'},fmt?'perceptfolio-evidence/1, exported '+esc(pack.exportedAt||'?')+(pack.account?' by '+esc(pack.account):''):'expected format perceptfolio-evidence/1']);
  const calls=(pack.calls||[]).length, reviews=(pack.reviews||[]).length;
  row(tb,['Contents','',calls+' call'+(calls===1?'':'s')+', '+reviews+' review'+(reviews===1?'':'s')+', '+RES.n+' sealed entr'+(RES.n===1?'y':'ies')+' in the chain'+(pack.scorecard?', scorecard '+pack.scorecard:'')]);
  const chainOk=!RES.broken&&RES.contiguous;
  row(tb,['Chain recomputed',{text:RES.n?(chainOk?'every hash matches':'broken'):'nothing sealed yet',cls:RES.n?(chainOk?'ok':'bad'):'wait'},RES.broken?('first mismatch at entry '+RES.broken.seq+' ('+RES.broken.kind+', '+esc(RES.broken.sym)+(RES.broken.h?', '+RES.broken.h+' d':'')+')'):(RES.contiguous?'sequence 0 to '+(RES.n-1)+', no gaps':'the sequence has gaps')]);
  const headOk=!!(pack.chain&&pack.chain.head===RES.head&&+pack.chain.n===RES.n);
  row(tb,['Head matches the pack',{text:pack.chain?(headOk?'yes':'no'):'no head in pack',cls:pack.chain?(headOk?'ok':'bad'):'wait'},pack.chain?('pack says '+short(pack.chain.head)+' at '+pack.chain.n+'; recomputed '+short(RES.head)+' at '+RES.n):'']);
  const heads=Array.isArray(pack.serverHeads)?pack.serverHeads:[];
  const hc=renderHeads(heads,false);
  row(tb,['Server heads in the pack',{text:heads.length?(hc.ok===hc.n?'all '+hc.n+' match':hc.ok+' of '+hc.n+' match'):'none',cls:heads.length?(hc.ok===hc.n?'ok':'bad'):'wait'},heads.length?('source: '+esc(pack.serverHeadsSource||'?')+'; earliest '+esc(heads[0].day)+', latest '+esc(heads[heads.length-1].day)):'the pack was exported without the server log (offline, or not reachable); fetch it below']);
  const sg=await verifySignatures(pack);
  if(sg.signed)row(tb,['Seat signatures',{text:sg.ok===sg.signed?'all '+sg.signed+' verify':sg.ok+' of '+sg.signed+' verify',cls:sg.ok===sg.signed?'ok':'bad'},(sg.noKey?sg.noKey+' signed with a key the pack does not carry; ':'')+'each signature is checked over the call\'s id, ticker, verdict, time, price, index and rulebook version against the seat\'s registered public key']);
  if(pack.verifiedOnDevice)row(tb,['The device\'s own result','',(pack.verifiedOnDevice.ok?'ok, ':'broken, ')+pack.verifiedOnDevice.n+' entries'+(pack.verifiedOnDevice.head?', head '+short(pack.verifiedOnDevice.head):'')+' (reported by the exporting device; not relied on here)']);
  const all=fmt&&chainOk&&headOk&&(heads.length?hc.ok===hc.n:true);
  const v=$('verdict'); v.textContent=RES.n?(all?'The record verifies.':'The record does not verify.'):'Nothing sealed yet: the chain is empty, so there is nothing to verify.'; v.className=RES.n?(all?'ok':'bad'):'';
  const eb=$('entries').querySelector('tbody'); eb.innerHTML='';
  RES.rows.slice(0,2000).forEach(({e,ok,have})=>row(eb,[String(e.seq),e.kind,e.sym||'',e.kind==='mark'?e.h+' d':'',e.kind==='mark'?(e.mk.actual||(e.mk.at?new Date(e.mk.at).toISOString().slice(0,10):'')):new Date(e.review.at).toISOString().slice(0,10),{text:short(have),cls:'mono'},{text:ok?'yes':'no',cls:ok?'ok':'bad'}]));
  $('resultCard').hidden=false; $('headsCard').hidden=false; $('entriesCard').hidden=!RES.n;
}
function load(file){
  $('fileName').textContent=file.name;
  const r=new FileReader();
  r.onload=()=>{ try{ run(JSON.parse(String(r.result))); }catch(e){ $('resultCard').hidden=false; $('verdict').textContent='That file is not JSON.'; $('verdict').className='bad'; $('checks').querySelector('tbody').innerHTML=''; } };
  r.readAsText(file);
}
$('file').addEventListener('change',e=>{ if(e.target.files&&e.target.files[0])load(e.target.files[0]); });
const drop=$('drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over');}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');}));
drop.addEventListener('drop',e=>{ const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f)load(f); });
$('fetchHeads').addEventListener('click',async()=>{
  const code=($('code').value||'').trim().toUpperCase(); const note=$('liveNote');
  if(!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code)){ note.textContent='A code looks like XXXXX-XXXXX.'; return; }
  if(!RES){ note.textContent='Load a pack first.'; return; }
  $('fetchHeads').disabled=true; note.textContent='Fetching…';
  try{
    const r=await fetch(WORKER+'/chain?code='+encodeURIComponent(code));
    if(!r.ok){ note.textContent=r.status===401?'That code is not live.':'The service answered '+r.status+'.'; return; }
    const heads=(await r.json()).heads||[]; const hc=renderHeads(heads,true);
    note.textContent=heads.length?(hc.ok+' of '+hc.n+' live heads match the pack'+(JSON.stringify(heads)===JSON.stringify(PACK.serverHeads||[])?'; identical to the heads inside the pack':'; the live log differs from the heads inside the pack')+'.'):'The service holds no heads for that code.';
  }catch(e){ note.textContent='The service is not reachable from here.'; }
  finally{ $('fetchHeads').disabled=false; }
});
