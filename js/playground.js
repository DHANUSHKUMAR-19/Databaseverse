/**
 * js/playground.js
 * SQL: real SQLite via sql.js (WebAssembly)
 * MongoDB: in-memory document store + aggregation pipeline
 * Redis: full command interpreter with all 5 data structures
 */
'use strict';
import { showToast, copyText } from './nav.js';

/* ─── shared state ─── */
let activeEngine = 'sql';
const history = [];

/* ══════════════════════════════════════════════════
   1. SQL ENGINE (sql.js — real SQLite WASM)
══════════════════════════════════════════════════ */
let sqlDB = null;

const SQL_SEED = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user', country TEXT, salary INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  product TEXT, amount REAL, status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, price REAL, category TEXT, stock INTEGER DEFAULT 0
);
INSERT INTO users (name,email,role,country,salary) VALUES
  ('Alice Chen','alice@corp.com','admin','US',120000),
  ('Bob Kumar','bob@corp.com','engineer','IN',95000),
  ('Carol Smith','carol@corp.com','engineer','UK',98000),
  ('David Lee','david@corp.com','designer','US',85000),
  ('Eva Müller','eva@corp.com','admin','DE',110000),
  ('Frank Okafor','frank@corp.com','engineer','NG',75000),
  ('Grace Tanaka','grace@corp.com','designer','JP',90000);
INSERT INTO orders (user_id,product,amount,status) VALUES
  (1,'Pro Plan',299,'completed'),(2,'Basic Plan',99,'completed'),
  (1,'Add-on',49,'completed'),(3,'Pro Plan',299,'pending'),
  (4,'Basic Plan',99,'completed'),(5,'Enterprise',999,'completed'),
  (2,'Pro Plan',299,'refunded'),(6,'Basic Plan',99,'completed');
INSERT INTO products (name,price,category,stock) VALUES
  ('Basic Plan',99,'subscription',999),('Pro Plan',299,'subscription',999),
  ('Enterprise',999,'subscription',999),('Add-on',49,'addon',500);`;

export const SQL_EG = {
  basic:    `SELECT * FROM users LIMIT 5;`,
  join:     `SELECT u.name, u.role, u.country,\n       COUNT(o.id)   AS orders,\n       SUM(o.amount) AS total_spent\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nGROUP BY u.id\nORDER BY total_spent DESC;`,
  window:   `SELECT name, salary, role,\n  RANK()   OVER (PARTITION BY role ORDER BY salary DESC) AS rank_in_role,\n  AVG(salary) OVER (PARTITION BY role)                 AS avg_for_role\nFROM users\nORDER BY role, rank_in_role;`,
  cte:      `WITH completed AS (\n  SELECT user_id, SUM(amount) AS total\n  FROM orders WHERE status = 'completed'\n  GROUP BY user_id\n)\nSELECT u.name, u.email, c.total\nFROM completed c\nJOIN users u ON u.id = c.user_id\nORDER BY c.total DESC;`,
  subquery: `SELECT name, salary,\n  ROUND(salary * 100.0 / (SELECT AVG(salary) FROM users), 1) AS pct_of_avg\nFROM users\nORDER BY pct_of_avg DESC;`,
  ddl:      `CREATE TABLE events (\n  id      INTEGER PRIMARY KEY AUTOINCREMENT,\n  user_id INTEGER,\n  action  TEXT,\n  ts      TEXT DEFAULT (datetime('now'))\n);\nINSERT INTO events (user_id,action)\nVALUES (1,'login'),(2,'signup'),(1,'purchase');\nSELECT * FROM events;`,
};

async function loadSql() {
  if (sqlDB) return sqlDB;
  setOutput('sql', `<div class="output-placeholder">&#9203; Loading SQLite engine (WebAssembly)...</div>`);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js';
    s.onload = async () => {
      try {
        const SQL = await window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
        sqlDB = new SQL.Database();
        sqlDB.run(SQL_SEED);
        setOutput('sql', `<div class="output-placeholder" style="color:var(--green)">&#10003; SQLite ready &mdash; tables: users, orders, products</div>`);
        resolve(sqlDB);
      } catch(e) {
        setOutput('sql', `<div class="result-err">Failed: ${e.message}</div>`);
        resolve(null);
      }
    };
    s.onerror = () => { setOutput('sql', `<div class="result-err">Could not load sql.js. Check connection.</div>`); resolve(null); };
    document.head.appendChild(s);
  });
}

export async function runSQL() {
  const q = getVal('sql').trim();
  if (!q) return;
  const db = await loadSql();
  if (!db) return;
  const t0 = performance.now();
  try {
    const stmts = splitSQL(q);
    let last = null;
    for (const s of stmts) {
      const u = s.toUpperCase().trim();
      if (!u) continue;
      if (u.startsWith('SELECT') || u.startsWith('WITH') || u.startsWith('EXPLAIN')) {
        const r = db.exec(s); last = r[0] || null;
      } else { db.run(s); last = { affected: true, verb: u.split(' ')[0] }; }
    }
    const ms = (performance.now() - t0).toFixed(2);
    addHist('sql', q, ms);
    if (!last)            { setExec('sql', ms, null, 'SQLite'); setOutput('sql', `<div class="result-ok">&#10003; Executed.</div>`); return; }
    if (last.affected)    { setExec('sql', ms, null, 'SQLite'); setOutput('sql', `<div class="result-ok">&#10003; ${last.verb} executed.</div>`); return; }
    const rows = last.values.map(v => Object.fromEntries(last.columns.map((c,i) => [c, v[i]])));
    setExec('sql', ms, rows.length, 'SQLite');
    setOutput('sql', renderTable(last.columns, rows));
  } catch(e) {
    setExec('sql', null, null, 'SQLite');
    setOutput('sql', `<div class="result-err">&#10007; ${esc(e.message)}</div>`);
  }
}

function splitSQL(q) {
  const out = []; let cur = '', inQ = false, qc = '';
  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    if (inQ) { cur += ch; if (ch === qc && q[i-1] !== '\\') inQ = false; }
    else if (ch === "'" || ch === '"') { inQ = true; qc = ch; cur += ch; }
    else if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* ══════════════════════════════════════════════════
   2. MONGODB SIMULATOR
══════════════════════════════════════════════════ */
const mongoDB = {
  users: [
    { _id:'u1', name:'Alice Chen',   email:'alice@corp.com', role:'admin',    country:'US', salary:120000, tags:['admin','superuser'] },
    { _id:'u2', name:'Bob Kumar',    email:'bob@corp.com',   role:'engineer', country:'IN', salary:95000,  tags:['backend'] },
    { _id:'u3', name:'Carol Smith',  email:'carol@corp.com', role:'engineer', country:'UK', salary:98000,  tags:['backend','devops'] },
    { _id:'u4', name:'David Lee',    email:'david@corp.com', role:'designer', country:'US', salary:85000,  tags:['frontend'] },
    { _id:'u5', name:'Eva Müller',   email:'eva@corp.com',   role:'admin',    country:'DE', salary:110000, tags:['admin'] },
    { _id:'u6', name:'Frank Okafor', email:'frank@corp.com', role:'engineer', country:'NG', salary:75000,  tags:['backend'] },
    { _id:'u7', name:'Grace Tanaka', email:'grace@corp.com', role:'designer', country:'JP', salary:90000,  tags:['frontend','ux'] },
  ],
  orders: [
    { _id:'o1', userId:'u1', product:'Pro Plan',   amount:299, status:'completed' },
    { _id:'o2', userId:'u2', product:'Basic Plan', amount:99,  status:'completed' },
    { _id:'o3', userId:'u1', product:'Add-on',     amount:49,  status:'completed' },
    { _id:'o4', userId:'u3', product:'Pro Plan',   amount:299, status:'pending'   },
    { _id:'o5', userId:'u4', product:'Basic Plan', amount:99,  status:'completed' },
    { _id:'o6', userId:'u5', product:'Enterprise', amount:999, status:'completed' },
    { _id:'o7', userId:'u2', product:'Pro Plan',   amount:299, status:'refunded'  },
    { _id:'o8', userId:'u6', product:'Basic Plan', amount:99,  status:'completed' },
  ],
};

export const MONGO_EG = {
  find:      `db.users.find(\n  { role: "engineer" },\n  { name: 1, email: 1, country: 1 }\n)`,
  filter:    `db.users.find(\n  { salary: { $gte: 95000 }, country: { $in: ["US","UK"] } }\n).sort({ salary: -1 }).limit(5)`,
  aggregate: `db.orders.aggregate([\n  { $match:  { status: "completed" } },\n  { $group:  { _id: "$userId", total: { $sum: "$amount" }, count: { $sum: 1 } } },\n  { $sort:   { total: -1 } }\n])`,
  update:    `db.users.updateMany(\n  { role: "engineer" },\n  { $set: { department: "Engineering" } }\n)`,
  insert:    `db.users.insertOne({\n  name: "Hiro Nakamura",\n  email: "hiro@corp.com",\n  role: "engineer",\n  country: "JP",\n  salary: 102000\n})`,
};

export function runMongo() {
  const q = getVal('mongo').trim();
  if (!q) return;
  const t0 = performance.now();
  try {
    const result = execMongo(q);
    const ms = (performance.now() - t0).toFixed(2);
    addHist('mongo', q, ms);
    setExec('mongo', ms, Array.isArray(result) ? result.length : null, 'MongoDB Sim');
    setOutput('mongo', renderMongo(result));
  } catch(e) {
    setOutput('mongo', `<div class="result-err">&#10007; ${esc(e.message)}</div>`);
  }
}

function execMongo(q) {
  const m = q.match(/db\.(\w+)\.(\w+)\(([\s\S]*)\)/);
  if (!m) throw new Error('Syntax: db.collection.method({...})');
  const [, colName, method, rawArgs] = m;
  if (!mongoDB[colName]) throw new Error(`Collection "${colName}" not found. Available: ${Object.keys(mongoDB).join(', ')}`);
  let docs = mongoDB[colName].map(d => ({...d}));

  const parse = str => { try { return JSON.parse(`[${str.trim().replace(/(\w+)\s*:/g,'"$1":').replace(/"\$(\w+)":/g,'"$$$1":')}]`); } catch { return [{}]; } };
  const args = parse(rawArgs);
  const filter = args[0] || {}, proj = args[1] || null;

  if (method === 'find' || method === 'findOne') {
    docs = mFilter(docs, filter);
    if (proj) docs = docs.map(d => mProject(d, proj));
    if (method === 'findOne') docs = docs.slice(0,1);
    const sortM = q.match(/\.sort\(\s*\{([^}]+)\}\s*\)/);
    if (sortM) { const [k, dir] = sortM[1].replace(/['"]/g,'').trim().split(':'); docs.sort((a,b)=>(a[k.trim()]>b[k.trim()]?1:-1)*(parseInt(dir)||1)); }
    const limM = q.match(/\.limit\(\s*(\d+)\s*\)/);
    if (limM) docs = docs.slice(0, parseInt(limM[1]));
    return docs;
  }
  if (method === 'aggregate') {
    const pm = rawArgs.match(/\[([\s\S]+)\]/);
    if (!pm) throw new Error('aggregate() expects array pipeline');
    return mPipeline(docs, pm[1]);
  }
  if (method === 'insertOne' || method === 'insertMany') {
    const doc = filter; if (!doc._id) doc._id = 'new_'+Date.now();
    mongoDB[colName].push(doc);
    return { acknowledged:true, insertedId:doc._id };
  }
  if (method === 'updateMany' || method === 'updateOne') {
    const upd = args[1]||{}, matched = mFilter(docs, filter);
    const targets = method === 'updateOne' ? matched.slice(0,1) : matched;
    targets.forEach(d => { const r = mongoDB[colName].find(x=>x._id===d._id); if(r){if(upd.$set)Object.assign(r,upd.$set);if(upd.$inc)Object.entries(upd.$inc).forEach(([k,v])=>{r[k]=(r[k]||0)+v;});} });
    return { acknowledged:true, matchedCount:matched.length, modifiedCount:targets.length };
  }
  if (method === 'deleteMany' || method === 'deleteOne') {
    const toDelete = mFilter(docs, filter); const ids = new Set((method==='deleteOne'?toDelete.slice(0,1):toDelete).map(d=>d._id));
    const before = mongoDB[colName].length; mongoDB[colName] = mongoDB[colName].filter(d=>!ids.has(d._id));
    return { acknowledged:true, deletedCount:before-mongoDB[colName].length };
  }
  if (method === 'countDocuments') return [{ count:mFilter(docs,filter).length }];
  if (method === 'distinct')       { const f=(rawArgs.match(/"(\w+)"/))||[,'_id']; return [...new Set(docs.map(d=>d[f[1]]))]; }
  throw new Error(`Method "${method}" not supported`);
}

function mFilter(docs, f) {
  if (!f||!Object.keys(f).length) return docs;
  return docs.filter(d => Object.entries(f).every(([k,v]) => {
    if (typeof v==='object'&&v!==null) {
      if (v.$eq!==undefined)  return d[k]==v.$eq;
      if (v.$ne!==undefined)  return d[k]!=v.$ne;
      if (v.$gt!==undefined)  return d[k]> v.$gt;
      if (v.$gte!==undefined) return d[k]>=v.$gte;
      if (v.$lt!==undefined)  return d[k]< v.$lt;
      if (v.$lte!==undefined) return d[k]<=v.$lte;
      if (v.$in!==undefined)  return v.$in.includes(d[k]);
      if (v.$nin!==undefined) return !v.$nin.includes(d[k]);
    }
    return d[k]==v;
  }));
}

function mProject(doc, proj) {
  const inc = Object.values(proj).some(v=>v===1);
  if (inc) { const o={_id:doc._id}; Object.keys(proj).forEach(k=>{if(proj[k]===1)o[k]=doc[k];}); return o; }
  const o={...doc}; Object.keys(proj).forEach(k=>{if(proj[k]===0)delete o[k];}); return o;
}

function mPipeline(docs, raw) {
  const re = /\{\s*\$(\w+)\s*:\s*([\s\S]+?)(?=\}\s*,\s*\{|\}\s*\]|$)/g;
  let m;
  while ((m = re.exec(raw+']')) !== null) {
    const [, op, rv] = m;
    try {
      const clean = rv.trim().replace(/\}\s*$/, '}').replace(/(\w+)\s*:/g,'"$1":').replace(/"\$(\w+)":/g,'"$$$1":');
      const val = JSON.parse(clean.endsWith('}')?clean:clean+'}');
      docs = mStage(docs, op, val);
    } catch {}
  }
  return docs;
}

function mStage(docs, op, val) {
  switch(op) {
    case 'match': return mFilter(docs, val);
    case 'limit': return docs.slice(0, val);
    case 'skip':  return docs.slice(val);
    case 'sort':  { const [f,d]=Object.entries(val)[0]; return [...docs].sort((a,b)=>(a[f]>b[f]?1:-1)*(d||1)); }
    case 'project': return docs.map(d=>mProject(d,val));
    case 'group': {
      const idF = val._id ? String(val._id).replace('$','') : null;
      const gs = {};
      docs.forEach(d => {
        const k = idF ? (d[idF]??'null') : 'all';
        if (!gs[k]) gs[k] = { _id:idF?d[idF]:null, _docs:[] };
        gs[k]._docs.push(d);
      });
      return Object.values(gs).map(g => {
        const a = { _id:g._id };
        Object.entries(val).forEach(([k,expr]) => {
          if (k==='_id') return;
          if (typeof expr==='object') {
            const [acc,field] = Object.entries(expr)[0];
            const fn = String(field).replace('$','');
            const nums = g._docs.map(d=>parseFloat(d[fn])||0);
            if (acc==='$sum') a[k] = typeof field==='number' ? field*g._docs.length : nums.reduce((s,n)=>s+n,0);
            if (acc==='$avg') a[k] = parseFloat((nums.reduce((s,n)=>s+n,0)/nums.length).toFixed(2));
            if (acc==='$max') a[k] = Math.max(...nums);
            if (acc==='$min') a[k] = Math.min(...nums);
            if (acc==='$count') a[k] = g._docs.length;
            if (acc==='$push') a[k] = g._docs.map(d=>d[fn]);
            if (acc==='$first') a[k] = g._docs[0]?.[fn];
          }
        });
        return a;
      });
    }
    default: return docs;
  }
}

function renderMongo(result) {
  if (!Array.isArray(result)) return `<pre class="json-output">${jsonHL(result)}</pre>`;
  if (!result.length) return `<div class="result-ok">No documents returned.</div>`;
  const cols = [...new Set(result.flatMap(d=>Object.keys(d)))];
  return renderTable(cols, result.map(d => Object.fromEntries(cols.map(k=>[k,d[k]]))), true);
}

/* ══════════════════════════════════════════════════
   3. REDIS SIMULATOR
══════════════════════════════════════════════════ */
const RS = {
  str:  { 'site:name':'DatabaseVerse', 'site:version':'2.0', 'counter:visits':'1042' },
  list: { 'queue:tasks':['task:3','task:2','task:1'], 'log:events':['login','signup','purchase'] },
  set:  { 'tags:postgres':new Set(['sql','acid','json','open-source']), 'tags:redis':new Set(['cache','fast','pub/sub']) },
  hash: { 'user:1':{name:'Alice Chen',role:'admin',score:'950'}, 'user:2':{name:'Bob Kumar',role:'engineer',score:'780'} },
  zset: { 'leaderboard':[['alice',9500],['bob',8800],['carol',8200],['david',7600]] },
  ttl:  {},
};

export const REDIS_EG = {
  strings:`SET user:session:abc "tok_xyz"\nEXPIRE user:session:abc 3600\nGET user:session:abc\nINCR counter:visits\nGET counter:visits\nKEYS *`,
  hashes: `HSET user:3 name "Grace" role "designer" score "890"\nHGETALL user:1\nHGET user:2 role\nHINCRBY user:1 score 50`,
  lists:  `LPUSH queue:tasks "task:4"\nLRANGE queue:tasks 0 -1\nRPOP queue:tasks\nLLEN queue:tasks`,
  sets:   `SADD tags:postgres "replication"\nSMEMBERS tags:postgres\nSISMEMBER tags:postgres "acid"\nSINTER tags:postgres tags:redis`,
  sorted: `ZADD leaderboard 9900 "eve"\nZREVRANGE leaderboard 0 4 WITHSCORES\nZSCORE leaderboard alice\nZRANK leaderboard bob`,
};

export function runRedis() {
  const raw = getVal('redis').trim();
  if (!raw) return;
  const t0 = performance.now();
  const lines = raw.split('\n').filter(l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('--'));
  const outs = [];
  for (const line of lines) {
    const parts = tokenize(line.trim());
    if (!parts.length) continue;
    const [cmd, ...args] = parts;
    try { outs.push({ line:line.trim(), r:execRedis(cmd.toUpperCase(), args) }); }
    catch(e) { outs.push({ line:line.trim(), r:{t:'err',v:e.message} }); }
  }
  const ms = (performance.now()-t0).toFixed(2);
  addHist('redis', raw, ms);
  setExec('redis', ms, outs.length, 'Redis Sim');
  setOutput('redis', renderRedis(outs));
}

function tokenize(line) {
  const t=[]; let cur='', inQ=false, qc='';
  for (const ch of line) {
    if (inQ) { if(ch===qc)inQ=false; else cur+=ch; }
    else if (ch==='"'||ch==="'") { inQ=true; qc=ch; }
    else if (ch===' '||ch==='\t') { if(cur){t.push(cur);cur='';} }
    else cur+=ch;
  }
  if (cur) t.push(cur);
  return t;
}

function execRedis(cmd, args) {
  const s=RS, [k,...rest]=args;
  switch(cmd) {
    case 'SET':    s.str[k]=rest[0]; return {t:'ok'};
    case 'GET':    return {t:'bulk',v:s.str[k]??null};
    case 'DEL':    { let n=0; args.forEach(k2=>{if(k2 in s.str){delete s.str[k2];n++;}}); return {t:'int',v:n}; }
    case 'EXISTS': return {t:'int',v:(k in s.str)?1:0};
    case 'INCR':   s.str[k]=String((parseInt(s.str[k]||'0')+1)); return {t:'int',v:parseInt(s.str[k])};
    case 'INCRBY': s.str[k]=String((parseInt(s.str[k]||'0')+parseInt(rest[0]||'1'))); return {t:'int',v:parseInt(s.str[k])};
    case 'DECR':   s.str[k]=String((parseInt(s.str[k]||'0')-1)); return {t:'int',v:parseInt(s.str[k])};
    case 'MSET':   for(let i=0;i<args.length;i+=2)s.str[args[i]]=args[i+1]; return {t:'ok'};
    case 'MGET':   return {t:'arr',v:args.map(x=>s.str[x]??null)};
    case 'SETEX':  s.str[k]=rest[1]; s.ttl[k]=Date.now()+parseInt(rest[0])*1000; return {t:'ok'};
    case 'EXPIRE': s.ttl[k]=Date.now()+parseInt(rest[0])*1000; return {t:'int',v:1};
    case 'TTL':    { const e=s.ttl[k]; return {t:'int',v:e?Math.round((e-Date.now())/1000):-1}; }
    case 'KEYS':   { const re=new RegExp('^'+(rest[0]||'*').replace(/\*/g,'.*')+'$'); return {t:'arr',v:Object.keys(s.str).filter(x=>re.test(x))}; }
    case 'TYPE':   { if(k in s.str)return{t:'bulk',v:'string'}; if(k in s.list)return{t:'bulk',v:'list'}; if(k in s.set)return{t:'bulk',v:'set'}; if(k in s.hash)return{t:'bulk',v:'hash'}; return{t:'bulk',v:'none'}; }
    case 'DBSIZE': return {t:'int',v:Object.keys(s.str).length+Object.keys(s.list).length+Object.keys(s.set).length+Object.keys(s.hash).length};
    case 'HSET':   { if(!s.hash[k])s.hash[k]={}; for(let i=0;i<rest.length;i+=2)s.hash[k][rest[i]]=rest[i+1]; return {t:'int',v:Math.floor(rest.length/2)}; }
    case 'HGET':   return {t:'bulk',v:s.hash[k]?.[rest[0]]??null};
    case 'HGETALL':{ const h=s.hash[k]; if(!h)return{t:'arr',v:[]}; const a=[]; Object.entries(h).forEach(([f,v])=>a.push(f,v)); return {t:'arr',v:a}; }
    case 'HKEYS':  return {t:'arr',v:Object.keys(s.hash[k]||{})};
    case 'HVALS':  return {t:'arr',v:Object.values(s.hash[k]||{})};
    case 'HDEL':   { let n=0; rest.forEach(f=>{if(s.hash[k]?.[f]!==undefined){delete s.hash[k][f];n++;}}); return {t:'int',v:n}; }
    case 'HEXISTS':return {t:'int',v:(rest[0] in (s.hash[k]||{}))?1:0};
    case 'HLEN':   return {t:'int',v:Object.keys(s.hash[k]||{}).length};
    case 'HINCRBY':{ if(!s.hash[k])s.hash[k]={}; s.hash[k][rest[0]]=String(parseInt(s.hash[k][rest[0]]||'0')+parseInt(rest[1]||'0')); return {t:'int',v:parseInt(s.hash[k][rest[0]])}; }
    case 'LPUSH':  { if(!s.list[k])s.list[k]=[]; rest.reverse().forEach(v=>s.list[k].unshift(v)); return {t:'int',v:s.list[k].length}; }
    case 'RPUSH':  { if(!s.list[k])s.list[k]=[]; rest.forEach(v=>s.list[k].push(v)); return {t:'int',v:s.list[k].length}; }
    case 'LPOP':   { const v=s.list[k]?.shift(); return {t:'bulk',v:v??null}; }
    case 'RPOP':   { const v=s.list[k]?.pop();   return {t:'bulk',v:v??null}; }
    case 'LRANGE': { const l=s.list[k]||[]; let st=parseInt(rest[0]),en=parseInt(rest[1]); if(en<0)en=l.length+en+1; return {t:'arr',v:l.slice(st,en+1)}; }
    case 'LLEN':   return {t:'int',v:(s.list[k]||[]).length};
    case 'SADD':   { if(!s.set[k])s.set[k]=new Set(); let n=0; rest.forEach(v=>{if(!s.set[k].has(v)){s.set[k].add(v);n++;}}); return {t:'int',v:n}; }
    case 'SMEMBERS':return {t:'arr',v:[...(s.set[k]||new Set())]};
    case 'SISMEMBER':return {t:'int',v:s.set[k]?.has(rest[0])?1:0};
    case 'SCARD':  return {t:'int',v:(s.set[k]||new Set()).size};
    case 'SREM':   { let n=0; rest.forEach(v=>{if(s.set[k]?.has(v)){s.set[k].delete(v);n++;}}); return {t:'int',v:n}; }
    case 'SUNION': { const u=new Set(); args.forEach(x=>(s.set[x]||new Set()).forEach(v=>u.add(v))); return {t:'arr',v:[...u]}; }
    case 'SINTER': { let i=[...(s.set[args[0]]||new Set())]; for(let j=1;j<args.length;j++)i=i.filter(v=>s.set[args[j]]?.has(v)); return {t:'arr',v:i}; }
    case 'SDIFF':  { let d=[...(s.set[args[0]]||new Set())]; for(let j=1;j<args.length;j++)d=d.filter(v=>!s.set[args[j]]?.has(v)); return {t:'arr',v:d}; }
    case 'ZADD':   { if(!s.zset[k])s.zset[k]=[]; let n=0; for(let i=0;i<rest.length;i+=2){const sc=parseFloat(rest[i]),mem=rest[i+1],ix=s.zset[k].findIndex(([m])=>m===mem); if(ix>=0)s.zset[k][ix][1]=sc;else{s.zset[k].push([mem,sc]);n++;}} s.zset[k].sort((a,b)=>a[1]-b[1]); return {t:'int',v:n}; }
    case 'ZSCORE': { const e=s.zset[k]?.find(([m])=>m===rest[0]); return {t:'bulk',v:e?String(e[1]):null}; }
    case 'ZRANK':  { const ix=s.zset[k]?.findIndex(([m])=>m===rest[0]); return {t:'int',v:ix>=0?ix:null}; }
    case 'ZCARD':  return {t:'int',v:(s.zset[k]||[]).length};
    case 'ZRANGE': { const a=s.zset[k]||[]; let sl=a.slice(parseInt(rest[0]),parseInt(rest[1])<0?a.length+parseInt(rest[1])+1:parseInt(rest[1])+1); const ws=args.includes('WITHSCORES'); return {t:'arr',v:ws?sl.flatMap(([m,sc])=>[m,String(sc)]):sl.map(([m])=>m)}; }
    case 'ZREVRANGE':{ const a=(s.zset[k]||[]).slice().reverse(); let sl=a.slice(parseInt(rest[0]),parseInt(rest[1])<0?a.length+parseInt(rest[1])+1:parseInt(rest[1])+1); const ws=args.includes('WITHSCORES'); return {t:'arr',v:ws?sl.flatMap(([m,sc])=>[m,String(sc)]):sl.map(([m])=>m)}; }
    case 'PING':   return {t:'ok',v:rest[0]||'PONG'};
    case 'INFO':   return {t:'bulk',v:'redis_version:7.2.0\nused_memory_human:2.50M\nconnected_clients:1'};
    case 'ECHO':   return {t:'bulk',v:rest[0]};
    case 'PUBLISH':return {t:'int',v:1};
    case 'FLUSHDB':{ Object.keys(s.str).forEach(x=>delete s.str[x]); return {t:'ok'}; }
    default: throw new Error(`ERR unknown command '${cmd}'`);
  }
}

function renderRedis(outs) {
  return outs.map(({line, r}) => {
    const cmdHtml = `<div class="r-line"><span class="r-prompt">127.0.0.1:6379&gt;</span>${esc(line)}</div>`;
    let res = '';
    switch(r.t) {
      case 'ok':   res = `<div class="r-ok">+${r.v||'OK'}</div>`; break;
      case 'int':  res = `<div class="r-int">(integer) ${r.v??'(nil)'}</div>`; break;
      case 'bulk': res = r.v===null ? `<div class="r-nil">(nil)</div>` : `<div class="r-bulk">"${esc(String(r.v))}"</div>`; break;
      case 'err':  res = `<div class="r-err">(error) ${esc(r.v)}</div>`; break;
      case 'arr':
        if (!Array.isArray(r.v)||!r.v.length) { res='<div class="r-nil">(empty array)</div>'; break; }
        res = r.v.map((v,i)=>`<div class="r-arr">${i+1}) ${v===null?'(nil)':`"${esc(String(v))}"`}</div>`).join('');
        break;
    }
    return cmdHtml + res + '<br>';
  }).join('');
}

/* ══════════════════════════════════════════════════
   SHARED HELPERS
══════════════════════════════════════════════════ */
function getVal(engine) { return document.getElementById(`editor-${engine}`)?.value || ''; }

function setOutput(engine, html) { const el=document.getElementById(`output-${engine}`); if(el) el.innerHTML=html; }

function setExec(engine, ms, rows, eng) {
  const bar = document.getElementById(`exec-${engine}`);
  if (!bar) return;
  const parts = [];
  if (ms   !== null) parts.push(`<span class="exec-ms">&#9733; ${ms}ms</span>`);
  if (rows !== null) parts.push(`<span class="exec-rows">${rows} row${rows!==1?'s':''}</span>`);
  parts.push(`<span class="exec-eng">${eng}</span>`);
  bar.innerHTML = parts.join('<span style="color:var(--bg-4)">&nbsp;|&nbsp;</span>');
}

function addHist(engine, q, ms) {
  history.unshift({ engine, q:q.substring(0,100), ms, t:new Date().toLocaleTimeString() });
  if (history.length > 24) history.pop();
  renderHist(engine);
}

function renderHist(engine) {
  const el = document.getElementById(`hist-${engine}`);
  if (!el) return;
  const items = history.filter(h=>h.engine===engine).slice(0,8);
  el.innerHTML = items.map(h=>`<div class="history-row" onclick="window._loadHist('${engine}',${JSON.stringify(h.q).replace(/"/g,'&quot;')})"><span class="history-q">${esc(h.q)}</span><span class="history-ms">${h.ms}ms</span></div>`).join('');
}

window._loadHist = (engine, q) => {
  const el = document.getElementById(`editor-${engine}`);
  if (el) { el.value = q; el.focus(); }
};

function renderTable(cols, rows, isJson=false) {
  if (!cols.length) return `<div class="result-ok">0 columns returned.</div>`;
  let h = `<div style="overflow-x:auto"><table class="result-table"><thead><tr>${cols.map(c=>`<th>${esc(String(c))}</th>`).join('')}</tr></thead><tbody>`;
  h += rows.map(r=>`<tr>${cols.map(c=>{let v=r[c]; if(v===null||v===undefined)v='NULL'; else if(typeof v==='object')v=JSON.stringify(v); return `<td>${esc(String(v))}</td>`;}).join('')}</tr>`).join('');
  h += `</tbody></table></div><div class="result-meta">${rows.length} row${rows.length!==1?'s':''} &middot; ${cols.length} col${cols.length!==1?'s':''}</div>`;
  return h;
}

function jsonHL(obj) {
  return esc(JSON.stringify(obj,null,2))
    .replace(/"([^"]+)":/g,'<span class="j-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g,': <span class="j-str">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g,': <span class="j-num">$1</span>')
    .replace(/: (true|false)/g,': <span class="j-bool">$1</span>')
    .replace(/: null/g,': <span class="j-null">null</span>');
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ══════════════════════════════════════════════════
   ENGINE TAB SWITCHING
══════════════════════════════════════════════════ */
export function initPlayground() {
  document.querySelectorAll('.eng-tab').forEach(tab => {
    tab.addEventListener('click', () => switchEngine(tab.dataset.engine));
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (activeEngine === 'sql')   runSQL();
      if (activeEngine === 'mongo') runMongo();
      if (activeEngine === 'redis') runRedis();
    }
  });

  document.querySelectorAll('[data-copy-out]').forEach(btn => {
    btn.addEventListener('click', () => {
      const out = document.getElementById(`output-${btn.dataset.copyOut}`);
      if (out) copyText(out.innerText, btn);
    });
  });

  switchEngine('sql');
}

function switchEngine(eng) {
  activeEngine = eng;
  document.querySelectorAll('.eng-tab').forEach(t => t.classList.toggle('active', t.dataset.engine === eng));
  document.querySelectorAll('[data-engine-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.enginePanel !== eng));
  if (eng === 'sql' && !sqlDB) loadSql();
}

window.runSQL   = runSQL;
window.runMongo = runMongo;
window.runRedis = runRedis;
window._clearEditor = (engine) => {
  const el = document.getElementById(`editor-${engine}`);
  if (el) el.value = '';
  setOutput(engine, `<div class="output-placeholder">&#9711; Editor cleared.</div>`);
};
