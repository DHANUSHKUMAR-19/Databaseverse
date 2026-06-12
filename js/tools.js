/**
 * js/tools.js — 6 Developer Tools
 * 1. Schema Designer   2. Connection String Builder
 * 3. Regex Tester      4. JSON Path Tester
 * 5. Data Type Cheatsheet  6. Index Advisor
 */
'use strict';
import { copyText, showToast } from './nav.js';

/* ── TOOL NAV ── */
export function initToolNav() {
  document.querySelectorAll('.tool-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tool-panel').forEach(p => p.classList.toggle('active', p.id === btn.dataset.tool));
    });
  });
}

/* ════════════════════════════════
   1. SCHEMA DESIGNER
════════════════════════════════ */
const TYPES = ['SERIAL','INTEGER','BIGINT','SMALLINT','FLOAT','DECIMAL(10,2)','VARCHAR(255)','TEXT','CHAR(10)','BOOLEAN','DATE','TIMESTAMP','TIMESTAMPTZ','UUID','JSON','JSONB','BYTEA','ARRAY'];
const DEFAULTS = [
  { name:'id',         type:'SERIAL',      pk:true,  nn:true,  uq:false },
  { name:'name',       type:'VARCHAR(255)', pk:false, nn:true,  uq:false },
  { name:'email',      type:'VARCHAR(255)', pk:false, nn:true,  uq:true  },
  { name:'created_at', type:'TIMESTAMP',    pk:false, nn:false, uq:false },
];

function fieldRow(f={}, i=Date.now()) {
  const opts = TYPES.map(t=>`<option${f.type===t?' selected':''}>${t}</option>`).join('');
  return `<div class="schema-row" data-idx="${i}">
    <input class="field-input sf-name" type="text" placeholder="column_name" value="${f.name||''}" oninput="window.genDDL()" style="flex:1"/>
    <select class="field-select sf-type" onchange="window.genDDL()" style="width:140px;flex-shrink:0">${opts}</select>
    <label class="schema-check" title="Primary Key"><input type="checkbox" class="sf-pk" ${f.pk?'checked':''} onchange="window.genDDL()"> PK</label>
    <label class="schema-check" title="Not Null">   <input type="checkbox" class="sf-nn" ${f.nn?'checked':''} onchange="window.genDDL()"> NN</label>
    <label class="schema-check" title="Unique">     <input type="checkbox" class="sf-uq" ${f.uq?'checked':''} onchange="window.genDDL()"> UQ</label>
    <button class="btn btn-sm btn-danger" onclick="window.removeField(this)" title="Remove">&#10005;</button>
  </div>`;
}

export function initSchemaDesigner() {
  const c = document.getElementById('schFields');
  if (!c) return;
  c.innerHTML = DEFAULTS.map((f,i) => fieldRow(f,i)).join('');
  genDDL();
  document.getElementById('schTable')?.addEventListener('input', genDDL);
  document.getElementById('schDialect')?.addEventListener('change', genDDL);
  document.getElementById('schIne')?.addEventListener('change', genDDL);
  document.getElementById('schTs')?.addEventListener('change', () => { syncTs(); genDDL(); });
}

function syncTs() {
  const c = document.getElementById('schFields'); if (!c) return;
  const names = [...c.querySelectorAll('.sf-name')].map(x=>x.value.trim());
  if (!names.includes('created_at')) c.insertAdjacentHTML('beforeend', fieldRow({name:'created_at',type:'TIMESTAMP',nn:false,pk:false,uq:false}));
  if (!names.includes('updated_at')) c.insertAdjacentHTML('beforeend', fieldRow({name:'updated_at',type:'TIMESTAMP',nn:false,pk:false,uq:false}));
}

window.addField = () => { document.getElementById('schFields')?.insertAdjacentHTML('beforeend', fieldRow()); genDDL(); };
window.removeField = btn => { if (document.querySelectorAll('.schema-row').length > 1) { btn.closest('.schema-row').remove(); genDDL(); } };

window.genDDL = function genDDL() {
  const tbl = (document.getElementById('schTable')?.value||'').trim() || 'my_table';
  const dlc = document.getElementById('schDialect')?.value || 'postgres';
  const ine = document.getElementById('schIne')?.checked;
  const rows = [...document.querySelectorAll('.schema-row')];
  const fields = [], pks = [];
  rows.forEach(row => {
    const name = row.querySelector('.sf-name')?.value.trim(); if (!name) return;
    let type = row.querySelector('.sf-type')?.value || 'TEXT';
    const pk=row.querySelector('.sf-pk')?.checked, nn=row.querySelector('.sf-nn')?.checked, uq=row.querySelector('.sf-uq')?.checked;
    if (dlc==='mysql')  { if(type==='SERIAL')type='INT AUTO_INCREMENT'; if(type==='BOOLEAN')type='TINYINT(1)'; if(type==='JSONB')type='JSON'; if(type==='TIMESTAMPTZ')type='TIMESTAMP'; if(type==='UUID')type='CHAR(36)'; }
    if (dlc==='sqlite') { if(type==='SERIAL')type='INTEGER'; if(type.startsWith('VARCHAR')||type.startsWith('CHAR'))type='TEXT'; if(type==='DECIMAL(10,2)'||type==='FLOAT')type='REAL'; if(type.includes('TIMESTAMP'))type='TEXT'; if(type==='JSONB'||type==='JSON')type='TEXT'; if(type==='UUID')type='TEXT'; if(type==='BYTEA')type='BLOB'; }
    let line = `  ${name.padEnd(22)}${type}`;
    if (pk && rows.length > 1) pks.push(name); else if (pk) line += ' PRIMARY KEY';
    if (nn) line += ' NOT NULL';
    if (uq) line += ' UNIQUE';
    if (name==='created_at'&&type.includes('TIMESTAMP')) line += dlc==='sqlite' ? ' DEFAULT CURRENT_TIMESTAMP' : ' DEFAULT NOW()';
    if (name==='id'&&type==='UUID'&&dlc==='postgres') line += ' DEFAULT gen_random_uuid()';
    fields.push(line);
  });
  if (pks.length > 1) fields.push(`  PRIMARY KEY (${pks.join(', ')})`);
  const kw=s=>`<span class="t-kw">${s}</span>`, fn=s=>`<span class="t-fn">${s}</span>`, cm=s=>`<span class="t-cm">${s}</span>`, st=s=>`<span class="t-str">${s}</span>`;
  let ddl = `${ine?kw('CREATE TABLE IF NOT EXISTS'):kw('CREATE TABLE')} ${tbl} (\n${fields.join(',\n')}\n);\n`;
  if (dlc==='postgres' && fields.some(f=>f.includes('updated_at'))) {
    ddl += `\n${cm('-- Auto-update trigger')}\n${kw('CREATE OR REPLACE FUNCTION')} ${fn('set_updated_at')}()\n${kw('RETURNS TRIGGER AS')} $$\n${kw('BEGIN')}\n  NEW.updated_at = ${fn('NOW')}();\n  ${kw('RETURN')} NEW;\n${kw('END')}; $$ ${kw('LANGUAGE')} plpgsql;\n\n${kw('CREATE TRIGGER')} ${tbl}_updated_at\n  ${kw('BEFORE UPDATE ON')} ${tbl}\n  ${kw('FOR EACH ROW EXECUTE FUNCTION')} ${fn('set_updated_at')}();\n`;
  }
  const userCols = [...document.querySelectorAll('.schema-row')].map(r=>r.querySelector('.sf-name')?.value.trim()).filter(n=>n&&n!=='id'&&!n.endsWith('_at'));
  if (userCols.length) ddl += `\n${cm('-- Example INSERT')}\n${kw('INSERT INTO')} ${tbl} (${userCols.join(', ')})\n${kw('VALUES')} (${userCols.map(()=>st("'value'")).join(', ')});\n\n${kw('SELECT')} * ${kw('FROM')} ${tbl};`;
  const pre = document.getElementById('schemaOutput'); if (pre) pre.innerHTML = ddl;
};

window.copyDDL = () => { const el=document.getElementById('schemaOutput'); const btn=document.getElementById('copyDDLBtn'); if(el) copyText(el.innerText, btn); };

/* ════════════════════════════════
   2. CONNECTION STRING BUILDER
════════════════════════════════ */
const CONN_DEF = {
  postgres: { port:'5432', user:'postgres',  pass:'password' },
  mysql:    { port:'3306', user:'root',       pass:'password' },
  mongodb:  { port:'27017',user:'admin',      pass:'password' },
  redis:    { port:'6379', user:'',           pass:''         },
  mssql:    { port:'1433', user:'sa',         pass:'password' },
};

export function initConnBuilder() {
  const dbSel = document.getElementById('connDB'); if (!dbSel) return;
  dbSel.addEventListener('change', () => {
    const def = CONN_DEF[dbSel.value] || CONN_DEF.postgres;
    document.getElementById('connPort').value = def.port;
    document.getElementById('connUser').value = def.user;
    document.getElementById('connPass').value = def.pass;
    buildConn(); updateSnippets();
  });
  ['connDB','connHost','connPort','connName','connUser','connPass','connSSL'].forEach(id => {
    document.getElementById(id)?.addEventListener('input',  buildConn);
    document.getElementById(id)?.addEventListener('change', buildConn);
  });
  buildConn(); updateSnippets();
}

window.buildConn = function buildConn() {
  const db   = document.getElementById('connDB')?.value   || 'postgres';
  const host = document.getElementById('connHost')?.value || 'localhost';
  const port = document.getElementById('connPort')?.value || '5432';
  const name = document.getElementById('connName')?.value || 'mydb';
  const user = document.getElementById('connUser')?.value || '';
  const pass = document.getElementById('connPass')?.value || '';
  const ssl  = document.getElementById('connSSL')?.checked;
  const auth = user ? (pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : `${encodeURIComponent(user)}@`) : '';
  const sslQ = ssl ? '?sslmode=require' : '';
  let str = '';
  switch(db) {
    case 'postgres': str=`postgresql://${auth}${host}:${port}/${name}${sslQ}`; break;
    case 'mysql':    str=`mysql://${auth}${host}:${port}/${name}${sslQ}`; break;
    case 'mongodb':  str=`mongodb://${auth}${host}:${port}/${name}${ssl?'?tls=true':''}`; break;
    case 'redis':    str=pass?`redis://:${encodeURIComponent(pass)}@${host}:${port}/${name}`:`redis://${host}:${port}/${name}`; break;
    case 'mssql':    str=`Server=${host},${port};Database=${name};User Id=${user};Password=${pass};${ssl?'Encrypt=True;':''}TrustServerCertificate=False;`; break;
  }
  const d = document.getElementById('connDisplay'); if(d) d.textContent = str;
  updateSnippets();
};

window.copyConn = () => { copyText(document.getElementById('connDisplay')?.textContent||''); };

function updateSnippets() {
  const str = document.getElementById('connDisplay')?.textContent || '';
  const db  = document.getElementById('connDB')?.value || 'postgres';
  const el  = document.getElementById('connSnippets'); if (!el) return;
  const map = {
    postgres: [['Python (psycopg2)',`conn = psycopg2.connect("${str}")`],['Node.js (pg)',`new Pool({ connectionString: "${str}" })`],['Prisma (.env)',`DATABASE_URL="${str}"`]],
    mysql:    [['Python (mysql-connector)',`mysql.connector.connect(host="...", user="...", password="...", database="...")`],['Node.js (mysql2)',`mysql.createPool({ uri: "${str}" })`],['Prisma (.env)',`DATABASE_URL="${str}"`]],
    mongodb:  [['Python (pymongo)',`MongoClient("${str}")`],['Node.js (mongoose)',`mongoose.connect("${str}")`],['Node.js (driver)',`new MongoClient("${str}")`]],
    redis:    [['Python (redis-py)',`redis.from_url("${str}")`],['Node.js (ioredis)',`new Redis("${str}")`],['Node.js (node-redis)',`redis.createClient({ url: "${str}" })`]],
    mssql:    [['Python (pyodbc)',`pyodbc.connect("DRIVER={ODBC Driver 18 for SQL Server};SERVER=...;DATABASE=...;UID=...;PWD=...")`],['Node.js (mssql)',`const pool = await sql.connect("${str}")`]],
  };
  el.innerHTML = (map[db]||[]).map(([label,code])=>`<div class="conn-snippet-item"><b>${label}</b><br/>${code}</div>`).join('');
}

/* ════════════════════════════════
   3. REGEX TESTER
════════════════════════════════ */
export function initRegexTester() {
  const p=document.getElementById('regexPattern'), f=document.getElementById('regexFlags'), t=document.getElementById('regexTest');
  if (!p||!t) return;
  [p,f,t].forEach(el => el?.addEventListener('input', testRegex));
}

window.testRegex = function testRegex() {
  const pattern = document.getElementById('regexPattern')?.value||'';
  const flags   = (document.getElementById('regexFlags')?.value||'g').replace(/[^gimsuy]/g,'');
  const test    = document.getElementById('regexTest')?.value||'';
  const hlEl    = document.getElementById('regexHighlight');
  const statEl  = document.getElementById('regexStats');
  const matchEl = document.getElementById('regexMatches');
  if (!hlEl) return;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (!pattern) { hlEl.innerHTML=esc(test); if(statEl)statEl.textContent=''; if(matchEl)matchEl.innerHTML=''; return; }
  try {
    const re = new RegExp(pattern, flags.includes('g')?flags:flags+'g');
    const matches = [...test.matchAll(re)];
    let hl='', last=0;
    matches.forEach(m => { hl+=esc(test.slice(last,m.index)); hl+=`<mark class="regex-match">${esc(m[0])}</mark>`; last=m.index+m[0].length; });
    hl += esc(test.slice(last));
    hlEl.innerHTML = hl || esc(test);
    if (statEl) statEl.textContent = `${matches.length} match${matches.length!==1?'es':''}`;
    if (matchEl) matchEl.innerHTML = matches.slice(0,20).map((m,i)=>`<div class="regex-match-row">[${i}] index:${m.index} &nbsp; "${esc(m[0])}"${m.length>1?` &nbsp; groups: [${m.slice(1).map(g=>`"${esc(g||'')}"`).join(', ')}]`:''}</div>`).join('');
  } catch(e) {
    hlEl.innerHTML = `<span style="color:var(--red)">${esc(e.message)}</span>`;
    if (statEl) statEl.textContent = '';
  }
};

window.setRegex = (p, f) => {
  const pe=document.getElementById('regexPattern'), fe=document.getElementById('regexFlags');
  if (pe) pe.value=p; if (fe&&f) fe.value=f; testRegex();
};

/* ════════════════════════════════
   4. JSON PATH TESTER
════════════════════════════════ */
const DEFAULT_JSON = JSON.stringify({
  users:[
    {id:1,name:'Alice',role:'admin',scores:[95,88,92]},
    {id:2,name:'Bob',  role:'user', scores:[72,80,78]},
    {id:3,name:'Carol',role:'admin',scores:[88,91,95]},
  ],
  meta:{total:3,version:'2.0'}
},null,2);

export function initJsonPath() {
  const ji=document.getElementById('jsonInput'), pi=document.getElementById('jsonPath');
  if (!ji||!pi) return;
  ji.value = DEFAULT_JSON; renderJsonHL(); ji.addEventListener('input', renderJsonHL); pi.addEventListener('input', evalPath);
}

window.renderJsonHL = function renderJsonHL() {
  const ji=document.getElementById('jsonInput'), jd=document.getElementById('jsonDisplay');
  if (!ji||!jd) return;
  try { jd.innerHTML = hlJSON(JSON.parse(ji.value)); } catch(e) { jd.innerHTML=`<span style="color:var(--red)">Invalid JSON: ${e.message}</span>`; }
  evalPath();
};

window.evalPath = function evalPath() {
  const ji=document.getElementById('jsonInput'), pi=document.getElementById('jsonPath'), out=document.getElementById('jsonPathResult');
  if (!out||!pi.value.trim()) { if(out)out.innerHTML=''; return; }
  try {
    const data=JSON.parse(ji.value), res=runPath(data, pi.value.trim());
    out.innerHTML = `<pre class="json-output">${hlJSON(res)}</pre><div class="result-meta">${Array.isArray(res)?res.length+' items':typeof res}</div>`;
  } catch(e) { out.innerHTML=`<div class="result-err">${e.message}</div>`; }
};

window.setJsonPath = p => { const el=document.getElementById('jsonPath'); if(el){el.value=p;evalPath();} };

function runPath(data, path) {
  if (path==='$'||path==='') return data;
  if (path.startsWith('..')) { const k=path.slice(2).split(/[.\[]/)[0]; return deepScan(data,k); }
  const segs = tokPath(path.replace(/^\$\.?/,''));
  let cur = data;
  for (const seg of segs) {
    if (cur===null||cur===undefined) return null;
    if (seg==='*') { cur=Array.isArray(cur)?cur:Object.values(cur); continue; }
    if (seg.startsWith('[')&&seg.endsWith(']')) {
      const inner=seg.slice(1,-1);
      if (inner==='*') { cur=Array.isArray(cur)?cur:Object.values(cur); }
      else if (inner.includes(':')) { const [s,e]=inner.split(':').map(n=>n===''?undefined:parseInt(n)); cur=Array.isArray(cur)?cur.slice(s,e):null; }
      else if (inner.startsWith('?')) {
        const fm=inner.match(/\?\(@\.(\w+)\s*(==|!=|>|<|>=|<=)\s*"?([^")\s]+)"?\)/);
        if (fm&&Array.isArray(cur)) { const [,k,op,v]=fm; cur=cur.filter(item=>{const val=item[k]; if(op==='==')return String(val)===v; if(op==='!=')return String(val)!==v; if(op==='>') return parseFloat(val)>parseFloat(v); if(op==='<') return parseFloat(val)<parseFloat(v); return true;}); }
      } else { const idx=parseInt(inner); cur=Array.isArray(cur)?cur[idx<0?cur.length+idx:idx]:null; }
    } else if (seg==='length') { return Array.isArray(cur)?cur.length:typeof cur==='string'?cur.length:Object.keys(cur||{}).length; }
    else if (Array.isArray(cur)) { cur=cur.map(item=>item?.[seg]).filter(v=>v!==undefined); if(!cur.length)return undefined; if(cur.length===1)cur=cur[0]; }
    else cur=cur[seg];
  }
  return cur;
}

function tokPath(path) {
  const segs=[]; let buf='';
  for (let i=0;i<path.length;i++) {
    const ch=path[i];
    if (ch==='.') { if(buf){segs.push(buf);buf='';} }
    else if (ch==='[') { if(buf){segs.push(buf);buf='';} let b='['; i++; let d=1; while(i<path.length&&d>0){if(path[i]==='[')d++;if(path[i]===']')d--;if(d>0)b+=path[i];i++;} i--; segs.push(b+']'); }
    else buf+=ch;
  }
  if(buf) segs.push(buf); return segs;
}

function deepScan(obj, key) {
  const res=[]; const sc=(n)=>{ if(Array.isArray(n))n.forEach(sc); else if(n&&typeof n==='object'){if(key in n)res.push(n[key]); Object.values(n).forEach(sc);} }; sc(obj); return res;
}

function hlJSON(obj) {
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc(JSON.stringify(obj,null,2))
    .replace(/"([^"]+)":/g,'<span class="j-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g,': <span class="j-str">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g,': <span class="j-num">$1</span>')
    .replace(/: (true|false)/g,': <span class="j-bool">$1</span>')
    .replace(/: null/g,': <span class="j-null">null</span>');
}

/* ════════════════════════════════
   5. DATA TYPES
════════════════════════════════ */
const DT = {
  postgres: [
    {type:'SMALLINT',     range:'-32,768 to 32,767',     bytes:'2',   note:'16-bit integer'},
    {type:'INTEGER',      range:'-2.1B to 2.1B',         bytes:'4',   note:'32-bit integer, most common'},
    {type:'BIGINT',       range:'-9.2E18 to 9.2E18',     bytes:'8',   note:'64-bit integer'},
    {type:'SERIAL',       range:'1 to 2.1B',             bytes:'4',   note:'Auto-increment INTEGER'},
    {type:'BIGSERIAL',    range:'1 to 9.2E18',           bytes:'8',   note:'Auto-increment BIGINT'},
    {type:'DECIMAL(p,s)', range:'Up to 131072 digits',   bytes:'var', note:'Exact numeric — use for money'},
    {type:'REAL',         range:'6 decimal digits',      bytes:'4',   note:'Imprecise floating point'},
    {type:'DOUBLE PRECISION',range:'15 decimal digits',  bytes:'8',   note:'Higher precision float'},
    {type:'VARCHAR(n)',   range:'Up to n chars',         bytes:'n+4', note:'Variable-length with limit'},
    {type:'TEXT',         range:'Unlimited',             bytes:'var', note:'Unlimited string — preferred in PG'},
    {type:'BOOLEAN',      range:'TRUE / FALSE / NULL',   bytes:'1',   note:''},
    {type:'DATE',         range:'4713 BC to 294276 AD',  bytes:'4',   note:'Date only (no time)'},
    {type:'TIMESTAMP',    range:'Microsecond precision', bytes:'8',   note:'Date + time, no timezone'},
    {type:'TIMESTAMPTZ',  range:'Microsecond precision', bytes:'8',   note:'Date + time WITH timezone — recommended'},
    {type:'UUID',         range:'128-bit',               bytes:'16',  note:'Use gen_random_uuid() as default'},
    {type:'JSONB',        range:'Unlimited',             bytes:'var', note:'Binary JSON — indexable. Prefer over JSON'},
    {type:'JSON',         range:'Unlimited',             bytes:'var', note:'Raw text JSON — no GIN index'},
    {type:'ARRAY',        range:'N-dimensional',         bytes:'var', note:'e.g. INTEGER[], TEXT[]'},
    {type:'BYTEA',        range:'Unlimited binary',      bytes:'var', note:'Raw binary / file storage'},
    {type:'INET',         range:'IPv4 or IPv6',          bytes:'7+',  note:'Supports subnet operations'},
  ],
  mysql: [
    {type:'TINYINT',      range:'-128 to 127',           bytes:'1',   note:'UNSIGNED: 0–255'},
    {type:'SMALLINT',     range:'-32,768 to 32,767',     bytes:'2',   note:''},
    {type:'MEDIUMINT',    range:'-8.4M to 8.4M',         bytes:'3',   note:''},
    {type:'INT',          range:'-2.1B to 2.1B',         bytes:'4',   note:'Most common integer type'},
    {type:'BIGINT',       range:'-9.2E18 to 9.2E18',     bytes:'8',   note:''},
    {type:'DECIMAL(p,s)', range:'Up to 65 digits',       bytes:'var', note:'Exact — use for currency'},
    {type:'FLOAT',        range:'~7 decimal digits',     bytes:'4',   note:'Imprecise'},
    {type:'DOUBLE',       range:'~15 decimal digits',    bytes:'8',   note:''},
    {type:'VARCHAR(n)',   range:'Up to 65,535 bytes',    bytes:'n+2', note:'Row limit: 65,535 bytes total'},
    {type:'TEXT',         range:'Up to 65,535 bytes',    bytes:'var', note:'Cannot have DEFAULT value'},
    {type:'MEDIUMTEXT',   range:'Up to 16MB',            bytes:'var', note:''},
    {type:'LONGTEXT',     range:'Up to 4GB',             bytes:'var', note:''},
    {type:'TINYINT(1)',   range:'0 or 1',                bytes:'1',   note:'MySQL convention for BOOLEAN'},
    {type:'DATE',         range:'1000-01-01 to 9999-12-31',bytes:'3', note:'No time component'},
    {type:'DATETIME',     range:'1000-01-01 to 9999-12-31',bytes:'8', note:'No timezone info'},
    {type:'TIMESTAMP',    range:'1970-01-01 to 2038-01-19',bytes:'4', note:'Stored UTC — 2038 problem!'},
    {type:'JSON',         range:'Up to 1GB',             bytes:'var', note:'Stored as binary; no GIN index'},
    {type:'ENUM',         range:'Up to 65,535 values',   bytes:'1-2', note:'Fixed set of allowed strings'},
  ],
  sqlite: [
    {type:'NULL',         range:'NULL value',            bytes:'var', note:'SQLite storage class'},
    {type:'INTEGER',      range:'-9.2E18 to 9.2E18',    bytes:'1–8', note:'Signed integer, variable storage'},
    {type:'REAL',         range:'8-byte IEEE float',     bytes:'8',   note:'Floating point'},
    {type:'TEXT',         range:'Unlimited UTF-8/16',    bytes:'var', note:'All string types map to TEXT'},
    {type:'BLOB',         range:'Unlimited binary',      bytes:'var', note:'Stored exactly as input'},
    {type:'BOOLEAN',      range:'0 or 1',               bytes:'1',   note:'Stored as INTEGER'},
    {type:'DATE',         range:'Any ISO format text',  bytes:'var', note:'Stored as TEXT "YYYY-MM-DD"'},
    {type:'DATETIME',     range:'Any ISO format text',  bytes:'var', note:'No dedicated date type in SQLite'},
  ],
};

export function initDataTypes() {
  renderDT('postgres');
  document.querySelectorAll('.dt-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.dt-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
      renderDT(t.dataset.dialect);
    });
  });
}

function renderDT(dialect) {
  const el = document.getElementById('dtTable'); if (!el) return;
  el.innerHTML = `<table class="dt-table"><thead><tr><th>Type</th><th>Range / Size</th><th>Storage</th><th>Notes</th></tr></thead><tbody>
    ${(DT[dialect]||[]).map(r=>`<tr><td class="dt-type">${r.type}</td><td class="dt-range">${r.range}</td><td class="dt-range">${r.bytes} bytes</td><td class="dt-note">${r.note}</td></tr>`).join('')}
  </tbody></table>`;
}

/* ════════════════════════════════
   6. INDEX ADVISOR
════════════════════════════════ */
export function initIndexAdvisor() {
  document.getElementById('advBtn')?.addEventListener('click', runAdvisor);
}

window.runAdvisor = function runAdvisor() {
  const q=document.getElementById('advQuery')?.value.trim()||'', tbl=document.getElementById('advTable')?.value.trim()||'table', dlc=document.getElementById('advDialect')?.value||'postgres', out=document.getElementById('advResult');
  if (!out||!q) return;
  const recs=[], warns=[], infos=[];
  const whereM=q.match(/WHERE\s+([\s\S]+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|;|$)/i);
  if (whereM) { const cols=[...whereM[1].matchAll(/\b(\w+)\s*(?:=|!=|>|<|>=|<=|LIKE|IN|BETWEEN)/gi)].map(m=>m[1]); if(cols.length) recs.push(`CREATE INDEX idx_${tbl}_${cols.join('_')} ON ${tbl} (${cols.join(', ')});`); }
  const orderM=q.match(/ORDER BY\s+([\w\s,]+)/i);
  if (orderM) { const cols=orderM[1].trim().split(',').map(c=>c.trim().split(/\s+/)[0]); infos.push(`Add ${cols.join(', ')} as trailing columns to your index for sort coverage.`); }
  if (/SELECT \*/i.test(q)) warns.push('Avoid SELECT * — select only needed columns to enable covering indexes.');
  if (/LIKE\s+'%/i.test(q)) warns.push("LIKE '%...' leading wildcard cannot use a B-Tree index. Consider full-text search.");
  if (!whereM) warns.push('No WHERE clause — potential full table scan.');
  const joinM=[...q.matchAll(/JOIN\s+(\w+)\s+(?:\w+\s+)?ON\s+([\w.]+)\s*=\s*([\w.]+)/gi)];
  joinM.forEach(m=>{ const col=m[2].split('.').pop(); recs.push(`CREATE INDEX idx_${m[1]}_${col} ON ${m[1]} (${col});`); });
  if (/WHERE\s+\w+\s*=\s*'[^']+'/i.test(q)) { const cm=q.match(/WHERE\s+(\w+)\s*=\s*'([^']+)'/i); if(cm) infos.push(`Partial index opportunity: CREATE INDEX idx_${tbl}_partial ON ${tbl} (${cm[1]}) WHERE ${cm[1]} = '${cm[2]}';`); }
  if (!recs.length&&!warns.length) infos.push('No obvious issues found. Query looks reasonable.');
  const sec=(title,items,cls)=>items.length?`<div class="adv-section-title">${title}</div>${items.map(i=>`<div class="${cls}">${cls.includes('rec')?'&#10003;':cls.includes('warn')?'&#9888;':'&#8505;'} ${i.includes(';')?`<span class="adv-sql">${i}</span>`:i}</div>`).join('')}`:'';
  out.innerHTML = sec('Recommended Indexes',recs,'adv-rec') + sec('Warnings',warns,'adv-warn') + sec('Tips',infos,'adv-info') || '<div class="adv-info">Enter a SQL query to analyze.</div>';
};
