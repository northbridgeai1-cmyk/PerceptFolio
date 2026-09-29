/* A FREE CODE FOR THE OPERATOR AND THEIR STAFF (2026-09-29)

   The owner asked how to get their own account without paying. The answer should have been easy: the
   'employee' tier has existed from the beginning, is free, is never sold, and the gate gives it a
   ten-year session. It was unreachable. Every code came out of /decide, /decide needs a req: record,
   and req: records only exist because somebody filled in the demo form, so the owner of the product
   had to send themselves a sales enquiry and approve it, and the only button on that screen granted
   'personal', which is the tier meant for people who pay.

   POST /staffcode closes that. What this suite protects:
     - it is operator-only, because a public route that mints free permanent codes is the product
       given away;
     - it mints 'employee', never 'personal', and never touches Stripe;
     - it still writes a req: record, so the code is listed, pausable and revocable from the same
       screen as every other. A code the operator cannot see is a code they cannot take back;
     - staff are counted APART from clients on the licence line, because the Finnhub question is
       whether data is served to people who are not us. Both numbers are reported, so the reading is
       visible rather than buried.

   Run:  node test/staffcode.mjs */
import fs from 'fs'; import path from 'path'; import os from 'os';
const tmp=path.join(os.tmpdir(),'pf-staff-'+process.pid+'.mjs');
fs.writeFileSync(tmp,fs.readFileSync('worker.js','utf8'));
const worker=(await import('file://'+tmp)).default; fs.unlinkSync(tmp);
const store=new Map();
const KV={get:async k=>store.has(k)?store.get(k):null,put:async(k,v)=>{store.set(k,String(v));},delete:async k=>{store.delete(k);},
  list:async({prefix})=>({keys:[...store.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name}))})};
const env={PF_SYNC:KV,SYNC_SECRET:'op-secret',ALLOWED_ORIGIN:'https://perceptfolio.com'};
globalThis.fetch=async(u)=>{ const s=String(u);
  if(s.includes('cloudflare-dns.com')) return new Response(JSON.stringify({Status:0,Answer:[{type:15,data:'10 mx.example.com'}]}),{status:200});
  return new Response('{}',{status:200}); };
const W='https://w.example';
const call=(p,init={})=>worker.fetch(new Request(W+p,{headers:{origin:'https://perceptfolio.com','content-type':'application/json',...(init.headers||{})},...init}),env);
let pass=0,fail=0; const t=(n,ok,g)=>{ok?pass++:fail++;console.log((ok?'  PASS  ':'  FAIL  ')+n+(g!==undefined?'   '+JSON.stringify(g):''));};

console.log('a free code for the operator');
let r=await call('/staffcode',{method:'POST',body:JSON.stringify({email:'me@perceptfolio.com',name:'Owner'})});
t('without the operator key it is refused', r.status===401);

r=await call('/staffcode',{method:'POST',headers:{Authorization:'Bearer op-secret'},body:JSON.stringify({email:'me@perceptfolio.com',name:'Owner'})});
const j=await r.json();
t('with it, a code is issued', r.status===200 && /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(j.code||''), j);
const codeRec=JSON.parse(store.get('code:'+j.code));
t('the tier is employee, not personal', codeRec.tier==='employee', codeRec.tier);
t('no Stripe record is created', ![...store.keys()].some(k=>k.startsWith('sub:')||k.startsWith('cust:')));
t('it appears in the queue, so it can be paused later', !!store.get('req:'+j.id));
const req=JSON.parse(store.get('req:'+j.id));
t('marked as staff, and already decided', req.source==='staff' && req.status==='employee' && req.decidedAt>0);

r=await call('/staffcode',{method:'POST',headers:{Authorization:'Bearer op-secret'},body:JSON.stringify({email:'nope'})});
t('a bad address is refused before a code is wasted', r.status===400);

/* redeem it, so a durable grant exists, then check the licence split */
r=await call('/invite?code='+j.code,{method:'POST'});
t('the code redeems', r.status===200, await r.clone().json());
const grant=JSON.parse(store.get('grant:'+j.code)||'null');
t('the grant carries the employee tier', grant && grant.tier==='employee', grant);

store.set('grant:PAYER-CODE1',JSON.stringify({code:'PAYER-CODE1',tier:'personal',paused:false}));
r=await call('/version',{headers:{Authorization:'Bearer op-secret'}});
const v=await r.json();
t('staff are counted apart from clients', v.licence.liveGrants===1 && v.licence.staffGrants===1, v.licence);
t('and the trigger counts clients only', v.licence.due===false && v.licence.countsStaffSeparately===true);

console.log('');
if(fail){console.log(fail+' FAILED, '+pass+' passed');process.exit(1);}
console.log('ALL '+pass+' CHECKS PASSED');
