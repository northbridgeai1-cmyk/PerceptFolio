/* CNN publishes the index as JSON and refuses a bare request; the worker presents browser headers,
   passes the seven components through, and caches. */
import worker from '../worker.js';
const store=new Map();
const env={ PF_SYNC:{ get:async k=>store.has(k)?store.get(k):null, put:async(k,v)=>{store.set(k,v);}, delete:async k=>{store.delete(k);} },
  ALLOWED_ORIGIN:'https://perceptfolio.com', SYNC_SECRET:'op-secret' };
store.set('grant:AAAAA-AAAAA', JSON.stringify({code:'AAAAA-AAAAA',tier:'personal',paused:false}));
const get=p=>worker.fetch(new Request('https://w.example'+p,{headers:{origin:'https://perceptfolio.com'}}),env);
let fails=0; const t=(n,ok,x='')=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(ok?'':'   '+x)); if(!ok)fails++;};

let r=await get('/feargreed'); t('refused without a live code', r.status===401);

r=await get('/feargreed?code=AAAAA-AAAAA'); let j=await r.json();
t('the index comes back with a score and a rating', r.status===200 && j.score>=0 && j.score<=100 && !!j.rating, r.status+' '+JSON.stringify(j).slice(0,120));
t('all seven components are passed through, each with its own date', j.parts.length===7 && j.parts.every(p=>p.name&&p.score!=null&&p.at), 'n='+(j.parts||[]).length);
t('it carries what it read a week and a month ago', typeof j.prev.week==='number' && typeof j.prev.month==='number', JSON.stringify(j.prev));
t('it names whose index it is and says it reaches no verdict', /CNN/.test(j.source) && /reaches no rulebook and no verdict/.test(j.note));

r=await get('/feargreed?code=AAAAA-AAAAA'); j=await r.json();
t('the second ask within the hour is cached', j.cached===true);

console.log('   score', j.score, j.rating, '|', j.parts.map(p=>p.name+' '+p.score).join(', '));
console.log(fails?'\n'+fails+' FAILED':'\nALL FEAR AND GREED CHECKS PASSED');
process.exit(fails?1:0);
