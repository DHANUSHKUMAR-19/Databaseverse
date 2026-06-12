/**
 * js/home.js — Cards, search/filter, comparator, quiz, use cases
 */
'use strict';
import { DB_META, CATEGORIES, CAT_CSS_CLASS, DB_LOGOS, USE_CASES } from './db-data.js';
import { copyText, showToast } from './nav.js';

const DB_NAMES = Object.keys(DB_META);

/* ══════════════════════════════════════
   SYNTAX-HIGHLIGHTED CODE SNIPPETS
══════════════════════════════════════ */
const SNIPPETS = {
  MySQL:              `<span class="t-kw">SELECT</span> u.name, <span class="t-fn">COUNT</span>(o.id) AS orders,\n       <span class="t-fn">SUM</span>(o.amount) AS revenue\n<span class="t-kw">FROM</span> users u\n<span class="t-kw">LEFT JOIN</span> orders o <span class="t-kw">ON</span> o.user_id = u.id\n<span class="t-kw">GROUP BY</span> u.id <span class="t-kw">ORDER BY</span> revenue <span class="t-kw">DESC</span>;`,
  PostgreSQL:         `<span class="t-kw">SELECT</span> name, salary, dept,\n  <span class="t-fn">RANK</span>() <span class="t-kw">OVER</span> (<span class="t-kw">PARTITION BY</span> dept\n    <span class="t-kw">ORDER BY</span> salary <span class="t-kw">DESC</span>) AS rank,\n  <span class="t-fn">AVG</span>(salary) <span class="t-kw">OVER</span> (<span class="t-kw">PARTITION BY</span> dept) AS avg\n<span class="t-kw">FROM</span> employees;`,
  'SQL Server':       `<span class="t-kw">SELECT TOP</span> <span class="t-num">10</span>\n  emp.name, dept.name, emp.salary,\n  <span class="t-fn">AVG</span>(emp.salary) <span class="t-kw">OVER</span>\n    (<span class="t-kw">PARTITION BY</span> dept.id) avg_dept\n<span class="t-kw">FROM</span> employees emp\n<span class="t-kw">JOIN</span> departments dept <span class="t-kw">ON</span> dept.id = emp.dept_id;`,
  Oracle:             `<span class="t-kw">SELECT</span> emp.name, dept.loc,\n  <span class="t-fn">ROW_NUMBER</span>() <span class="t-kw">OVER</span>\n    (<span class="t-kw">PARTITION BY</span> dept.id <span class="t-kw">ORDER BY</span> sal <span class="t-kw">DESC</span>) rn\n<span class="t-kw">FROM</span> emp\n<span class="t-kw">JOIN</span> dept <span class="t-kw">ON</span> dept.id = emp.deptno\n<span class="t-kw">WHERE</span> <span class="t-fn">ROWNUM</span> <= <span class="t-num">10</span>;`,
  MariaDB:            `<span class="t-kw">SELECT</span> product, region,\n  <span class="t-fn">SUM</span>(qty) total_qty,\n  <span class="t-fn">SUM</span>(qty * price) revenue\n<span class="t-kw">FROM</span> sales\n<span class="t-kw">WHERE</span> sale_date >= <span class="t-str">'2024-01-01'</span>\n<span class="t-kw">GROUP BY</span> product, region\n<span class="t-kw">ORDER BY</span> revenue <span class="t-kw">DESC</span>;`,
  SQLite:             `<span class="t-kw">SELECT</span> strftime(<span class="t-str">'%Y-%m'</span>, created_at) month,\n  <span class="t-fn">COUNT</span>(*) signups,\n  <span class="t-fn">SUM</span>(amount) revenue\n<span class="t-kw">FROM</span> orders\n<span class="t-kw">GROUP BY</span> month\n<span class="t-kw">ORDER BY</span> month <span class="t-kw">DESC</span>;`,
  MongoDB:            `db.orders.<span class="t-fn">aggregate</span>([\n  { <span class="t-key">$match</span>:  { status: <span class="t-str">"completed"</span> } },\n  { <span class="t-key">$group</span>:  { _id: <span class="t-str">"$userId"</span>,\n      total: { <span class="t-key">$sum</span>: <span class="t-str">"$amount"</span> } } },\n  { <span class="t-key">$sort</span>:   { total: <span class="t-num">-1</span> } },\n  { <span class="t-key">$limit</span>:  <span class="t-num">10</span> }\n])`,
  Redis:              `<span class="t-fn">ZADD</span>  leaderboard <span class="t-num">9500</span> <span class="t-str">"alice"</span>\n<span class="t-fn">ZADD</span>  leaderboard <span class="t-num">8800</span> <span class="t-str">"bob"</span>\n<span class="t-fn">ZREVRANGE</span> leaderboard <span class="t-num">0</span> <span class="t-num">9</span> WITHSCORES\n<span class="t-fn">INCR</span>  counter:page_views\n<span class="t-fn">EXPIRE</span> session:<span class="t-str">"abc"</span> <span class="t-num">3600</span>`,
  'Apache Cassandra': `<span class="t-kw">SELECT</span> * <span class="t-kw">FROM</span> sensor_data\n<span class="t-kw">WHERE</span>  device_id = <span class="t-str">'sensor-42'</span>\n  <span class="t-kw">AND</span>  recorded_at >= <span class="t-str">'2024-01-01'</span>\n  <span class="t-kw">AND</span>  recorded_at <  <span class="t-str">'2024-02-01'</span>\n<span class="t-kw">ORDER BY</span> recorded_at <span class="t-kw">DESC</span>\n<span class="t-kw">LIMIT</span> <span class="t-num">1000</span>;`,
  'Amazon DynamoDB':  `<span class="t-cm">// GSI query — low latency at any scale</span>\n<span class="t-kw">const</span> res = <span class="t-kw">await</span> client.<span class="t-fn">query</span>({\n  TableName: <span class="t-str">"Orders"</span>,\n  IndexName: <span class="t-str">"StatusDateIndex"</span>,\n  KeyConditionExpression:\n    <span class="t-str">"#s = :status AND #d >= :from"</span>\n});`,
  'Firebase Firestore':`<span class="t-kw">const</span> posts = <span class="t-kw">await</span>\n  db.<span class="t-fn">collection</span>(<span class="t-str">"posts"</span>)\n    .<span class="t-fn">where</span>(<span class="t-str">"published"</span>, <span class="t-str">"=="</span>, <span class="t-kw">true</span>)\n    .<span class="t-fn">orderBy</span>(<span class="t-str">"createdAt"</span>, <span class="t-str">"desc"</span>)\n    .<span class="t-fn">limit</span>(<span class="t-num">20</span>)\n    .<span class="t-fn">get</span>();`,
  Couchbase:          `<span class="t-kw">SELECT</span> u.name, u.email,\n       <span class="t-fn">ARRAY_LENGTH</span>(u.orders) order_count\n<span class="t-kw">FROM</span> users u\n<span class="t-kw">WHERE</span> u.role = <span class="t-str">'premium'</span>\n  <span class="t-kw">AND</span> <span class="t-fn">ARRAY_CONTAINS</span>(u.tags, <span class="t-str">'vip'</span>)\n<span class="t-kw">ORDER BY</span> order_count <span class="t-kw">DESC LIMIT</span> <span class="t-num">20</span>;`,
  Neo4j:              `<span class="t-kw">MATCH</span> (u:User {name: <span class="t-str">"Alice"</span>})\n      -[:FOLLOWS*1..3]->(friend:User)\n<span class="t-kw">WHERE</span> NOT (u)-[:FOLLOWS]->(friend)\n  <span class="t-kw">AND</span> friend <> u\n<span class="t-kw">RETURN</span> friend.name,\n       <span class="t-fn">count</span>(*) <span class="t-kw">AS</span> strength\n<span class="t-kw">ORDER BY</span> strength <span class="t-kw">DESC LIMIT</span> <span class="t-num">10</span>`,
  ArangoDB:           `<span class="t-kw">FOR</span> v, e, p <span class="t-kw">IN</span> <span class="t-num">1</span>..<span class="t-num">3</span>\n  <span class="t-kw">OUTBOUND</span> <span class="t-str">"users/alice"</span>\n  GRAPH <span class="t-str">"social_graph"</span>\n  <span class="t-kw">FILTER</span> v.active == <span class="t-kw">true</span>\n    <span class="t-kw">AND</span> e.weight > <span class="t-num">0.5</span>\n  <span class="t-kw">RETURN</span> { name: v.name, hops: <span class="t-fn">LENGTH</span>(p) }`,
  TigerGraph:         `<span class="t-cm">// GSQL — 3-hop fraud ring detection</span>\n<span class="t-kw">CREATE QUERY</span> findFraudRing(<span class="t-tp">VERTEX</span>&lt;Account&gt; seed) {\n  Start = { seed };\n  Result = <span class="t-kw">SELECT</span> v <span class="t-kw">FROM</span>\n    Start-(TRANSFERS_TO*<span class="t-num">1</span>..<span class="t-num">3</span>)->v\n  <span class="t-kw">WHERE</span> v.risk_score > <span class="t-num">0.8</span>;\n}`,
  Pinecone:           `<span class="t-cm">// Semantic search with metadata filter</span>\n<span class="t-kw">await</span> index.<span class="t-fn">query</span>({\n  vector: queryEmbedding,  <span class="t-cm">// 1536-dim float[]</span>\n  topK: <span class="t-num">10</span>,\n  filter: {\n    category: { <span class="t-key">$eq</span>: <span class="t-str">"engineering"</span> },\n    date:     { <span class="t-key">$gte</span>: <span class="t-str">"2024-01-01"</span> }\n  },\n  includeMetadata: <span class="t-kw">true</span>\n});`,
  Weaviate:           `<span class="t-cm">// Hybrid BM25 + vector (alpha 0=BM25 1=vec)</span>\nclient.query\n  .<span class="t-fn">get</span>(<span class="t-str">"Article"</span>, [<span class="t-str">"title"</span>, <span class="t-str">"summary"</span>])\n  .<span class="t-fn">withHybrid</span>({\n    query: <span class="t-str">"database scaling strategies"</span>,\n    alpha: <span class="t-num">0.75</span>\n  })\n  .<span class="t-fn">withLimit</span>(<span class="t-num">5</span>).<span class="t-fn">do</span>();`,
  Qdrant:             `<span class="t-cm">// Filtered ANN search in Rust-native engine</span>\nclient.<span class="t-fn">search</span>(<span class="t-str">"products"</span>, {\n  vector: queryEmbedding,\n  filter: { must: [{\n    key:   <span class="t-str">"price"</span>,\n    range: { lte: <span class="t-num">100</span> }\n  }]},\n  limit: <span class="t-num">5</span>,\n  with_payload: <span class="t-kw">true</span>\n});`,
  InfluxDB:           `<span class="t-kw">from</span>(bucket: <span class="t-str">"monitoring"</span>)\n  |> <span class="t-fn">range</span>(start: <span class="t-num">-1</span>h)\n  |> <span class="t-fn">filter</span>(fn: (r) =>\n      r._measurement == <span class="t-str">"cpu"</span> <span class="t-kw">and</span>\n      r.host == <span class="t-str">"prod-01"</span>)\n  |> <span class="t-fn">aggregateWindow</span>(every: <span class="t-num">5</span>m, fn: <span class="t-fn">mean</span>)`,
  TimescaleDB:        `<span class="t-kw">SELECT</span>\n  <span class="t-fn">time_bucket</span>(<span class="t-str">'1 hour'</span>, ts) AS bucket,\n  <span class="t-fn">AVG</span>(cpu_pct)  AS avg_cpu,\n  <span class="t-fn">MAX</span>(mem_mb)   AS peak_mem\n<span class="t-kw">FROM</span> metrics\n<span class="t-kw">WHERE</span> ts > <span class="t-fn">NOW</span>() - <span class="t-kw">INTERVAL</span> <span class="t-str">'24h'</span>\n<span class="t-kw">GROUP BY</span> bucket <span class="t-kw">ORDER BY</span> bucket;`,
  CockroachDB:        `<span class="t-cm">-- Same SQL as Postgres, distributed ACID</span>\n<span class="t-kw">BEGIN</span>;\n  <span class="t-kw">UPDATE</span> accounts <span class="t-kw">SET</span> balance = balance - <span class="t-num">100</span>\n  <span class="t-kw">WHERE</span> id = <span class="t-num">42</span>;\n  <span class="t-kw">UPDATE</span> accounts <span class="t-kw">SET</span> balance = balance + <span class="t-num">100</span>\n  <span class="t-kw">WHERE</span> id = <span class="t-num">99</span>;\n<span class="t-kw">COMMIT</span>;`,
  PlanetScale:        `<span class="t-cm">-- Schema branching — like Git for your DB</span>\n<span class="t-cm">-- 1. Create a branch, make changes safely</span>\n<span class="t-kw">ALTER TABLE</span> users\n  <span class="t-kw">ADD COLUMN</span> verified <span class="t-tp">BOOLEAN</span>\n    <span class="t-kw">DEFAULT</span> <span class="t-kw">FALSE</span> <span class="t-kw">NOT NULL</span>;\n<span class="t-cm">-- 2. Open a deploy request — zero downtime</span>`,
  DuckDB:             `<span class="t-cm">-- In-process analytics on Parquet files</span>\n<span class="t-kw">SELECT</span> region,\n  <span class="t-fn">SUM</span>(revenue)  AS total,\n  <span class="t-fn">RANK</span>() <span class="t-kw">OVER</span> (<span class="t-kw">ORDER BY</span> <span class="t-fn">SUM</span>(revenue) <span class="t-kw">DESC</span>)\n<span class="t-kw">FROM</span> <span class="t-fn">read_parquet</span>(<span class="t-str">'sales/*.parquet'</span>)\n<span class="t-kw">GROUP BY</span> region\n<span class="t-kw">ORDER BY</span> total <span class="t-kw">DESC</span>;`,
};

/* ══════════════════════════════════════
   RENDER CARDS
══════════════════════════════════════ */
export function initCards() {
  CATEGORIES.forEach(cat => {
    const cls  = CAT_CSS_CLASS[cat];
    const grid = document.getElementById(`grid-${cls}`);
    if (!grid) return;
    const dbs = DB_NAMES.filter(n => DB_META[n].cat === cat);
    grid.innerHTML = dbs.map(name => cardHTML(name)).join('');
  });
}

function cardHTML(name) {
  const m    = DB_META[name];
  const cls  = CAT_CSS_CLASS[m.cat];
  const logo = DB_LOGOS[name];
  const snippet = SNIPPETS[name] || `<span class="t-cm">-- no snippet</span>`;
  const lang = ['MongoDB','Redis','Amazon DynamoDB','Firebase Firestore','Pinecone','Weaviate','Qdrant','ArangoDB','TigerGraph'].includes(name) ? (name === 'Redis' ? 'Redis' : 'JavaScript') : ['InfluxDB'].includes(name) ? 'Flux' : 'SQL';

  const logoEl = logo
    ? `<div class="db-logo-box"><img src="${logo}" alt="${name} logo" loading="lazy"/></div>`
    : `<div class="db-logo-initials">${name.split(/[\s-]/).map(w=>w[0]).join('').toUpperCase().slice(0,3)}</div>`;

  return `
<div class="db-card ${cls}" data-name="${name.toLowerCase()}" data-cat="${m.cat}">
  <div class="db-card-top">
    ${logoEl}
    <div style="flex:1;min-width:0">
      <div class="db-name">${name}</div>
      <div style="display:flex;gap:.5rem;align-items:center;margin-top:.25rem">
        <span class="badge badge-${cls}">${m.cat}</span>
        <span class="db-scale">${m.scale} scale</span>
      </div>
    </div>
    <div class="db-pop">
      <span class="db-pop-stars">${m.stars}</span>
      <span class="db-pop-rank">#${m.soRank} ${m.cat}</span>
    </div>
  </div>
  <div class="db-desc">${m.useCase}</div>
  <div class="db-meta-row">
    <span class="db-meta-chip">${m.license}</span>
    <span class="db-meta-chip">${m.query}</span>
    <span class="db-meta-chip">${m.hosted.split(',')[0]}</span>
  </div>
  <div class="db-snippet-wrap">
    <div class="code-pane">
      <div class="code-pane-bar">
        <div class="code-pane-dots"><span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span></div>
        <span class="code-pane-lang">${lang}</span>
        <button class="code-pane-copy" onclick="window._copySnippet(this,'${encodeURIComponent(name)}')">copy</button>
      </div>
      <div class="code-pane-body">${snippet}</div>
    </div>
  </div>
  <div class="db-pros-cons">
    <div class="pros-cons-col"><div class="pros-cons-label pros">Strengths</div><div class="pros-cons-text">${m.pros}</div></div>
    <div class="pros-cons-col"><div class="pros-cons-label cons">Weaknesses</div><div class="pros-cons-text">${m.cons}</div></div>
  </div>
  <div class="db-actions">
    <button class="btn btn-sm btn-ghost" onclick="window._addToCompare('${name}')">+ Compare</button>
    <a href="playground.html" class="btn btn-sm btn-ghost">Try query</a>
  </div>
</div>`;
}

window._copySnippet = (btn, encoded) => {
  const name = decodeURIComponent(encoded);
  const raw = (SNIPPETS[name] || '').replace(/<[^>]+>/g, '');
  copyText(raw, btn);
};

/* ══════════════════════════════════════
   SEARCH + FILTER
══════════════════════════════════════ */
export function initSearch() {
  const input   = document.getElementById('searchInput');
  const countEl = document.getElementById('searchCount');
  const pills   = document.querySelectorAll('.cat-pill');
  let activeCat = 'All';

  function run() {
    const q = input?.value.toLowerCase().trim() || '';
    let n = 0;
    DB_NAMES.forEach(name => {
      const m    = DB_META[name];
      const card = document.querySelector(`.db-card[data-name="${name.toLowerCase()}"]`);
      if (!card) return;
      const catOk  = activeCat === 'All' || m.cat === activeCat;
      const textOk = !q || name.toLowerCase().includes(q) || m.useCase.toLowerCase().includes(q) || m.query.toLowerCase().includes(q) || m.cat.toLowerCase().includes(q) || m.pros.toLowerCase().includes(q);
      const show   = catOk && textOk;
      card.classList.toggle('hidden', !show);
      if (show) n++;
    });
    // Hide empty category sections
    CATEGORIES.forEach(cat => {
      const cls = CAT_CSS_CLASS[cat];
      const sec = document.getElementById(`section-${cls}`);
      if (!sec) return;
      const any = [...sec.querySelectorAll('.db-card')].some(c => !c.classList.contains('hidden'));
      sec.classList.toggle('hidden', !any);
    });
    if (countEl) countEl.textContent = (q || activeCat !== 'All') ? `${n} result${n !== 1 ? 's' : ''}` : '';
  }

  input?.addEventListener('input', run);
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      activeCat = pill.dataset.cat;
      pills.forEach(p => p.classList.toggle('active', p === pill));
      run();
    });
  });
}

/* ══════════════════════════════════════
   COMPARATOR
══════════════════════════════════════ */
const ATTRS = [
  { k:'cat',      label:'Category'         },
  { k:'scale',    label:'Scale'            },
  { k:'license',  label:'License'          },
  { k:'query',    label:'Query Language'   },
  { k:'useCase',  label:'Best Use Case'    },
  { k:'hosted',   label:'Hosted Options'   },
  { k:'pros',     label:'Strengths'        },
  { k:'cons',     label:'Weaknesses'       },
  { k:'stars',    label:'Popularity'       },
];

export function initComparator() {
  const selA = document.getElementById('compareA');
  const selB = document.getElementById('compareB');
  if (!selA || !selB) return;
  const opts = DB_NAMES.map(n => `<option>${n}</option>`).join('');
  selA.innerHTML = opts; selB.innerHTML = opts;
  selA.value = 'PostgreSQL'; selB.value = 'MongoDB';
  selA.addEventListener('change', renderComparison);
  selB.addEventListener('change', renderComparison);
  renderComparison();
}

window._addToCompare = name => {
  const selA = document.getElementById('compareA');
  const selB = document.getElementById('compareB');
  if (!selA || !selB) return;
  if (selA.value === name) { showToast(`${name} already in comparator`); }
  else if (selB.value === name) { showToast(`${name} already in comparator`); }
  else { selB.value = name; renderComparison(); }
  document.getElementById('comparator')?.scrollIntoView({ behavior:'smooth' });
  showToast(`${name} added to comparator`);
};

function renderComparison() {
  const a = document.getElementById('compareA')?.value;
  const b = document.getElementById('compareB')?.value;
  const out = document.getElementById('compareResult');
  if (!out || !a || !b) return;
  if (a === b) { out.innerHTML = `<p style="color:var(--text-3);font-family:var(--font-mono);font-size:.8rem">Select two different databases.</p>`; return; }
  const mA = DB_META[a], mB = DB_META[b];
  out.innerHTML = `
    <div style="overflow-x:auto">
    <table class="compare-table">
      <thead><tr><th></th><th class="col-a">${a}</th><th class="col-b">${b}</th></tr></thead>
      <tbody>${ATTRS.map(at => `<tr><td>${at.label}</td><td>${mA[at.k]}</td><td>${mB[at.k]}</td></tr>`).join('')}</tbody>
    </table></div>`;
}
window.renderComparison = renderComparison;

/* ══════════════════════════════════════
   QUIZ
══════════════════════════════════════ */
const QUESTIONS = [
  { q:'What kind of data are you primarily storing?', opts:[
    { t:'Structured / relational',     d:'Tables, rows, foreign keys',      k:'sql'    },
    { t:'Flexible / document',         d:'JSON, nested, varying fields',     k:'nosql'  },
    { t:'Connected / graph data',      d:'Networks, paths, relationships',   k:'graph'  },
    { t:'Time-stamped / metrics',      d:'IoT, telemetry, monitoring',       k:'ts'     },
  ]},
  { q:'What scale are you targeting?', opts:[
    { t:'Small to medium (< 10M rows)',d:'Single server is fine',            k:'small'  },
    { t:'Large (10M–1B rows)',         d:'Needs good indexing and tuning',   k:'large'  },
    { t:'Extreme (billions+)',         d:'Horizontal scaling required',      k:'extreme'},
    { t:'Analytical — large reads',    d:'OLAP, BI, data science',           k:'olap'   },
  ]},
  { q:'How important is ACID consistency?', opts:[
    { t:'Critical — financial / medical',d:'Zero data loss acceptable',     k:'acid'    },
    { t:'Important but flexible',        d:'Occasional lag ok',             k:'flex'    },
    { t:'Eventual is fine',              d:'Speed > perfect consistency',   k:'eventual'},
    { t:'Not relevant for my use case',  d:'Cache, queues, analytics',      k:'none'    },
  ]},
  { q:'What is your primary query pattern?', opts:[
    { t:'Complex JOINs and GROUP BY',  d:'Multi-table analytics, reports',   k:'join'   },
    { t:'Simple key/value lookups',    d:'High throughput, low latency',     k:'kv'     },
    { t:'Full-text or semantic search',d:'Search, RAG, embeddings',          k:'search' },
    { t:'Real-time / streaming reads', d:'Pub/Sub, live feeds, queues',      k:'rt'     },
  ]},
];

const RECS = {
  'sql-small-acid-join':       { db:'PostgreSQL',        why:'The gold standard for relational data. Full ACID, rich SQL, and the best open-source ecosystem.' },
  'sql-large-acid-join':       { db:'PostgreSQL',        why:'PostgreSQL scales well with proper indexing, partitioning, and read replicas.' },
  'sql-extreme-acid-join':     { db:'CockroachDB',       why:'Postgres-compatible SQL with distributed ACID and global horizontal scalability.' },
  'sql-small-acid-kv':         { db:'MySQL',             why:'Fast, simple, and the most widely hosted SQL database. Perfect for web apps.' },
  'sql-large-acid-kv':         { db:'MySQL',             why:'MySQL with read replicas handles most web-scale workloads cleanly.' },
  'sql-olap-none-join':        { db:'DuckDB',            why:'Columnar, in-process analytics. Reads Parquet/CSV natively. Blazing fast for OLAP.' },
  'nosql-small-flex-kv':       { db:'MongoDB',           why:'The richest document query language. Great for flexible JSON data with moderate query needs.' },
  'nosql-large-flex-kv':       { db:'MongoDB',           why:'MongoDB Atlas sharding handles large document workloads well.' },
  'nosql-extreme-eventual-kv': { db:'Apache Cassandra',  why:'Masterless, linearly scalable, built for extreme write throughput across regions.' },
  'nosql-small-none-kv':       { db:'Redis',             why:'Sub-millisecond KV, cache, queues, leaderboards. Best in class for latency.' },
  'nosql-large-none-rt':       { db:'Redis',             why:'Redis Streams handle real-time messaging at scale in cluster mode.' },
  'graph-small-acid-join':     { db:'Neo4j',             why:'Cypher makes deep graph traversal natural. Best-in-class for relationship queries.' },
  'graph-large-flex-join':     { db:'Neo4j',             why:'AuraDB scales Neo4j for cloud workloads.' },
  'graph-extreme-flex-join':   { db:'TigerGraph',        why:'Deep-link analytics at petabyte scale. Built for fraud detection and feature graphs.' },
  'ts-large-none-rt':          { db:'InfluxDB',          why:'Purpose-built for time series. Millions of writes per second, built-in downsampling.' },
  'ts-large-acid-join':        { db:'TimescaleDB',       why:'Full SQL + time functions on Postgres. Best when you need time series AND relational JOINs.' },
  'nosql-large-none-search':   { db:'Weaviate',          why:'Hybrid vector + BM25 search. Open source and excellent for RAG pipelines.' },
  'nosql-extreme-none-search': { db:'Pinecone',          why:'Fully managed, blazing fast ANN search. The go-to for production AI similarity search.' },
};

const FALLBACK = {
  sql:'PostgreSQL', nosql:'MongoDB', graph:'Neo4j', ts:'InfluxDB', default:'PostgreSQL'
};

const ans = {};

export function initQuiz() { renderQ(0); }

function renderQ(idx) {
  const body = document.getElementById('quizBody');
  if (!body) return;
  if (idx >= QUESTIONS.length) { renderResult(); return; }
  const q = QUESTIONS[idx];
  body.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-progress">${QUESTIONS.map((_,i) => `<div class="quiz-step ${i < idx ? 'done' : i === idx ? 'active' : ''}"></div>`).join('')}</div>
      <div class="quiz-q">${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((o,i) => `<div class="quiz-opt" data-i="${i}" tabindex="0" role="button">
          <div class="quiz-opt-title">${o.t}</div>
          <div class="quiz-opt-desc">${o.d}</div>
        </div>`).join('')}
      </div>
    </div>`;
  body.querySelectorAll('.quiz-opt').forEach(opt => {
    const go = () => {
      ans[idx] = q.opts[parseInt(opt.dataset.i)].k;
      body.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      setTimeout(() => renderQ(idx + 1), 380);
    };
    opt.addEventListener('click', go);
    opt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(); });
  });
}

function renderResult() {
  const key = Object.values(ans).join('-');
  const rec = RECS[key] || { db: FALLBACK[ans[0]] || FALLBACK.default, why: 'Based on your answers, this is the most versatile choice for your use case.' };
  const body = document.getElementById('quizBody');
  body.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-result-wrap">
        <div class="quiz-result-label">We recommend</div>
        <div class="quiz-result-db">${rec.db}</div>
        <div class="quiz-result-why">${rec.why}</div>
        <div class="quiz-result-actions">
          <a href="playground.html" class="btn btn-md btn-amber">Try in Playground</a>
          <button class="btn btn-md btn-ghost" onclick="window._restartQuiz()">Retake quiz</button>
        </div>
      </div>
    </div>`;
}
window._restartQuiz = () => { Object.keys(ans).forEach(k => delete ans[k]); renderQ(0); };

/* ══════════════════════════════════════
   USE CASES
══════════════════════════════════════ */
export function initUseCases() {
  const grid = document.getElementById('usecaseGrid');
  if (!grid) return;
  grid.innerHTML = USE_CASES.map(uc => `
    <div class="uc-card">
      <span class="uc-icon">${uc.icon}</span>
      <div class="uc-name">${uc.name}</div>
      <div class="uc-desc">${uc.desc}</div>
      <div class="uc-recs">${uc.rec.map(r => `<span class="uc-rec">${r}</span>`).join('')}</div>
      <div class="uc-avoid">Avoid: <span>${uc.avoid}</span></div>
    </div>`).join('');
}
