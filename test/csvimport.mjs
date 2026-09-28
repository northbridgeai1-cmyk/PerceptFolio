import fs from 'fs';
const s=fs.readFileSync(new URL('../terminal/index.html',import.meta.url),'utf8');
// lift the parser out and exercise it on three real broker header styles
const pick=n=>{const i=s.indexOf('function '+n);const j=s.indexOf('\n}',i);return s.slice(i,j+2);};
const src=['CSV_ALIASES','csvSplit','csvNum','csvDate','csvSide'].map(n=>n==='CSV_ALIASES'
  ? s.slice(s.indexOf('const CSV_ALIASES'), s.indexOf('};', s.indexOf('const CSV_ALIASES'))+2) : pick(n)).join('\n');
const f=new Function(src+'; return {csvSplit,csvNum,csvDate,csvSide,CSV_ALIASES};')();
let fails=0; const t=(n,ok,x='')=>{console.log((ok?'  PASS  ':'  FAIL  ')+n+(ok?'':'  '+x));if(!ok)fails++;};
t('a quoted comma does not split the row', JSON.stringify(f.csvSplit('2026-01-02,"Apple, Inc.",AAPL,10'))==='["2026-01-02","Apple, Inc.","AAPL","10"]');
t('money is parsed past $ and commas', f.csvNum('$1,234.56')===1234.56);
t('a bracketed negative is negative', f.csvNum('(500.00)')===-500);
t('US dates become ISO', f.csvDate('01/15/2026')==='2026-01-15' && f.csvDate('2026-01-15')==='2026-01-15');
t('a side inside a description is found', f.csvSide('YOU BOUGHT 10 AAPL')==='buy' && f.csvSide('Sold 5 MSFT')==='sell');
t('a plain action column is found', f.csvSide('Buy')==='buy' && f.csvSide('SELL')==='sell');
t('Schwab, Fidelity and IBKR headers all resolve',
  ['symbol','ticker','symbol/cusip'].every(h=>f.CSV_ALIASES.sym.includes(h)) &&
  ['quantity','shares','qty'].every(h=>f.CSV_ALIASES.qty.includes(h)) &&
  ['run date','trade date','activity date'].every(h=>f.CSV_ALIASES.date.includes(h)));
console.log(fails?'\n'+fails+' FAILED':'\nALL CSV PARSE CHECKS PASSED');
process.exit(fails?1:0);
