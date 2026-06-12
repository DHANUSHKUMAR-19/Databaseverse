/**
 * js/learn.js
 * Glossary, Interview Q&A, Benchmarks, Migration Guides
 */
'use strict';
import { showToast, copyText } from './nav.js';

/* ══════════════════════════════════════
   DATA
══════════════════════════════════════ */
const GLOSSARY = [
  { term:'ACID',          def:'Atomicity, Consistency, Isolation, Durability. The four properties that guarantee database transactions are processed reliably.',                                            tags:['transactions','SQL'] },
  { term:'BASE',          def:'Basically Available, Soft-state, Eventually consistent. The alternative to ACID used by many distributed NoSQL systems.',                                                   tags:['NoSQL','distributed'] },
  { term:'B-Tree',        def:'Balanced tree data structure used by most relational databases to implement indexes. Provides O(log n) lookups, inserts, and deletes.',                                     tags:['indexing','internals'] },
  { term:'CAP Theorem',   def:'A distributed system can guarantee at most two of: Consistency, Availability, and Partition Tolerance simultaneously.',                                                     tags:['distributed','theory'] },
  { term:'Cardinality',   def:'The number of distinct values in a column. High-cardinality columns (e.g. email, UUID) benefit most from B-Tree indexes.',                                                  tags:['indexing','query-tuning'] },
  { term:'Columnar Store',def:'Storage format that organises data by column rather than by row. Dramatically faster for analytical GROUP BY / aggregate queries. Used by DuckDB, Redshift, BigQuery.',     tags:['OLAP','storage'] },
  { term:'CTE',           def:'Common Table Expression. A named subquery defined with the WITH keyword. Makes complex queries readable and enables recursive queries.',                                     tags:['SQL'] },
  { term:'Cursor',        def:'A database object used to retrieve rows from a result set one at a time, rather than fetching all rows into memory at once.',                                               tags:['SQL','internals'] },
  { term:'Denormalisation',def:'Intentionally introducing redundancy into a schema to improve read performance by reducing JOIN operations. Common in NoSQL and data warehousing.',                        tags:['schema','NoSQL'] },
  { term:'Document Store',def:'A NoSQL database that stores data as self-describing documents (JSON, BSON, XML). MongoDB and CouchDB are the most widely used examples.',                                  tags:['NoSQL'] },
  { term:'EXPLAIN',       def:'SQL command that shows the query execution plan chosen by the optimizer — which indexes it uses, join strategy, estimated row counts, and cost.',                           tags:['query-tuning','SQL'] },
  { term:'Foreign Key',   def:'A column whose value must match a primary key in another table. Enforces referential integrity and models relationships between entities.',                                  tags:['SQL','schema'] },
  { term:'GIN Index',     def:'Generalised Inverted Index. Used in PostgreSQL for full-text search, JSONB fields, and arrays. Slower to build but faster for containment queries.',                       tags:['PostgreSQL','indexing'] },
  { term:'Hash Index',    def:'An index that uses a hash of the key value. Only supports equality lookups (=) but is faster than B-Tree for pure equality.',                                               tags:['indexing','internals'] },
  { term:'Idempotency',   def:'A property of an operation where performing it multiple times produces the same result as performing it once. Critical for distributed messaging and retry logic.',          tags:['distributed','design'] },
  { term:'Index',         def:'A separate data structure that maps column values to row locations, letting the database find rows without a full table scan.',                                               tags:['indexing','performance'] },
  { term:'JOIN',          def:'SQL operation combining rows from two or more tables based on a related column. Types: INNER, LEFT, RIGHT, FULL OUTER, CROSS, SELF.',                                      tags:['SQL'] },
  { term:'LSM Tree',      def:'Log-Structured Merge Tree. Write-optimised storage structure used by RocksDB, Cassandra, and LevelDB. Batches writes in memory then merges sorted files on disk.',        tags:['storage','NoSQL','internals'] },
  { term:'MVCC',          def:'Multi-Version Concurrency Control. Allows readers to see a consistent snapshot of data without blocking writers. Used by PostgreSQL, MySQL InnoDB, and CockroachDB.',      tags:['transactions','internals'] },
  { term:'N+1 Problem',   def:'A performance antipattern where fetching N records triggers N additional queries (one per record) instead of a single JOIN or batch fetch.',                                tags:['performance','ORM'] },
  { term:'Normalisation', def:'Organising a schema to reduce redundancy and dependency. 1NF eliminates repeating groups; 2NF removes partial dependencies; 3NF removes transitive dependencies.',         tags:['SQL','schema'] },
  { term:'OLAP',          def:'Online Analytical Processing. Workload involving complex aggregations over large datasets (BI, reporting). Contrasted with OLTP.',                                         tags:['analytics','architecture'] },
  { term:'OLTP',          def:'Online Transaction Processing. Workload with many short, concurrent read/write transactions (web apps, e-commerce). Optimised for low latency per query.',                 tags:['architecture'] },
  { term:'Pagination',    def:'Retrieving results in pages. OFFSET/LIMIT is simple but slow on large tables. Keyset/cursor pagination (WHERE id > last_id) is far more efficient.',                       tags:['SQL','performance'] },
  { term:'Partitioning',  def:'Splitting a large table into smaller physical pieces based on a key (range, list, hash). Improves query performance and manageability on very large tables.',              tags:['performance','schema'] },
  { term:'Primary Key',   def:'A column (or group of columns) that uniquely identifies each row in a table. Cannot be NULL. The database creates a unique index on it automatically.',                    tags:['SQL','schema'] },
  { term:'Query Plan',    def:'The step-by-step strategy the query optimizer chooses to execute a SQL statement. Visible via EXPLAIN or EXPLAIN ANALYZE.',                                                tags:['query-tuning','internals'] },
  { term:'Replication',   def:'Copying data from one database node (primary) to one or more replicas for redundancy, read scaling, or geographic distribution.',                                          tags:['architecture','distributed'] },
  { term:'Sharding',      def:'Horizontal partitioning where data is split across multiple database servers (shards) based on a shard key. Enables horizontal scaling beyond a single machine.',          tags:['distributed','scaling'] },
  { term:'Transaction',   def:'A unit of work that is either committed entirely or rolled back entirely. Defined by BEGIN / COMMIT / ROLLBACK. The foundation of ACID compliance.',                        tags:['transactions','SQL'] },
  { term:'UUID',          def:'Universally Unique Identifier. 128-bit value used as a primary key when globally unique IDs are needed across distributed systems. Version 4 is random.',                  tags:['schema','distributed'] },
  { term:'WAL',           def:'Write-Ahead Log. A technique where changes are written to a log before being applied to data files. Enables crash recovery, streaming replication, and PITR.',             tags:['internals','PostgreSQL'] },
  { term:'Window Function',def:'SQL function that computes a value across a set of related rows ("window") without collapsing them into one row. E.g. RANK(), LAG(), SUM() OVER (PARTITION BY ...).',   tags:['SQL'] },
];

const IQA = [
  {
    n:1, diff:'easy', q:'What is the difference between DELETE, TRUNCATE, and DROP?',
    a:'DELETE removes specific rows and can be rolled back (logged). TRUNCATE removes all rows instantly with minimal logging, cannot be rolled back in most databases, but keeps the table structure. DROP removes the entire table structure and all its data permanently.',
    tags:['SQL','DDL'],
  },
  {
    n:2, diff:'easy', q:'What is a primary key and how does it differ from a unique key?',
    a:'A primary key uniquely identifies each row and cannot be NULL. A table can have only one primary key. A unique key also enforces uniqueness but can contain NULL values (typically one per column), and a table can have multiple unique keys.',
    tags:['SQL','schema'],
  },
  {
    n:3, diff:'easy', q:'What are the types of JOINs in SQL?',
    a:'INNER JOIN returns only matching rows from both tables. LEFT JOIN returns all rows from the left table plus matches from the right. RIGHT JOIN is the mirror. FULL OUTER JOIN returns all rows from both sides. CROSS JOIN returns the Cartesian product. SELF JOIN joins a table to itself.',
    tags:['SQL'],
  },
  {
    n:4, diff:'easy', q:'What is an index and when should you use one?',
    a:'An index is a data structure (usually a B-Tree) that maps column values to row locations, avoiding a full table scan. Use indexes on columns that appear in WHERE clauses, JOIN conditions, and ORDER BY. Avoid over-indexing — every index slows writes and uses disk space.',
    tags:['indexing','performance'],
  },
  {
    n:5, diff:'easy', q:'What is the difference between SQL and NoSQL databases?',
    a:'SQL databases use a fixed schema and tables with rows. They excel at complex queries and strong consistency (ACID). NoSQL databases use flexible schemas (documents, key-value, graph, or time-series). They trade some consistency guarantees for higher write throughput, horizontal scalability, or flexible data models.',
    tags:['SQL','NoSQL'],
  },
  {
    n:6, diff:'medium', q:'Explain the N+1 query problem and how to fix it.',
    a:'N+1 occurs when fetching N parent records triggers N additional queries to fetch their children one by one, instead of a single JOIN. Fix it by eager loading with a JOIN or IN clause, using ORM eager loading options (include/preload), or batching with a dataloader pattern.',
    tags:['performance','ORM'],
  },
  {
    n:7, diff:'medium', q:'What is MVCC and why does PostgreSQL use it?',
    a:'Multi-Version Concurrency Control maintains multiple versions of a row so readers never block writers and writers never block readers. PostgreSQL uses it to implement snapshot isolation — every transaction sees a consistent view of the data as of when it began, without taking read locks.',
    tags:['PostgreSQL','transactions','internals'],
  },
  {
    n:8, diff:'medium', q:'What is the difference between OLTP and OLAP workloads?',
    a:'OLTP (Online Transaction Processing) handles many short, concurrent transactions — typical for web apps. It needs low latency per query and high write throughput. OLAP (Online Analytical Processing) runs complex aggregations over large datasets for BI and reporting. It needs fast full-table scans and benefits from columnar storage.',
    tags:['architecture','analytics'],
  },
  {
    n:9, diff:'medium', q:'When would you use a partial index?',
    a:"A partial index is built on a subset of rows matching a WHERE condition. Example: CREATE INDEX ON orders (user_id) WHERE status = 'pending'. The index is much smaller and faster to scan than a full index. Ideal when queries almost always filter on a low-cardinality column with a common value.",
    tags:['indexing','PostgreSQL'],
  },
  {
    n:10, diff:'medium', q:'What is database sharding? What are its trade-offs?',
    a:"Sharding splits data across multiple servers using a shard key. It enables horizontal write scaling beyond a single machine. Trade-offs: cross-shard JOINs become expensive or impossible; rebalancing is complex; transactions spanning shards lose ACID guarantees unless you implement distributed transactions.",
    tags:['distributed','scaling'],
  },
  {
    n:11, diff:'medium', q:'Explain the CAP theorem with a real example.',
    a:"CAP says a distributed system can guarantee at most two of Consistency (every read sees the latest write), Availability (every request gets a response), and Partition Tolerance (the system works despite network failures). Example: if a network partition separates two nodes, you choose to either reject writes until partition heals (CP — like ZooKeeper) or accept stale reads (AP — like DynamoDB).",
    tags:['distributed','theory'],
  },
  {
    n:12, diff:'hard', q:'How does Write-Ahead Logging (WAL) enable crash recovery?',
    a:"WAL writes changes to a sequential log file before applying them to the actual data pages. On crash, the database replays the WAL from the last checkpoint to restore any committed transactions that hadn't been flushed to disk, and discards any uncommitted changes. This is why PostgreSQL can recover from an unexpected shutdown without data corruption.",
    tags:['internals','PostgreSQL'],
  },
  {
    n:13, diff:'hard', q:'What is the difference between keyset pagination and OFFSET pagination?',
    a:"OFFSET pagination (LIMIT 20 OFFSET 1000) makes the database scan and discard 1000 rows each time — it gets slower as you go deeper. Keyset pagination (WHERE id > last_seen_id ORDER BY id LIMIT 20) always hits the index directly at the right starting point, giving consistent O(log n) performance regardless of page depth. The trade-off is that keyset requires a stable sort key and does not support arbitrary page jumps.",
    tags:['SQL','performance'],
  },
  {
    n:14, diff:'hard', q:'How does a LSM Tree differ from a B-Tree for storage, and why does Cassandra use it?',
    a:"B-Trees do in-place updates — good for reads but require random disk writes. LSM Trees batch writes in an in-memory structure (MemTable), flush sorted SSTables to disk sequentially, and merge them in the background (compaction). This makes writes extremely fast (sequential I/O) at the cost of slower reads (may check multiple SSTables) and write amplification during compaction. Cassandra uses LSM because it is optimised for high-throughput, append-heavy write workloads like IoT and event logs.",
    tags:['internals','NoSQL','Cassandra'],
  },
  {
    n:15, diff:'hard', q:'Design a schema for a social feed where users can follow each other and see posts from people they follow.',
    a:"Core tables: users (id, name, created_at), posts (id, user_id, body, created_at), follows (follower_id, following_id, created_at). Index follows on (follower_id) and posts on (user_id, created_at DESC). Feed query: SELECT p.* FROM posts p JOIN follows f ON f.following_id = p.user_id WHERE f.follower_id = ? ORDER BY p.created_at DESC LIMIT 20. At scale, pre-compute fan-out feeds with Redis sorted sets keyed by user_id, trading storage for read latency.",
    tags:['schema','design','SQL'],
  },
];

const BENCHMARKS = [
  {
    title:'Write Throughput (ops/sec, single node)',
    desc:'Sustained insert performance under load. NoSQL stores optimised for writes lead significantly.',
    rows:[
      { label:'Redis (in-mem)',   val:1000000, display:'~1,000,000' },
      { label:'Cassandra',        val:500000,  display:'~500,000'   },
      { label:'MongoDB',          val:120000,  display:'~120,000'   },
      { label:'PostgreSQL',       val:80000,   display:'~80,000'    },
      { label:'MySQL InnoDB',     val:70000,   display:'~70,000'    },
      { label:'SQLite (WAL)',     val:50000,   display:'~50,000'    },
    ],
  },
  {
    title:'Read Throughput (ops/sec, single key lookup)',
    desc:'Simple primary-key read with warm cache. In-memory databases dominate.',
    rows:[
      { label:'Redis (in-mem)',   val:2000000, display:'~2,000,000' },
      { label:'MySQL (index)',    val:500000,  display:'~500,000'   },
      { label:'PostgreSQL',       val:400000,  display:'~400,000'   },
      { label:'MongoDB Atlas',    val:250000,  display:'~250,000'   },
      { label:'Cassandra',        val:200000,  display:'~200,000'   },
      { label:'DynamoDB',         val:150000,  display:'~150,000'   },
    ],
  },
  {
    title:'Analytical Query Time (10M rows GROUP BY)',
    desc:'Lower is better. Columnar engines designed for OLAP lead by an order of magnitude.',
    rows:[
      { label:'DuckDB (columnar)', val:95,  display:'0.08s', invert:true },
      { label:'PostgreSQL (idx)', val:60,   display:'0.4s',  invert:true },
      { label:'MySQL',            val:40,   display:'1.2s',  invert:true },
      { label:'MongoDB agg',      val:25,   display:'2.5s',  invert:true },
      { label:'SQLite',           val:15,   display:'4.8s',  invert:true },
    ],
  },
  {
    title:'Vector Search ANN Recall @ top-10 (1M vectors)',
    desc:'Higher recall = more accurate nearest-neighbour results. Specialised engines outperform general databases.',
    rows:[
      { label:'Qdrant (HNSW)',    val:99, display:'99%'  },
      { label:'Pinecone',         val:98, display:'98%'  },
      { label:'Weaviate (HNSW)',  val:97, display:'97%'  },
      { label:'Postgres pgvector',val:82, display:'82%'  },
      { label:'SQLite-vss',       val:68, display:'68%'  },
    ],
  },
];

const MIGRATIONS = [
  {
    from:'MySQL', to:'PostgreSQL', diff:'medium',
    steps:[
      'Export schema with mysqldump --no-data and convert types: TINYINT(1) to BOOLEAN, AUTO_INCREMENT to SERIAL, DATETIME to TIMESTAMPTZ.',
      'Use pgloader (preferred) or pg_dump-compatible tool to migrate data. Run: pgloader mysql://user:pass@host/db postgresql://user:pass@host/db',
      'Replace MySQL-specific syntax: IFNULL() with COALESCE(), LIMIT x,y with LIMIT x OFFSET y, backtick identifiers with double quotes.',
      'Recreate indexes and FULLTEXT search with PostgreSQL FTS (tsvector / GIN indexes).',
      'Run ANALYZE to update table statistics, then test all queries via EXPLAIN ANALYZE.',
    ],
    cmd:'pgloader mysql://user@host/mydb postgresql://user@host/mydb',
  },
  {
    from:'MongoDB', to:'PostgreSQL', diff:'hard',
    steps:[
      'Map document structure to a relational schema. Decide which nested arrays become child tables and which become JSONB columns.',
      'Export MongoDB collections to JSON with mongoexport --collection=users --out=users.json',
      'Write a migration script (Python/Node) that reads JSON and inserts into PostgreSQL using COPY or batch INSERT.',
      'Rewrite MQL queries to SQL. $match becomes WHERE; $group becomes GROUP BY; $lookup becomes JOIN.',
      'Add indexes based on your query patterns. Use JSONB GIN indexes for any remaining semi-structured fields.',
    ],
    cmd:'mongoexport --collection=users --out=users.json',
  },
  {
    from:'PostgreSQL', to:'CockroachDB', diff:'easy',
    steps:[
      'CockroachDB is PostgreSQL-wire-compatible. Most applications need zero SQL changes.',
      'Export schema with pg_dump --schema-only, review for unsupported features (stored procedures, some data types).',
      'Use IMPORT INTO with CSV or use the CockroachDB migration tool: cockroach userfile upload.',
      'Choose a primary key that distributes writes evenly across nodes. Avoid monotonically increasing integer PKs — use UUID or hash-based PKs to prevent hotspots.',
      'Test with SHOW JOBS to monitor replication and verify data with SELECT count(*) on each table.',
    ],
    cmd:'cockroach userfile upload ./data.sql',
  },
  {
    from:'Redis', to:'PostgreSQL', diff:'medium',
    steps:[
      'Identify data structures: Strings become key-value rows; Hashes become JSON or normalised tables; Sorted Sets become tables with a score column and ORDER BY queries.',
      'Use redis-cli --pipe or DUMP/RESTORE for bulk export, or write a Redis SCAN loop to extract to CSV.',
      'Design the target schema. A generic KV table (key TEXT, value JSONB, expires_at TIMESTAMPTZ) works for caches. Business data should be normalised.',
      'Implement TTL logic with pg_cron or a background job that runs DELETE FROM cache WHERE expires_at < NOW().',
      'Benchmark latency — PostgreSQL KV queries will be slower than Redis. Cache critical paths with Redis or Memcached in front of Postgres.',
    ],
    cmd:'redis-cli --scan --pattern "user:*" | xargs redis-cli MGET',
  },
  {
    from:'SQLite', to:'PostgreSQL', diff:'easy',
    steps:[
      'Export schema and data: sqlite3 mydb.db .dump > dump.sql',
      'Clean up the dump: remove SQLite-specific pragmas (PRAGMA journal_mode), convert INTEGER PRIMARY KEY to SERIAL, replace AUTOINCREMENT, fix date literals.',
      'Import with psql: psql -d mydb -f dump.sql -- fix errors iteratively.',
      'Update connection string from file path to postgresql://user:pass@host:5432/dbname.',
      'Add indexes — SQLite auto-creates one per primary key but Postgres may need additional indexes depending on your query patterns.',
    ],
    cmd:"sqlite3 mydb.db '.dump' | psql -d mydb",
  },
  {
    from:'DynamoDB', to:'PostgreSQL', diff:'hard',
    steps:[
      'Export DynamoDB table to S3 as JSON using DynamoDB Export to S3 (point-in-time).',
      'Analyse access patterns. DynamoDB forces you to model for one or two access patterns. Postgres can handle all of them. Normalise accordingly.',
      'Write a transformation script to flatten DynamoDB JSON (including type descriptors like { "S": "alice" }) into plain rows.',
      'Load with COPY FROM or pg_bulkload for maximum throughput.',
      'Rewrite all PartiQL or SDK queries to SQL. Replace KeyConditionExpression with WHERE clauses and GSI queries with indexed columns.',
    ],
    cmd:'aws dynamodb export-to-dynamodb-json --table-name MyTable --s3-bucket mybucket',
  },
];

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
export function initLearn() {
  // Tab switching
  document.querySelectorAll('.learn-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.learn-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.learn-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.section)?.classList.add('active');
    });
  });

  initGlossary();
  initIQA();
  initBenchmarks();
  initMigrations();
}

/* ── GLOSSARY ── */
function initGlossary() {
  const grid = document.getElementById('glossaryGrid');
  if (!grid) return;

  function render(filter = '', letter = '') {
    const items = GLOSSARY
      .filter(g => {
        const textOk = !filter || g.term.toLowerCase().includes(filter) || g.def.toLowerCase().includes(filter);
        const alphaOk = !letter || g.term.toUpperCase().startsWith(letter);
        return textOk && alphaOk;
      })
      .sort((a, b) => a.term.localeCompare(b.term));

    grid.innerHTML = items.length
      ? items.map(g => `
          <div class="gterm">
            <div class="gterm-word">${g.term}</div>
            <div class="gterm-def">${g.def}</div>
            <div class="gterm-tags">${g.tags.map(t => `<span class="gterm-tag">${t}</span>`).join('')}</div>
          </div>`).join('')
      : `<div style="color:var(--text-3);font-family:var(--font-mono);grid-column:1/-1">No terms found.</div>`;
  }

  render();

  document.getElementById('glossarySearch')?.addEventListener('input', e => {
    document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
    render(e.target.value.toLowerCase().trim(), '');
  });

  document.querySelectorAll('.alpha-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const input = document.getElementById('glossarySearch');
      if (input) input.value = '';
      render('', btn.dataset.letter || '');
    });
  });
}

/* ── INTERVIEW Q&A ── */
function initIQA() {
  const grid = document.getElementById('iqaGrid');
  if (!grid) return;

  function render(diff = '', q = '') {
    const items = IQA.filter(i => {
      const diffOk = !diff || i.diff === diff;
      const textOk = !q || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q);
      return diffOk && textOk;
    });

    grid.innerHTML = items.length
      ? items.map(i => `
          <div class="iqa-card" data-diff="${i.diff}">
            <div class="iqa-q">
              <span class="iqa-num">#${i.n}</span>
              <span style="flex:1">${i.q}</span>
              <span class="badge badge-${i.diff === 'easy' ? 'easy' : i.diff === 'medium' ? 'med' : 'hard'}">${i.diff}</span>
              <span class="iqa-chevron">&#9660;</span>
            </div>
            <div class="iqa-a">${i.a}</div>
          </div>`).join('')
      : `<div style="color:var(--text-3);font-family:var(--font-mono);grid-column:1/-1">No questions found.</div>`;

    grid.querySelectorAll('.iqa-card').forEach(card => {
      card.querySelector('.iqa-q')?.addEventListener('click', () => card.classList.toggle('open'));
    });
  }

  render();

  let activeDiff = '';
  document.querySelectorAll('.iqa-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.iqa-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDiff = btn.dataset.diff || '';
      render(activeDiff, document.getElementById('iqaSearch')?.value.toLowerCase() || '');
    });
  });

  document.getElementById('iqaSearch')?.addEventListener('input', e => {
    render(activeDiff, e.target.value.toLowerCase());
  });
}

/* ── BENCHMARKS ── */
function initBenchmarks() {
  const grid = document.getElementById('benchGrid');
  if (!grid) return;

  grid.innerHTML = BENCHMARKS.map(b => `
    <div class="bench-card">
      <div class="bench-title">${b.title}</div>
      <div class="bench-desc">${b.desc}</div>
      <div class="bench-rows">
        ${b.rows.map(r => {
          const pct = Math.round((r.val / b.rows[0].val) * 100);
          return `
          <div class="bench-row">
            <div class="bench-label">${r.label}</div>
            <div class="bench-track"><div class="bench-fill" data-pct="${pct}"></div></div>
            <div class="bench-val">${r.display}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');

  // Animate bars when scrolled into view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.bench-fill').forEach(bar => {
          bar.style.width = (bar.dataset.pct || 0) + '%';
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  grid.querySelectorAll('.bench-card').forEach(card => observer.observe(card));
}

/* ── MIGRATIONS ── */
function initMigrations() {
  const grid = document.getElementById('migrationGrid');
  if (!grid) return;

  grid.innerHTML = MIGRATIONS.map(m => `
    <div class="migration-card">
      <div class="migration-head">
        <div class="migration-dbs">
          <span style="color:var(--amber)">${m.from}</span>
          <span class="migration-arrow"> &#8594; </span>
          <span style="color:var(--teal)">${m.to}</span>
        </div>
        <span class="migration-diff diff-${m.diff}">${m.diff}</span>
      </div>
      <div class="migration-body">
        ${m.steps.map((step, i) => `
          <div class="migration-step">
            <span class="step-num">${i + 1}</span>
            <span>${step}</span>
          </div>`).join('')}
        <code class="migration-cmd">${m.cmd}</code>
      </div>
    </div>`).join('');
}
