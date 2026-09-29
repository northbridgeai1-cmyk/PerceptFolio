/* DELETING AN ACCOUNT (2026-09-29)

   The operator asked to be able to delete an account from admin. Admin already had "Remove record",
   which deletes the request row and explicitly LEAVES THE CODE WORKING. That is right for tidying a
   queue and wrong for getting rid of an account, and the two looked like one button.

   POST /forget is the real one, and this suite is mostly about the ways it could go wrong quietly:

     - it must refuse while Stripe still shows a live subscription. Destroying somebody's book while
       their card is charged every month is the worst outcome available here, and cancelling their
       billing from a button labelled Delete would be a data action quietly becoming a financial one.
       So it answers 409 with the status, and `force` is reported back rather than being silent;
     - it must remove the API KEYS THEMSELVES and not only the index, or a revoked account keeps a
       working bearer token;
     - it must revoke the shared calls, which are public URLs;
     - it must take the broker credential, including at SnapTrade, because that is the one piece
       living on somebody else's server;
     - it must take the Stripe mirror, which carries their email and their code. A delete that leaves
       an email behind is not a delete. The first run of this suite caught exactly that.

   Run:  node test/forget.mjs */
import fs from 'fs'; import path from 'path'; import os from 'os';
const tmp=path.join(os.tmpdir(),'pf-fg-'+process.pid+'.mjs');
fs.writeFileSync(tmp,fs.readFileSync('worker.js','utf8'));
const worker=(await import('file://'+tmp)).default; fs.unlinkSync(tmp);
const store=new Map();
const KV={get:async k=>store.has(k)?store.get(k):null,put:async(k,v)=>{store.set(k,String(v));},delete:async k=>{store.delete(k);},
  list:async({prefix})=>({keys:[...store.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name}))})};
const env={PF_SYNC:KV,SYNC_SECRET:'op',ALLOWED_ORIGIN:'https://perceptfolio.com'};
globalThis.fetch=async()=>new Response('{}',{status:200});
const W='https://w.example', C='AAAAA-BBBBB', ID='req1';
let pass=0,fail=0; const t=(n,ok,g)=>{ok?pass++:fail++;console.log((ok?'  PASS  ':'  FAIL  ')+n+(g!==undefined?'   '+JSON.stringify(g):''));};
const call=(p,init={})=>worker.fetch(new Request(W+p,{headers:{origin:'https://perceptfolio.com','content-type':'application/json',...(init.headers||{})},...init}),env);

function seed(){
  store.clear();
  store.set('req:'+ID,JSON.stringify({id:ID,email:'a@b.com',status:'personal',code:C}));
  ['uslot:'+C,'grant:'+C,'code:'+C,'udev:'+C,'rec:c:'+C,'cmarks:c:'+C,'creg:c:'+C,'chain:c:'+C,
   'notify:c:'+C,'newsseen:c:'+C].forEach(k=>store.set(k,'{}'));
  store.set('tokens:c:'+C,JSON.stringify([{id:'k_1',tok:'a'.repeat(48)}]));
  store.set('tok:'+'a'.repeat(48),'c:'+C);
  store.set('shares:c:'+C,JSON.stringify([{id:'sh1'}]));
  store.set('share:sh1','{}');
  store.set('bro:'+C,JSON.stringify({userId:'pf_x',userSecret:'v1:AA:BB'}));
}

console.log('deleting an account');
seed();
let r=await call('/forget',{method:'POST',body:JSON.stringify({id:ID})});
t('without the operator key it is refused', r.status===401);

seed();
store.set('cust:'+C,'cus_1');
store.set('sub:cus_1',JSON.stringify({status:'active',subscriptionId:'sub_1'}));
r=await call('/forget',{method:'POST',headers:{Authorization:'Bearer op'},body:JSON.stringify({id:ID})});
let j=await r.json();
t('IT REFUSES WHILE THE CARD IS STILL BEING CHARGED', r.status===409 && j.billing.status==='active', j.error);
t('and nothing was deleted', !!store.get('uslot:'+C));
t('it says how to proceed', /Cancel it in Stripe first/.test(j.error||''));

r=await call('/forget',{method:'POST',headers:{Authorization:'Bearer op'},body:JSON.stringify({id:ID,force:true})});
j=await r.json();
t('force gets through, and is reported back', r.status===200 && j.forced===true);

seed();
store.set('cust:'+C,'cus_1');
store.set('sub:cus_1',JSON.stringify({status:'canceled'}));
r=await call('/forget',{method:'POST',headers:{Authorization:'Bearer op'},body:JSON.stringify({id:ID})});
j=await r.json();
t('a cancelled subscription deletes without force', r.status===200 && j.forced===false);
const left=[...store.keys()];
t('the book is gone', !store.get('uslot:'+C));
t('the grant and the code are gone', !store.get('grant:'+C) && !store.get('code:'+C));
t('the record, marks and chain are gone', !store.get('rec:c:'+C) && !store.get('cmarks:c:'+C) && !store.get('chain:c:'+C));
t('the API key itself is gone, not just the index', !store.get('tok:'+'a'.repeat(48)) && !store.get('tokens:c:'+C));
t('shared calls are revoked', !store.get('share:sh1') && !store.get('shares:c:'+C));
t('the broker credential is gone', !store.get('bro:'+C));
t('the request row is gone', !store.get('req:'+ID));
t('nothing at all is left for this account', left.length===0, left);
t('it lists what it removed rather than saying done', Array.isArray(j.removed) && j.removed.length>=12, (j.removed||[]).length);

seed();
store.delete('req:'+ID);
store.set('req:pend',JSON.stringify({id:'pend',email:'c@d.com',status:'pending'}));
r=await call('/forget',{method:'POST',headers:{Authorization:'Bearer op'},body:JSON.stringify({id:'pend'})});
j=await r.json();
t('a request that was never granted just goes', r.status===200 && j.code===null && !store.get('req:pend'));

r=await call('/forget',{method:'POST',headers:{Authorization:'Bearer op'},body:JSON.stringify({id:'nope'})});
t('an unknown id is a 404, not a silent success', r.status===404);

console.log('');
if(fail){console.log(fail+' FAILED, '+pass+' passed');process.exit(1);}
console.log('ALL '+pass+' CHECKS PASSED');
