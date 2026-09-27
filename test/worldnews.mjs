import worker from '../worker.js';
const store=new Map();
const env={ PF_SYNC:{ get:async k=>store.has(k)?store.get(k):null, put:async(k,v)=>{store.set(k,v);}, delete:async k=>{store.delete(k);} },
  ALLOWED_ORIGIN:'https://perceptfolio.com', SYNC_SECRET:'op-secret' };
store.set('grant:AAAAA-AAAAA', JSON.stringify({code:'AAAAA-AAAAA',tier:'personal',paused:false}));
const get=p=>worker.fetch(new Request('https://w.example'+p,{headers:{origin:'https://perceptfolio.com'}}),env);
let fails=0; const t=(n,ok,x='')=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(ok?'':'   '+x)); if(!ok)fails++;};

let r=await get('/worldnews'); let j=await r.json();
t('world: refused without a live code', r.status===401, r.status+' '+JSON.stringify(j).slice(0,80));

r=await get('/worldnews?code=AAAAA-AAAAA'); j=await r.json();
t('world: returns headlines with a source and a time', r.status===200 && j.n>5 && j.items.every(i=>i.title&&i.url&&i.source), r.status+' n='+j.n);
t('world: the " - Source" suffix is stripped from titles', j.items.every(i=>!/\s-\s[A-Z][\w .]{2,30}$/.test(i.title)), JSON.stringify(j.items.slice(0,2).map(i=>i.title)));
console.log('   sample:', j.items.slice(0,3).map(i=>i.source+': '+i.title.slice(0,46)).join('\n           '));

r=await get('/worldnews?code=AAAAA-AAAAA'); j=await r.json();
t('world: the second ask inside the half hour is cached', j.cached===true);

r=await get('/worldnews?code=AAAAA-AAAAA&country=Nigeria'); j=await r.json();
const named=j.items.filter(i=>/nigeria/i.test(i.title)).length;
t('country: returns coverage and puts the ones naming it first', r.status===200 && j.n>5 && /nigeria/i.test(j.items[0].title), 'first='+(j.items[0]||{}).title);
t('country: most of the page names the country', named >= Math.min(8, j.n*0.5), named+' of '+j.n);
console.log('   sample:', j.items.slice(0,3).map(i=>i.source+': '+i.title.slice(0,46)).join('\n           '));

r=await get('/worldnews?code=AAAAA-AAAAA&country=%3Cscript%3E'); j=await r.json();
t('country: a junk name is scrubbed, not passed through', r.status===200 && !/[<>]/.test(JSON.stringify(j.country||'')));
console.log(fails?'\n'+fails+' FAILED':'\nALL WORLD NEWS CHECKS PASSED');
process.exit(fails?1:0);
