/* PerceptFolio, a shared call (A4.6). Reads GET /share/<id> and renders it. */
const WORKER='https://crimson-hat-6ad9.northbridgeai1.workers.dev';
const $=id=>document.getElementById(id);
const short=h=>h?h.slice(0,10)+'…'+h.slice(-6):'';
const money=v=>v==null||!isFinite(v)?'-':'$'+Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=v=>v==null||!isFinite(v)?'-':(v>=0?'+':'')+v.toFixed(2)+'%';
function row(tbody,cells,ths){ const tr=document.createElement('tr'); cells.forEach((c,i)=>{ const td=document.createElement(ths&&i===0?'th':'td'); if(typeof c==='string')td.textContent=c; else { td.textContent=c.text; if(c.cls)td.className=c.cls; } tr.appendChild(td); }); tbody.appendChild(tr); }
async function main(){
  const id=new URLSearchParams(location.search).get('id')||'';
  if(!/^[a-z0-9]{12}$/.test(id)){ $('lede').textContent='This link carries no call.'; return; }
  let doc;
  try{ const r=await fetch(WORKER+'/share/'+id); if(!r.ok){ $('lede').textContent=r.status===404?'No such shared call, or it was withdrawn by its author.':'The service answered '+r.status+'.'; return; } doc=await r.json(); }
  catch(e){ $('lede').textContent='The service is not reachable from here.'; return; }
  const c=doc.call||{};
  document.title=c.sym+' '+String(c.verdict||'').toUpperCase()+' | PerceptFolio';
  $('title').textContent=c.sym+' · '+String(c.label||c.verdict||'').toUpperCase();
  $('lede').textContent=(doc.by&&doc.by.name?'Called by '+doc.by.name:'Shared by its author')+', '+(c.date||'')+'. '+doc.note;
  const cb=$('call'); cb.innerHTML='';
  row(cb,['Ticker',c.sym||''],true); row(cb,['Call',String(c.label||c.verdict||'')],true); row(cb,['Date',c.date||''],true);
  row(cb,['Price at the call',money(c.price)],true); row(cb,['S&P at the call',money(c.spy)],true);
  if(c.q!=null||c.p!=null||c.m!=null)row(cb,['Scores at the call','quality '+(c.q==null?'-':c.q)+' · value '+(c.p==null?'-':c.p)+' · momentum '+(c.m==null?'-':c.m)],true);
  if(c.track&&c.track!=='checklist')row(cb,['Track',c.track],true);
  if(c.rbv)row(cb,['Rulebook version',c.rbv],true);
  $('callCard').hidden=false;
  const mb=$('marks'); mb.innerHTML=''; let any=false;
  Object.keys(c.marks||{}).map(Number).sort((a,b)=>a-b).forEach(h=>{ const m=c.marks[h]; if(!m)return; any=true; if(m.missed){ row(mb,[h+' d',m.intended||'','','','','',{text:'missed',cls:'wait'}]); return; } const sr=(m.price>0&&c.price>0)?(m.price-c.price)/c.price*100:null, pr=(m.spy>0&&c.spy>0)?(m.spy-c.spy)/c.spy*100:null; const ex=(sr!=null&&pr!=null)?sr-pr:null; row(mb,[h+' d',m.actual||(m.at?new Date(m.at).toISOString().slice(0,10):''),money(m.price),money(m.spy),pct(sr),pct(pr),{text:pct(ex),cls:ex==null?'':(ex>=0?'ok':'bad')}]); });
  if(!any)row(mb,['none yet','','','','','','']);
  $('marksNote').textContent=any?'Excess is the stock\'s move less the index\'s move over the same days, before beta adjustment. The terminal reports the beta-adjusted figure in the record.':'The call was logged; its anniversaries have not come yet.';
  $('marksCard').hidden=false;
  const ch=$('chain'); ch.innerHTML='';
  const heads=Array.isArray(doc.serverHeads)?doc.serverHeads:[];
  const sealed=Object.keys(c.marks||{}).map(h=>({h,m:c.marks[h]})).filter(x=>x.m&&x.m.hash&&x.m.seq!=null);
  if(!sealed.length)row(ch,['Sealed marks','none yet; a mark is sealed into the chain after it is taken'],true);
  sealed.forEach(({h,m})=>{ const cover=heads.filter(x=>x.n>m.seq); const first=cover.length?cover[0]:null; row(ch,[h+'-day mark','entry '+m.seq+' · '+short(m.hash)+(first?' · on the server\'s clock by '+first.day:' · not yet covered by a server head')],true); });
  if(doc.chain)row(ch,['Chain at sharing','head '+short(doc.chain.head)+' at '+doc.chain.n+' entries'],true);
  if(heads.length)row(ch,['Server heads','from '+heads[0].day+' to '+heads[heads.length-1].day+', '+heads.length+' days recorded'],true);
  row(ch,['Shared',new Date(doc.createdAt).toISOString().slice(0,10)],true);
  $('chainCard').hidden=false;
}
main();
