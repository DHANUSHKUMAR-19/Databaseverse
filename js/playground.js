/**
 * playground.js
 * SQL: real execution via sql.js (SQLite WebAssembly)
 * MongoDB: full document store simulation with aggregation pipeline
 * Redis: command interpreter with real data structures
 */
'use strict';

import { showToast, copyText } from './nav.js';

/* ═══════════════════════════════════════════════════════════
   1. SHARED STATE
   ═══════════════════════════════════════════════════════════ */
let activeEngine = 'sql';
const queryHistory = [];

/* ═══════════════════════════════════════════════════════════
   2. SQL ENGINE  (sql.js — real SQLite via WASM)
   ═══════════════════════════════════════════════════════════ */
let sqlDB = null;
let sqlLoading = false;

const SQL_SEED = `
-- Sample schema seeded automatically
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    UNIQUE NOT NULL,
  role       TEXT    DEFAULT 'user',
  country    TEXT,
  salary     INTEGER,
  created_at TEXT    DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id),
  product    TEXT,
  amount     REAL,
  status     TEXT    DEFAULT 'pending',
  created_at TEXT    DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  price      REAL,
  category   TEXT,
  stock      INTEGER DEFAULT 0
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
  (1,'Pro Plan',299,'completed'),
  (2,'Basic Plan',99,'completed'),
  (1,'Add-on',49,'completed'),
  (3,'Pro Plan',299,'pending'),
  (4,'Basic Plan',99,'completed'),
  (5,'Enterprise',999,'completed'),
  (2,'Pro Plan',299,'refunded'),
  (6,'Basic Plan',99,'completed');
INSERT INTO products (name,price,category,stock) VALUES
  ('Basic Plan',99,'subscription',999),
  ('Pro Plan',299,'subscription',999),
  ('Enterprise',999,'subscription',999),
  ('Add-on',49,'addon',500);
`;

export const SQL_EXAMPLES = {
  basic:     `SELECT * FROM users LIMIT 5;`,
  join:      `SELECT u.name, u.role, u.country,\n       COUNT(o.id)   AS orders,\n       SUM(o.amount) AS total_spent\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nGROUP BY u.id\nORDER BY total_spent DESC;`,
  window:    `SELECT name, salary, role,\n       RANK()   OVER (PARTITION BY role ORDER BY salary DESC) AS rank_in_role,\n       AVG(salary) OVER (PARTITION BY role) AS avg_for_role\nFROM users\nORDER BY role, rank_in_role;`,
  cte:       `WITH completed AS (\n  SELECT user_id, SUM(amount) AS total\n  FROM orders WHERE status = 'completed'\n  GROUP BY user_id\n)\nSELECT u.name, u.email, c.total\nFROM completed c\nJOIN users u ON u.id = c.user_id\nORDER BY c.total DESC;`,
  subquery:  `SELECT name, salary,\n  ROUND(salary * 100.0 / (SELECT AVG(salary) FROM users), 1) AS pct_of_avg\nFROM users\nORDER BY pct_of_avg DESC;`,
  create:    `CREATE TABLE events (\n  id       INTEGER PRIMARY KEY AUTOINCREMENT,\n  user_id  INTEGER,\n  action   TEXT,\n  ts       TEXT DEFAULT (datetime('now'))\n);\nINSERT INTO events (user_id,action) VALUES (1,'login'),(2,'signup'),(1,'purchase');\nSELECT * FROM events;`,
};

async function loadSqlJs() {
  if (sqlDB) return sqlDB;
  if (sqlLoading) return null;
  sqlLoading = true;

  setOutputHtml('sql', `<div class="output-placeholder">⏳ Loading SQLite engine (WASM)...</div>`);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js';
    script.onload = async () => {
      try {
        const SQL = await window.initSqlJs({
          locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
        });
        sqlDB = new SQL.Database();
        sqlDB.run(SQL_SEED);
        setOutputHtml('sql', `<div class="output-placeholder" style="color:var(--green)">✓ SQLite ready — tables: users, orders, products</div>`);
        resolve(sqlDB);
      } catch(e) {
        setOutputHtml('sql', `<div class="result-error">Failed to load SQLite: ${e.message}</div>`);
        resolve(null);
      }
    };
    script.onerror = () => {
      setOutputHtml('sql', `<div class="result-error">Could not load sql.js. Check your connection.</div>`);
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

export async function runSQL() {
  const q = getEditorValue('sql').trim();
  if (!q) return;

  const db = await loadSqlJs();
  if (!db) return;

  const t0 = performance.now();
  try {
    const stmts = splitStatements(q);
    let lastResult = null;

    for (const stmt of stmts) {
      const upper = stmt.toUpperCase().trim();
      if (!upper) continue;
      if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('EXPLAIN')) {
        const results = db.exec(stmt);
        lastResult = results[0] || null;
      } else {
        db.run(stmt);
        lastResult = { affectedRows: true, stmt };
      }
    }

    const ms = (performance.now() - t0).toFixed(2);
    addToHistory('sql', q, ms);

    if (!lastResult) {
      setExecBar('sql', ms, null, 'SQLite');
      setOutputHtml('sql', `<div class="result-success">✓ Statement executed successfully.</div>`);
      return;
    }
    if (lastResult.affectedRows) {
      setExecBar('sql', ms, null, 'SQLite');
      setOutputHtml('sql', `<div class="result-success">✓ ${lastResult.stmt.toUpperCase().split(' ')[0]} executed successfully.</div>`);
      return;
    }

    const { columns, values } = lastResult;
    const rows = values.map(v => Object.fromEntries(columns.map((c,i) => [c, v[i]])));
    setExecBar('sql', ms, rows.length, 'SQLite');
    setOutputHtml('sql', renderTable(columns, rows));
  } catch(e) {
    setExecBar('sql', null, null, 'SQLite');
    setOutputHtml('sql', `<div class="result-error">Error: ${e.message}</div>`);
  }
}

function splitStatements(q) {
  // Split on semicolons not inside quotes
  const stmts = [];
  let cur = '', inStr = false, strChar = '';
  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    if (inStr) {
      cur += ch;
      if (ch === strChar && q[i-1] !== '\\') inStr = false;
    } else if (ch === "'" || ch === '"') {
      inStr = true; strChar = ch; cur += ch;
    } else if (ch === ';') {
      if (cur.trim()) stmts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts;
}

/* ═══════════════════════════════════════════════════════════
   3. MONGODB SIMULATOR
   ═══════════════════════════════════════════════════════════ */

const mongoDB = {
  users: [
    { _id: 'u1', name:'Alice Chen',   email:'alice@corp.com', role:'admin',    country:'US', salary:120000, tags:['admin','superuser'], createdAt: new Date('2023-01-15') },
    { _id: 'u2', name:'Bob Kumar',    email:'bob@corp.com',   role:'engineer', country:'IN', salary:95000,  tags:['backend'],           createdAt: new Date('2023-03-20') },
    { _id: 'u3', name:'Carol Smith',  email:'carol@corp.com', role:'engineer', country:'UK', salary:98000,  tags:['backend','devops'],  createdAt: new Date('2023-05-10') },
    { _id: 'u4', name:'David Lee',    email:'david@corp.com', role:'designer', country:'US', salary:85000,  tags:['frontend'],          createdAt: new Date('2023-07-01') },
    { _id: 'u5', name:'Eva Müller',   email:'eva@corp.com',   role:'admin',    country:'DE', salary:110000, tags:['admin'],             createdAt: new Date('2023-08-15') },
    { _id: 'u6', name:'Frank Okafor', email:'frank@corp.com', role:'engineer', country:'NG', salary:75000,  tags:['backend'],           createdAt: new Date('2024-01-10') },
    { _id: 'u7', name:'Grace Tanaka', email:'grace@corp.com', role:'designer', country:'JP', salary:90000,  tags:['frontend','ux'],     createdAt: new Date('2024-02-20') },
  ],
  orders: [
    { _id:'o1', userId:'u1', product:'Pro Plan',   amount:299, status:'completed' },
    { _id:'o2', userId:'u2', product:'Basic Plan', amount:99,  status:'completed' },
    { _id:'o3', userId:'u1', product:'Add-on',     amount:49,  status:'completed' },
    { _id:'o4', userId:'u3', product:'Pro Plan',   amount:299, status:'pending' },
    { _id:'o5', userId:'u4', product:'Basic Plan', amount:99,  status:'completed' },
    { _id:'o6', userId:'u5', product:'Enterprise', amount:999, status:'completed' },
    { _id:'o7', userId:'u2', product:'Pro Plan',   amount:299, status:'refunded' },
    { _id:'o8', userId:'u6', product:'Basic Plan', amount:99,  status:'completed' },
  ],
};

export const MONGO_EXAMPLES = {
  find:      `db.users.find(\n  { role: "engineer" },\n  { name: 1, email: 1, country: 1 }\n)`,
  filter:    `db.users.find(\n  { salary: { $gte: 95000 }, country: { $in: ["US","UK"] } }\n).sort({ salary: -1 }).limit(5)`,
  aggregate: `db.orders.aggregate([\n  { $match:  { status: "completed" } },\n  { $group:  { _id: "$userId", total: { $sum: "$amount" }, count: { $sum: 1 } } },\n  { $sort:   { total: -1 } },\n  { $limit:  5 }\n])`,
  update:    `db.users.updateMany(\n  { role: "engineer" },\n  { $set: { department: "Engineering" } }\n)`,
  insert:    `db.users.insertOne({\n  name: "Hiro Nakamura",\n  email: "hiro@corp.com",\n  role: "engineer",\n  country: "JP",\n  salary: 102000\n})`,
  count:     `db.users.aggregate([\n  { $group: { _id: "$role", count: { $sum: 1 }, avgSalary: { $avg: "$salary" } } },\n  { $sort: { count: -1 } }\n])`,
};

export function runMongo() {
  const q = getEditorValue('mongo').trim();
  if (!q) return;
  const t0 = performance.now();

  try {
    const result = interpretMongo(q);
    const ms = (performance.now() - t0).toFixed(2);
    addToHistory('mongo', q, ms);
    setExecBar('mongo', ms, Array.isArray(result) ? result.length : null, 'MongoDB Sim');
    setOutputHtml('mongo', renderMongoResult(result));
  } catch(e) {
    setOutputHtml('mongo', `<div class="result-error">Error: ${e.message}</div>`);
  }
}

function interpretMongo(q) {
  // Parse: db.collection.method(args)
  const m = q.match(/db\.(\w+)\.(\w+)\(([\s\S]*)\)/);
  if (!m) throw new Error('Invalid syntax. Expected: db.collection.method({...})');

  const [, colName, method, rawArgs] = m;
  const col = mongoDB[colName];
  if (!col) throw new Error(`Collection "${colName}" not found. Available: ${Object.keys(mongoDB).join(', ')}`);

  let docs = col.map(d => ({ ...d }));

  // Safely evaluate args as JS object
  const evalArg = (str) => {
    str = str.trim();
    if (!str) return [];
    try {
      // Replace unquoted keys with quoted keys
      const clean = str
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/"\$(\w+)":/g, '"$$$1":')
        .replace(/new Date\([^)]*\)/g, '"[Date]"');
      return JSON.parse(`[${clean}]`);
    } catch {
      // Fallback: try direct eval-like parse
      return [{}];
    }
  };

  const args = evalArg(rawArgs);
  const filter = args[0] || {};
  const projection = args[1] || null;

  if (method === 'find' || method === 'findOne') {
    docs = mongoFilter(docs, filter);
    if (projection) docs = docs.map(d => mongoProject(d, projection));
    if (method === 'findOne') docs = docs.slice(0, 1);

    // Chained .sort / .limit / .skip
    const sortM = q.match(/\.sort\(\s*\{([^}]+)\}\s*\)/);
    if (sortM) {
      const sField = sortM[1].replace(/['"]/g,'').trim().split(':');
      const key = sField[0].trim(); const dir = parseInt(sField[1]) || 1;
      docs.sort((a,b) => (a[key] > b[key] ? 1 : -1) * dir);
    }
    const limitM = q.match(/\.limit\(\s*(\d+)\s*\)/);
    if (limitM) docs = docs.slice(0, parseInt(limitM[1]));

    return docs;
  }

  if (method === 'aggregate') {
    const pipelineM = rawArgs.match(/\[([\s\S]+)\]/);
    if (!pipelineM) throw new Error('aggregate() expects an array pipeline');
    docs = runMongoPipeline(docs, pipelineM[1]);
    return docs;
  }

  if (method === 'insertOne' || method === 'insertMany') {
    const newDoc = filter;
    if (!newDoc._id) newDoc._id = 'new_' + Date.now();
    col.push(newDoc);
    return { acknowledged: true, insertedId: newDoc._id };
  }

  if (method === 'updateMany' || method === 'updateOne') {
    const update = args[1] || {};
    const matched = mongoFilter(docs, filter);
    const target  = method === 'updateOne' ? matched.slice(0,1) : matched;
    let modCount = 0;
    target.forEach(doc => {
      const real = col.find(d => d._id === doc._id);
      if (!real) return;
      if (update.$set) Object.assign(real, update.$set);
      if (update.$inc) Object.entries(update.$inc).forEach(([k,v]) => { real[k] = (real[k]||0) + v; });
      modCount++;
    });
    return { acknowledged: true, matchedCount: matched.length, modifiedCount: modCount };
  }

  if (method === 'deleteMany' || method === 'deleteOne') {
    const toDelete = mongoFilter(docs, filter);
    const ids = new Set((method === 'deleteOne' ? toDelete.slice(0,1) : toDelete).map(d=>d._id));
    const before = col.length;
    mongoDB[colName] = col.filter(d => !ids.has(d._id));
    return { acknowledged: true, deletedCount: before - mongoDB[colName].length };
  }

  if (method === 'countDocuments') {
    return [{ count: mongoFilter(docs, filter).length }];
  }

  if (method === 'distinct') {
    const field = (rawArgs.match(/"(\w+)"/) || [])[1] || '_id';
    return [...new Set(docs.map(d => d[field]))].filter(v => v !== undefined);
  }

  throw new Error(`Method "${method}" not supported. Try: find, aggregate, insertOne, updateMany, deleteMany, countDocuments, distinct`);
}

function mongoFilter(docs, filter) {
  if (!filter || !Object.keys(filter).length) return docs;
  return docs.filter(doc => Object.entries(filter).every(([k,v]) => {
    if (typeof v === 'object' && v !== null) {
      if (v.$eq  !== undefined) return doc[k] == v.$eq;
      if (v.$ne  !== undefined) return doc[k] != v.$ne;
      if (v.$gt  !== undefined) return doc[k] >  v.$gt;
      if (v.$gte !== undefined) return doc[k] >= v.$gte;
      if (v.$lt  !== undefined) return doc[k] <  v.$lt;
      if (v.$lte !== undefined) return doc[k] <= v.$lte;
      if (v.$in  !== undefined) return v.$in.includes(doc[k]);
      if (v.$nin !== undefined) return !v.$nin.includes(doc[k]);
      if (v.$exists !== undefined) return v.$exists ? doc[k] !== undefined : doc[k] === undefined;
      if (v.$regex !== undefined) return new RegExp(v.$regex, v.$options||'').test(String(doc[k]||''));
    }
    return doc[k] == v;
  }));
}

function mongoProject(doc, proj) {
  const keys = Object.keys(proj);
  const include = Object.values(proj).some(v => v === 1);
  if (include) {
    const out = { _id: doc._id };
    keys.forEach(k => { if (proj[k] === 1 && doc[k] !== undefined) out[k] = doc[k]; });
    return out;
  } else {
    const out = { ...doc };
    keys.forEach(k => { if (proj[k] === 0) delete out[k]; });
    return out;
  }
}

function runMongoPipeline(docs, rawPipeline) {
  // Parse each stage from raw text
  const stagePattern = /\{\s*\$(\w+)\s*:\s*([\s\S]+?)(?=\}\s*,\s*\{|\}\s*\]|$)/g;
  let m;
  while ((m = stagePattern.exec(rawPipeline + ']')) !== null) {
    const [, op, rawVal] = m;
    try {
      const cleanVal = rawVal.trim().replace(/\}\s*$/, '}').replace(/(\w+)\s*:/g, '"$1":').replace(/"\$(\w+)":/g, '"$$$1":');
      const val = JSON.parse(cleanVal.endsWith('}') ? cleanVal : cleanVal + '}');
      docs = applyMongoStage(docs, op, val);
    } catch { /* skip malformed stage */ }
  }
  return docs;
}

function applyMongoStage(docs, op, val) {
  switch(op) {
    case 'match':  return mongoFilter(docs, val);
    case 'limit':  return docs.slice(0, val);
    case 'skip':   return docs.slice(val);
    case 'sort': {
      const [field, dir] = Object.entries(val)[0];
      return [...docs].sort((a,b) => (a[field]>b[field]?1:-1) * (dir||1));
    }
    case 'project': return docs.map(d => mongoProject(d, val));
    case 'group': {
      const idField = val._id ? String(val._id).replace('$','') : null;
      const groups = {};
      docs.forEach(doc => {
        const key = idField ? (doc[idField] ?? 'null') : 'all';
        if (!groups[key]) {
          groups[key] = { _id: idField ? doc[idField] : null, _docs: [] };
        }
        groups[key]._docs.push(doc);
      });
      return Object.values(groups).map(g => {
        const agg = { _id: g._id };
        Object.entries(val).forEach(([k, expr]) => {
          if (k === '_id') return;
          if (typeof expr === 'object') {
            const [accum, field] = Object.entries(expr)[0];
            const fName = String(field).replace('$','');
            const nums = g._docs.map(d => parseFloat(d[fName])||0);
            if (accum === '$sum')   agg[k] = typeof field === 'number' ? field * g._docs.length : nums.reduce((s,n)=>s+n,0);
            if (accum === '$avg')   agg[k] = parseFloat((nums.reduce((s,n)=>s+n,0)/nums.length).toFixed(2));
            if (accum === '$max')   agg[k] = Math.max(...nums);
            if (accum === '$min')   agg[k] = Math.min(...nums);
            if (accum === '$count') agg[k] = g._docs.length;
            if (accum === '$push')  agg[k] = g._docs.map(d => d[fName]);
            if (accum === '$first') agg[k] = g._docs[0]?.[fName];
          }
        });
        return agg;
      });
    }
    case 'unwind': {
      const field = String(val).replace('$','');
      return docs.flatMap(doc => Array.isArray(doc[field]) ? doc[field].map(v => ({...doc,[field]:v})) : [doc]);
    }
    case 'addFields':
    case 'set': {
      return docs.map(doc => {
        const out = {...doc};
        Object.entries(val).forEach(([k,v]) => { out[k] = typeof v === 'string' && v.startsWith('$') ? doc[v.slice(1)] : v; });
        return out;
      });
    }
    case 'count': {
      return [{ [val]: docs.length }];
    }
    default: return docs;
  }
}

function renderMongoResult(result) {
  if (!Array.isArray(result)) {
    return `<pre class="json-output">${syntaxHighlightJSON(result)}</pre>`;
  }
  if (!result.length) return `<div class="result-success">No documents returned.</div>`;

  const keys = [...new Set(result.flatMap(d => Object.keys(d)))];
  const rows = result.map(d => Object.fromEntries(keys.map(k => [k, d[k]])));
  return renderTable(keys, rows, true);
}

/* ═══════════════════════════════════════════════════════════
   4. REDIS SIMULATOR
   ═══════════════════════════════════════════════════════════ */

const redisStore = {
  strings:  { 'site:name':'DatabaseVerse', 'site:version':'2.0', 'counter:visits':'1042' },
  lists:    { 'queue:tasks': ['task:3','task:2','task:1'], 'log:events': ['login','signup','purchase'] },
  sets:     { 'tags:postgres': new Set(['sql','acid','json','open-source']), 'tags:redis': new Set(['cache','fast','pub/sub']) },
  hashes:   { 'user:1': { name:'Alice Chen', role:'admin', score:'950' }, 'user:2': { name:'Bob Kumar', role:'engineer', score:'780' } },
  sortedSets:{ 'leaderboard': [['alice',9500],['bob',8800],['carol',8200],['david',7600]] },
  expiry:   {},
};

export const REDIS_EXAMPLES = {
  strings: `SET user:session:abc "eyJhbGciOiJIUzI1NiJ9"\nEXPIRE user:session:abc 3600\nGET user:session:abc\nINCR counter:visits\nGET counter:visits`,
  hashes:  `HSET user:3 name "Grace" role "designer" score "890"\nHGETALL user:1\nHGET user:2 role\nHINFO user:3`,
  lists:   `LPUSH queue:tasks "task:4"\nLRANGE queue:tasks 0 -1\nRPOP queue:tasks\nLLEN queue:tasks`,
  sets:    `SADD tags:postgres "replication"\nSMEMBERS tags:postgres\nSISMEMBER tags:postgres "acid"\nSINTER tags:postgres tags:redis`,
  sorted:  `ZADD leaderboard 9900 "eve"\nZREVRANGE leaderboard 0 4 WITHSCORES\nZSCORE leaderboard alice\nZRANK leaderboard bob`,
  pubsub:  `-- Pub/Sub is fire-and-forget; simulated below\nPUBLISH chat:room1 "Hello world"\nSUBSCRIBE chat:room1`,
};

export function runRedis() {
  const raw = getEditorValue('redis').trim();
  if (!raw) return;
  const t0 = performance.now();

  const lines = raw.split('\n').filter(l => l.trim() && !l.trim().startsWith('--') && !l.trim().startsWith('#'));
  const outputs = [];

  for (const line of lines) {
    const parts = tokenizeRedis(line.trim());
    const [cmd, ...args] = parts;
    if (!cmd) continue;
    try {
      const result = execRedisCmd(cmd.toUpperCase(), args);
      outputs.push({ cmd: line.trim(), result });
    } catch(e) {
      outputs.push({ cmd: line.trim(), result: { type:'error', value: e.message } });
    }
  }

  const ms = (performance.now() - t0).toFixed(2);
  addToHistory('redis', raw, ms);
  setExecBar('redis', ms, outputs.length, 'Redis Sim');
  setOutputHtml('redis', renderRedisOutput(outputs));
}

function tokenizeRedis(line) {
  const tokens = [];
  let cur = '', inQ = false, qc = '';
  for (const ch of line) {
    if (inQ) {
      if (ch === qc) inQ = false;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      inQ = true; qc = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (cur) { tokens.push(cur); cur = ''; }
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function execRedisCmd(cmd, args) {
  const s = redisStore;
  const [k, ...rest] = args;

  switch(cmd) {
    /* ── Strings ── */
    case 'SET':     { s.strings[k] = rest[0]; return {type:'ok'}; }
    case 'GET':     return { type:'bulk', value: s.strings[k] ?? null };
    case 'DEL':     { const n = args.filter(k => { const had = k in s.strings; delete s.strings[k]; return had; }).length; return {type:'integer',value:n}; }
    case 'EXISTS':  return { type:'integer', value: k in s.strings ? 1 : 0 };
    case 'INCR':    { s.strings[k] = String((parseInt(s.strings[k]||'0') + 1)); return {type:'integer',value:parseInt(s.strings[k])}; }
    case 'INCRBY':  { s.strings[k] = String((parseInt(s.strings[k]||'0') + parseInt(rest[0]||'1'))); return {type:'integer',value:parseInt(s.strings[k])}; }
    case 'DECR':    { s.strings[k] = String((parseInt(s.strings[k]||'0') - 1)); return {type:'integer',value:parseInt(s.strings[k])}; }
    case 'APPEND':  { s.strings[k] = (s.strings[k]||'') + rest[0]; return {type:'integer',value:s.strings[k].length}; }
    case 'MSET':    { for(let i=0;i<args.length;i+=2) s.strings[args[i]]=args[i+1]; return {type:'ok'}; }
    case 'MGET':    return { type:'array', value: args.map(k => s.strings[k]??null) };
    case 'SETEX':   { s.strings[k]=rest[1]; s.expiry[k]=Date.now()+parseInt(rest[0])*1000; return {type:'ok'}; }
    case 'EXPIRE':  { s.expiry[k]=Date.now()+parseInt(rest[0])*1000; return {type:'integer',value:1}; }
    case 'TTL':     { const exp=s.expiry[k]; return {type:'integer',value:exp?Math.round((exp-Date.now())/1000):-1}; }
    case 'KEYS':    { const pattern = (rest[0]||'*').replace('*','.*'); const re=new RegExp('^'+pattern+'$'); return {type:'array',value:Object.keys(s.strings).filter(k=>re.test(k))}; }
    case 'TYPE':    {
      if (k in s.strings) return {type:'bulk',value:'string'};
      if (k in s.lists)   return {type:'bulk',value:'list'};
      if (k in s.sets)    return {type:'bulk',value:'set'};
      if (k in s.hashes)  return {type:'bulk',value:'hash'};
      return {type:'bulk',value:'none'};
    }
    case 'DBSIZE':  return { type:'integer', value: Object.keys(s.strings).length + Object.keys(s.lists).length + Object.keys(s.sets).length + Object.keys(s.hashes).length };

    /* ── Hashes ── */
    case 'HSET':    { if (!s.hashes[k]) s.hashes[k]={}; const n=rest.length/2; for(let i=0;i<rest.length;i+=2) s.hashes[k][rest[i]]=rest[i+1]; return {type:'integer',value:n}; }
    case 'HGET':    return { type:'bulk', value: s.hashes[k]?.[rest[0]] ?? null };
    case 'HGETALL': { const h=s.hashes[k]; if(!h) return {type:'array',value:[]}; const arr=[]; Object.entries(h).forEach(([f,v])=>{arr.push(f,v);}); return {type:'array',value:arr}; }
    case 'HMGET':   return { type:'array', value: rest.map(f => s.hashes[k]?.[f]??null) };
    case 'HKEYS':   return { type:'array', value: Object.keys(s.hashes[k]||{}) };
    case 'HVALS':   return { type:'array', value: Object.values(s.hashes[k]||{}) };
    case 'HDEL':    { const had = rest.filter(f=>{ const e=f in (s.hashes[k]||{}); delete s.hashes[k]?.[f]; return e; }).length; return {type:'integer',value:had}; }
    case 'HEXISTS': return { type:'integer', value: rest[0] in (s.hashes[k]||{}) ? 1 : 0 };
    case 'HLEN':    return { type:'integer', value: Object.keys(s.hashes[k]||{}).length };
    case 'HINCRBY': { if(!s.hashes[k]) s.hashes[k]={}; s.hashes[k][rest[0]]=String(parseInt(s.hashes[k][rest[0]]||'0')+parseInt(rest[1]||'0')); return {type:'integer',value:parseInt(s.hashes[k][rest[0]])}; }

    /* ── Lists ── */
    case 'LPUSH':   { if (!s.lists[k]) s.lists[k]=[]; rest.reverse().forEach(v=>s.lists[k].unshift(v)); return {type:'integer',value:s.lists[k].length}; }
    case 'RPUSH':   { if (!s.lists[k]) s.lists[k]=[]; rest.forEach(v=>s.lists[k].push(v)); return {type:'integer',value:s.lists[k].length}; }
    case 'LPOP':    { const v=s.lists[k]?.shift(); return {type:'bulk',value:v??null}; }
    case 'RPOP':    { const v=s.lists[k]?.pop(); return {type:'bulk',value:v??null}; }
    case 'LRANGE':  { const l=s.lists[k]||[]; let s2=parseInt(rest[0]),e=parseInt(rest[1]); if(e<0)e=l.length+e+1; return {type:'array',value:l.slice(s2,e+1)}; }
    case 'LLEN':    return { type:'integer', value: (s.lists[k]||[]).length };
    case 'LINDEX':  return { type:'bulk', value: s.lists[k]?.[parseInt(rest[0])] ?? null };
    case 'LSET':    { if(s.lists[k]) s.lists[k][parseInt(rest[0])]=rest[1]; return {type:'ok'}; }

    /* ── Sets ── */
    case 'SADD':    { if (!s.sets[k]) s.sets[k]=new Set(); let n=0; rest.forEach(v=>{if(!s.sets[k].has(v)){s.sets[k].add(v);n++;}}); return {type:'integer',value:n}; }
    case 'SMEMBERS':return { type:'array', value: [...(s.sets[k]||new Set())] };
    case 'SISMEMBER':return { type:'integer', value: s.sets[k]?.has(rest[0]) ? 1 : 0 };
    case 'SCARD':   return { type:'integer', value: (s.sets[k]||new Set()).size };
    case 'SREM':    { let n=0; rest.forEach(v=>{if(s.sets[k]?.has(v)){s.sets[k].delete(v);n++;}}); return {type:'integer',value:n}; }
    case 'SUNION':  { const u=new Set(); args.forEach(k2=>(s.sets[k2]||new Set()).forEach(v=>u.add(v))); return {type:'array',value:[...u]}; }
    case 'SINTER':  { let i=[...(s.sets[args[0]]||new Set())]; for(let idx=1;idx<args.length;idx++) i=i.filter(v=>s.sets[args[idx]]?.has(v)); return {type:'array',value:i}; }
    case 'SDIFF':   { let d=[...(s.sets[args[0]]||new Set())]; for(let idx=1;idx<args.length;idx++) d=d.filter(v=>!s.sets[args[idx]]?.has(v)); return {type:'array',value:d}; }
    case 'SMOVE':   { const [src,dst,member]=args; if(s.sets[src]?.has(member)){s.sets[src].delete(member);if(!s.sets[dst])s.sets[dst]=new Set();s.sets[dst].add(member);return {type:'integer',value:1};} return {type:'integer',value:0}; }

    /* ── Sorted Sets ── */
    case 'ZADD': {
      if (!s.sortedSets[k]) s.sortedSets[k]=[];
      let n=0;
      for(let i=0;i<rest.length;i+=2){
        const sc=parseFloat(rest[i]), mem=rest[i+1];
        const idx=s.sortedSets[k].findIndex(([m])=>m===mem);
        if(idx>=0){s.sortedSets[k][idx][1]=sc;}else{s.sortedSets[k].push([mem,sc]);n++;}
      }
      s.sortedSets[k].sort((a,b)=>a[1]-b[1]);
      return {type:'integer',value:n};
    }
    case 'ZSCORE':     { const e=s.sortedSets[k]?.find(([m])=>m===rest[0]); return {type:'bulk',value:e?String(e[1]):null}; }
    case 'ZRANK':      { const idx=s.sortedSets[k]?.findIndex(([m])=>m===rest[0]); return {type:'integer',value:idx>=0?idx:null}; }
    case 'ZREVRANK':   { const a=s.sortedSets[k]||[]; const idx=a.slice().reverse().findIndex(([m])=>m===rest[0]); return {type:'integer',value:idx>=0?idx:null}; }
    case 'ZRANGE':     { const a=s.sortedSets[k]||[]; let sl=a.slice(parseInt(rest[0]),parseInt(rest[1])<0?a.length+parseInt(rest[1])+1:parseInt(rest[1])+1); const ws=args.includes('WITHSCORES'); return {type:'array',value:ws?sl.flatMap(([m,sc])=>[m,String(sc)]):sl.map(([m])=>m)}; }
    case 'ZREVRANGE':  { const a=(s.sortedSets[k]||[]).slice().reverse(); let sl=a.slice(parseInt(rest[0]),parseInt(rest[1])<0?a.length+parseInt(rest[1])+1:parseInt(rest[1])+1); const ws=args.includes('WITHSCORES'); return {type:'array',value:ws?sl.flatMap(([m,sc])=>[m,String(sc)]):sl.map(([m])=>m)}; }
    case 'ZCARD':      return { type:'integer', value: (s.sortedSets[k]||[]).length };
    case 'ZREM':       { const before=s.sortedSets[k]?.length||0; s.sortedSets[k]=s.sortedSets[k]?.filter(([m])=>!rest.includes(m))||[]; return {type:'integer',value:before-(s.sortedSets[k].length)}; }
    case 'ZINCRBY':    { const e=s.sortedSets[k]?.find(([m])=>m===rest[1]); if(e){e[1]+=parseFloat(rest[0]);}else{if(!s.sortedSets[k])s.sortedSets[k]=[];s.sortedSets[k].push([rest[1],parseFloat(rest[0])]);} s.sortedSets[k]?.sort((a,b)=>a[1]-b[1]); const ne=s.sortedSets[k]?.find(([m])=>m===rest[1]); return {type:'bulk',value:String(ne?.[1])}; }

    /* ── Server ── */
    case 'FLUSHDB':  { Object.keys(s.strings).forEach(k=>delete s.strings[k]); Object.keys(s.lists).forEach(k=>delete s.lists[k]); return {type:'ok'}; }
    case 'PING':     return { type:'ok', value: rest[0] || 'PONG' };
    case 'INFO':     return { type:'bulk', value: 'redis_version:7.2.0\nused_memory_human:2.50M\nconnected_clients:1' };
    case 'ECHO':     return { type:'bulk', value: rest[0] };
    case 'PUBLISH':  return { type:'integer', value: 1 };
    case 'SUBSCRIBE':return { type:'array', value: ['subscribe', k, '1'] };
    case 'SCAN':     { const all=[...Object.keys(s.strings),...Object.keys(s.lists),...Object.keys(s.sets),...Object.keys(s.hashes)]; return {type:'array',value:['0',all]}; }
    case 'OBJECT':   return { type:'bulk', value: 'encoding:embstr' };
    case 'DEBUG':    return { type:'ok' };

    default: throw new Error(`ERR unknown command '${cmd}'`);
  }
}

function renderRedisOutput(outputs) {
  if (!outputs.length) return '';
  return outputs.map(({cmd, result}) => {
    const cmdHtml = `<span class="redis-prompt">127.0.0.1:6379&gt;</span><span style="color:var(--text)">${escHtml(cmd)}</span>`;
    let resHtml = '';
    switch(result.type) {
      case 'ok':      resHtml = `<div class="redis-ok">+${result.value || 'OK'}</div>`; break;
      case 'integer': resHtml = `<div class="redis-integer">(integer) ${result.value ?? '(nil)'}</div>`; break;
      case 'bulk':    resHtml = result.value === null ? `<div class="redis-nil">(nil)</div>` : `<div class="redis-bulk">"${escHtml(String(result.value))}"</div>`; break;
      case 'error':   resHtml = `<div class="redis-error">(error) ${escHtml(result.value)}</div>`; break;
      case 'array': {
        if (!Array.isArray(result.value) || !result.value.length) {
          resHtml = '<div class="redis-nil">(empty array)</div>';
        } else {
          // Nested array (e.g. SCAN)
          if (Array.isArray(result.value[0]) || (result.value.length === 2 && Array.isArray(result.value[1]))) {
            resHtml = `<div class="redis-array-item">1) "${escHtml(String(result.value[0]))}"</div><div class="redis-array-item">2) ${Array.isArray(result.value[1]) ? result.value[1].map((v,i)=>`<div class="redis-array-item" style="padding-left:2rem">${i+1}) "${escHtml(v)}"</div>`).join('') : '"'+escHtml(result.value[1])+'"'}</div>`;
          } else {
            resHtml = result.value.map((v,i) => `<div class="redis-array-item">${i+1}) ${v===null?'(nil)':`"${escHtml(String(v))}"`}</div>`).join('');
          }
        }
        break;
      }
    }
    return `<div class="redis-line">${cmdHtml}</div>${resHtml}<br>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   5. SHARED UI HELPERS
   ═══════════════════════════════════════════════════════════ */

function getEditorValue(engine) {
  return document.getElementById(`editor-${engine}`)?.value || '';
}

function setOutputHtml(engine, html) {
  const el = document.getElementById(`output-${engine}`);
  if (el) el.innerHTML = html;
}

function setExecBar(engine, ms, rows, engineName) {
  const bar = document.getElementById(`execbar-${engine}`);
  if (!bar) return;
  const parts = [];
  if (ms   !== null) parts.push(`<span class="exec-time">&#9733; ${ms}ms</span>`);
  if (rows !== null) parts.push(`<span class="exec-rows">${rows} row${rows!==1?'s':''}</span>`);
  parts.push(`<span class="exec-engine">${engineName}</span>`);
  bar.innerHTML = parts.join('<span style="color:var(--bg4)"> &nbsp;|&nbsp; </span>');
}

function addToHistory(engine, query, ms) {
  queryHistory.unshift({ engine, query: query.substring(0, 100), ms, ts: new Date().toLocaleTimeString() });
  if (queryHistory.length > 20) queryHistory.pop();
  renderHistory(engine);
}

function renderHistory(engine) {
  const el = document.getElementById(`history-${engine}`);
  if (!el) return;
  const items = queryHistory.filter(h => h.engine === engine).slice(0, 8);
  if (!items.length) { el.innerHTML = ''; return; }
  el.innerHTML = items.map(h => `
    <div class="history-item" onclick="loadHistory('${engine}', ${JSON.stringify(h.query).replace(/"/g,'&quot;')})">
      <span class="history-query">${escHtml(h.query)}</span>
      <span class="history-time">${h.ms}ms</span>
    </div>`).join('');
}

window.loadHistory = (engine, query) => {
  const el = document.getElementById(`editor-${engine}`);
  if (el) { el.value = query; el.focus(); }
};

function renderTable(columns, rows, isJson = false) {
  if (!columns.length) return `<div class="result-success">Query returned 0 columns.</div>`;
  let html = `<div style="overflow-x:auto"><table class="result-table"><thead><tr>`;
  html += columns.map(c => `<th>${escHtml(String(c))}</th>`).join('');
  html += `</tr></thead><tbody>`;
  html += rows.map(r =>
    `<tr>${columns.map(c => {
      let val = r[c];
      if (val === null || val === undefined) val = 'NULL';
      else if (typeof val === 'object') val = JSON.stringify(val);
      return `<td>${escHtml(String(val))}</td>`;
    }).join('')}</tr>`
  ).join('');
  html += `</tbody></table></div>`;
  html += `<div class="result-meta">${rows.length} row${rows.length!==1?'s':''} &nbsp;·&nbsp; ${columns.length} column${columns.length!==1?'s':''}</div>`;
  return html;
}

function syntaxHighlightJSON(obj) {
  const json = JSON.stringify(obj, null, 2);
  return escHtml(json)
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-str">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-num">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
    .replace(/: null/g, ': <span class="json-null">null</span>');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════════════════════
   6. ENGINE TAB SWITCHING
   ═══════════════════════════════════════════════════════════ */
export function initPlayground() {
  document.querySelectorAll('.engine-tab').forEach(tab => {
    tab.addEventListener('click', () => switchEngine(tab.dataset.engine));
  });

  document.querySelectorAll('.example-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const key = pill.dataset.example;
      const engine = pill.closest('[data-engine-panel]')?.dataset.enginePanel;
      if (!engine || !key) return;
      const examples = engine === 'sql' ? SQL_EXAMPLES : engine === 'mongo' ? MONGO_EXAMPLES : REDIS_EXAMPLES;
      const el = document.getElementById(`editor-${engine}`);
      if (el && examples[key]) { el.value = examples[key]; el.focus(); }
    });
  });

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to run
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (activeEngine === 'sql')   runSQL();
      if (activeEngine === 'mongo') runMongo();
      if (activeEngine === 'redis') runRedis();
    }
  });

  // Copy output buttons
  document.querySelectorAll('[data-copy-output]').forEach(btn => {
    btn.addEventListener('click', () => {
      const engine = btn.dataset.copyOutput;
      const out = document.getElementById(`output-${engine}`);
      if (out) copyText(out.innerText, btn);
    });
  });

  // Auto-load SQL engine
  switchEngine('sql');
}

function switchEngine(engine) {
  activeEngine = engine;
  document.querySelectorAll('.engine-tab').forEach(t => t.classList.toggle('active', t.dataset.engine === engine));
  document.querySelectorAll('[data-engine-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.enginePanel !== engine));

  if (engine === 'sql' && !sqlDB) {
    loadSqlJs();
  }
}

/* ═══════════════════════════════════════════════════════════
   7. EXPOSE TO WINDOW (for inline onclick)
   ═══════════════════════════════════════════════════════════ */
window.runSQL   = runSQL;
window.runMongo = runMongo;
window.runRedis = runRedis;
