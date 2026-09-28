/* An address that cannot receive a code is refused before a code is ever minted. */
import worker from '../worker.js';
const store=new Map();
const env={ PF_SYNC:{ get:async k=>store.has(k)?store.get(k):null, put:async(k,v)=>{store.set(k,v);}, delete:async k=>{store.delete(k);} },
  ALLOWED_ORIGIN:'https://perceptfolio.com', SYNC_SECRET:'op-secret' };
const get=p=>worker.fetch(new Request('https://w.example'+p,{headers:{origin:'https://perceptfolio.com'}}),env);
const post=(p,b)=>worker.fetch(new Request('https://w.example'+p,{method:'POST',headers:{'content-type':'application/json',origin:'https://perceptfolio.com'},body:JSON.stringify(b)}),env);
let fails=0; const t=(n,ok,x='')=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(ok?'':'   '+x)); if(!ok)fails++;};

let r=await get('/checkemail?email=someone@gmail.com'); let j=await r.json();
t('a real domain passes', j.ok===true, JSON.stringify(j));

r=await get('/checkemail?email=someone@gmail.com'); j=await r.json();
t('the second ask on the same domain is cached', j.cached===true);

r=await get('/checkemail?email=a@notarealdomain-xyz123.com'); j=await r.json();
t('a domain that cannot receive mail is refused', j.ok===false && /can receive mail/.test(j.why), JSON.stringify(j));

r=await get('/checkemail?email=me@gmial.com'); j=await r.json();
t('a near-miss is refused WITH the correction', j.ok===false && j.suggest==='me@gmail.com', JSON.stringify(j));

r=await get('/checkemail?email=x@mailinator.com'); j=await r.json();
t('a throwaway is refused', j.ok===false && /throwaway/.test(j.why));

r=await get('/checkemail?email=notanemail'); j=await r.json();
t('nonsense is refused', j.ok===false);

/* The request form must not be able to book a request nobody can be replied to. */
r=await post('/request',{email:'buyer@gmial.com',who:'One person running a concentrated long book.'}); j=await r.json();
t('/request refuses a typo and hands back the correction', r.status===400 && j.suggest==='buyer@gmail.com', r.status+' '+JSON.stringify(j));

r=await post('/request',{email:'buyer@gmail.com',who:'One person running a concentrated long book.'}); j=await r.json();
t('/request accepts a deliverable address', r.status===200 && j.ok===true, r.status+' '+JSON.stringify(j).slice(0,90));

/* A resolver that is down must never cost a real customer. */
{
  const prev=globalThis.fetch;
  globalThis.fetch=async()=>{ throw new Error('dns down'); };
  const e2={...env, PF_SYNC:{...env.PF_SYNC, get:async()=>null}};
  const rr=await worker.fetch(new Request('https://w.example/checkemail?email=a@some-new-domain.com',{headers:{origin:'https://perceptfolio.com'}}),e2);
  const jj=await rr.json();
  globalThis.fetch=prev;
  t('an unreachable resolver accepts rather than blocks', jj.ok===true && jj.unchecked===true, JSON.stringify(jj));
}
console.log(fails?'\n'+fails+' FAILED':'\nALL EMAIL CHECKS PASSED');
process.exit(fails?1:0);
