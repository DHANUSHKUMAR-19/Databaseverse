/**
 * js/db-data.js
 * Central metadata for all databases — used by cards, comparator, quiz, playground
 */
'use strict';

export const DB_META = {
  MySQL:               { cat:'SQL',         scale:'High',      license:'GPL/Commercial', query:'SQL',              useCase:'Web apps, e-commerce, CMS',           hosted:'PlanetScale, RDS, Railway',      pros:'Huge ecosystem, widely hosted',              cons:'Weaker analytics than Postgres',  stars:'★★★★★', soRank:1 },
  PostgreSQL:          { cat:'SQL',         scale:'High',      license:'PostgreSQL',     query:'SQL (extended)',   useCase:'APIs, analytics, SaaS, fintech',       hosted:'Supabase, Neon, RDS, Render',    pros:'Most feature-rich open-source SQL',          cons:'Higher memory baseline',          stars:'★★★★★', soRank:2 },
  'SQL Server':        { cat:'SQL',         scale:'High',      license:'Commercial',     query:'T-SQL',            useCase:'Enterprise, .NET, BI, ERP',            hosted:'Azure SQL',                      pros:'Best-in-class BI tooling, Azure native',     cons:'Expensive licensing',             stars:'★★★★☆', soRank:4 },
  Oracle:              { cat:'SQL',         scale:'Very High', license:'Commercial',     query:'PL/SQL',           useCase:'Banking, government, large ERP',        hosted:'Oracle Cloud / OCI',             pros:'Battle-tested, RAC clustering',              cons:'Very expensive, vendor lock-in',  stars:'★★★★☆', soRank:6 },
  MariaDB:             { cat:'SQL',         scale:'High',      license:'GPL v2',         query:'SQL',              useCase:'MySQL replacement, shared hosting',     hosted:'PlanetScale, SkySQL, Aiven',     pros:'MySQL-compatible, faster storage engines',   cons:'Smaller community than MySQL',    stars:'★★★★☆', soRank:8 },
  SQLite:              { cat:'SQL',         scale:'Low',       license:'Public Domain',  query:'SQL',              useCase:'Embedded, mobile, local storage, tests',hosted:'Self-embedded (serverless)',     pros:'Zero config, file-based, serverless',        cons:'Not for concurrent writes',       stars:'★★★★★', soRank:5 },
  MongoDB:             { cat:'NoSQL',       scale:'Very High', license:'SSPL',           query:'MQL / Aggregation',useCase:'Flexible data, IoT, content, catalogs', hosted:'Atlas, Render, Railway',         pros:'Rich aggregation pipeline, flexible schema', cons:'No multi-doc ACID by default',    stars:'★★★★★', soRank:1 },
  Redis:               { cat:'NoSQL',       scale:'High',      license:'BSD / RSAL',     query:'Redis CLI',        useCase:'Cache, sessions, queues, leaderboards', hosted:'Upstash, Redis Cloud, Fly.io',   pros:'Sub-millisecond, 5 data structures',         cons:'Data must fit in RAM',            stars:'★★★★★', soRank:3 },
  'Apache Cassandra':  { cat:'NoSQL',       scale:'Extreme',   license:'Apache 2.0',     query:'CQL',              useCase:'IoT, logs, time-ordered streams',        hosted:'Datastax Astra, AWS Keyspaces',  pros:'Linear scale, masterless, no SPOF',          cons:'Eventual consistency only',       stars:'★★★★☆', soRank:6 },
  'Amazon DynamoDB':   { cat:'NoSQL',       scale:'Extreme',   license:'Proprietary',    query:'PartiQL / SDK',    useCase:'Serverless, gaming, mobile backends',    hosted:'AWS only',                       pros:'Zero ops, single-digit ms at any scale',     cons:'Vendor lock-in, complex pricing', stars:'★★★★☆', soRank:7 },
  'Firebase Firestore':{ cat:'NoSQL',       scale:'High',      license:'Proprietary',    query:'Firebase SDK',     useCase:'Mobile apps, real-time collaboration',   hosted:'Google Cloud (managed)',         pros:'Real-time sync, offline support',            cons:'Limited query flexibility',       stars:'★★★★☆', soRank:9 },
  Couchbase:           { cat:'NoSQL',       scale:'High',      license:'Apache 2.0',     query:'N1QL (SQL++)',     useCase:'Mobile-first, edge, enterprise cache',   hosted:'Capella',                        pros:'SQL++ querying, mobile sync',                cons:'Complex setup',                   stars:'★★★☆☆', soRank:14 },
  Neo4j:               { cat:'Graph',       scale:'Medium',    license:'GPL3/Commercial',query:'Cypher',           useCase:'Social graphs, fraud detection, KGs',    hosted:'AuraDB',                         pros:'Best-in-class graph traversal',              cons:'Not for flat/tabular data',       stars:'★★★★☆', soRank:1 },
  ArangoDB:            { cat:'Graph',       scale:'Medium',    license:'Apache 2.0',     query:'AQL',              useCase:'Multi-model, knowledge graphs',          hosted:'ArangoDB Cloud',                 pros:'Graph + document + KV in one',               cons:'Smaller community',               stars:'★★★☆☆', soRank:3 },
  TigerGraph:          { cat:'Graph',       scale:'High',      license:'Commercial',     query:'GSQL',             useCase:'Deep-link analytics, fraud at scale',     hosted:'TigerGraph Cloud',               pros:'Deep traversal at petabyte scale',            cons:'Steep learning curve',            stars:'★★★☆☆', soRank:5 },
  Pinecone:            { cat:'Vector',      scale:'Very High', license:'Proprietary',    query:'REST / Python SDK',useCase:'Semantic search, RAG pipelines, LLMs',    hosted:'Pinecone Cloud (fully managed)',  pros:'Blazing ANN, fully managed',                 cons:'Proprietary, cost at scale',      stars:'★★★★☆', soRank:1 },
  Weaviate:            { cat:'Vector',      scale:'High',      license:'BSD 3-Clause',   query:'GraphQL / REST',   useCase:'Hybrid search, AI-native apps',           hosted:'Weaviate Cloud, self-hosted',    pros:'Hybrid BM25 + vector, open source',          cons:'Resource heavy',                  stars:'★★★★☆', soRank:2 },
  Qdrant:              { cat:'Vector',      scale:'High',      license:'Apache 2.0',     query:'REST / gRPC',      useCase:'Production vector search, filtering',     hosted:'Qdrant Cloud, self-hosted',      pros:'Rust-native, fast, rich filtering',          cons:'Newer, smaller community',        stars:'★★★★☆', soRank:4 },
  InfluxDB:            { cat:'Time-Series', scale:'Very High', license:'MIT',            query:'Flux / InfluxQL',  useCase:'Metrics, IoT telemetry, monitoring',      hosted:'InfluxDB Cloud',                 pros:'Purpose-built, millions of writes/sec',      cons:'Limited relational operations',   stars:'★★★★☆', soRank:1 },
  TimescaleDB:         { cat:'Time-Series', scale:'High',      license:'TSL / Apache',   query:'SQL (Postgres)',   useCase:'Time-series + relational hybrid',         hosted:'Timescale Cloud',                pros:'Full SQL + time functions + compression',     cons:'Requires PostgreSQL',             stars:'★★★★☆', soRank:2 },
  CockroachDB:         { cat:'NewSQL',      scale:'Very High', license:'BSL 1.1',        query:'SQL (Postgres compat)',useCase:'Global distributed ACID, fintech',    hosted:'CockroachDB Cloud',              pros:'Postgres-compatible, globally distributed',  cons:'Higher latency than single-node', stars:'★★★★☆', soRank:1 },
  PlanetScale:         { cat:'NewSQL',      scale:'Very High', license:'Proprietary',    query:'SQL (MySQL compat)',useCase:'Serverless MySQL at scale, branching',   hosted:'PlanetScale Cloud',              pros:'Schema branching, serverless, fast',         cons:'No foreign keys',                 stars:'★★★☆☆', soRank:3 },
  DuckDB:              { cat:'Embedded',    scale:'Medium',    license:'MIT',            query:'SQL',              useCase:'In-process analytics, data science, BI',  hosted:'In-process (no server needed)',  pros:'Columnar OLAP, Parquet/CSV native, fast',    cons:'OLAP only — not for OLTP',        stars:'★★★★★', soRank:4 },
};

export const CATEGORIES = ['SQL','NoSQL','Graph','Vector','Time-Series','NewSQL','Embedded'];

export const CAT_CSS_CLASS = {
  'SQL':         'sql',
  'NoSQL':       'nosql',
  'Graph':       'graph',
  'Vector':      'vector',
  'Time-Series': 'timeseries',
  'NewSQL':      'newsql',
  'Embedded':    'embedded',
};

export const DB_LOGOS = {
  MySQL:       'https://upload.wikimedia.org/wikipedia/en/d/dd/MySQL_logo.svg',
  PostgreSQL:  'https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg',
  MariaDB:     'https://avatars.githubusercontent.com/u/4739304?s=280&v=4',
  MongoDB:     'https://www.svgrepo.com/show/331488/mongodb.svg',
  Redis:       'https://redis.io/wp-content/uploads/2024/04/Logotype.svg',
  Neo4j:       'https://dist.neo4j.com/wp-content/uploads/20230926084108/Logo_FullColor_RGB_TransBG.svg',
};

export const USE_CASES = [
  { icon:'🛒', name:'E-Commerce',           desc:'Products, inventory, orders, payments. ACID required.',              rec:['PostgreSQL','MySQL','Redis (cache)'],            avoid:'MongoDB for financial records' },
  { icon:'💬', name:'Real-Time Chat',        desc:'Live messages, presence, typing indicators. Needs pub/sub.',         rec:['Firebase Firestore','Redis Pub/Sub','Cassandra'], avoid:'PostgreSQL alone (requires polling)' },
  { icon:'🤖', name:'AI / RAG App',          desc:'Semantic search, embedding storage, LLM retrieval pipelines.',       rec:['Pinecone','Weaviate','PostgreSQL + pgvector'],   avoid:'MySQL (no native vector support)' },
  { icon:'📊', name:'Analytics Dashboard',   desc:'Complex GROUP BY over large datasets. BI and reporting.',            rec:['PostgreSQL','TimescaleDB','DuckDB'],             avoid:'MongoDB for large aggregations' },
  { icon:'📱', name:'Mobile App',            desc:'Offline sync, real-time updates, push notifications.',               rec:['Firebase Firestore','Couchbase','Supabase'],     avoid:'Cassandra (no mobile SDK)' },
  { icon:'🌐', name:'Social Network',        desc:'Followers, feeds, friend-of-friend traversal, activity graphs.',     rec:['Neo4j','PostgreSQL','Redis (feeds)'],            avoid:'MongoDB for deep graph traversal' },
  { icon:'🏦', name:'Fintech / Banking',     desc:'Ledgers, transfers, compliance audit trails. Zero data loss.',        rec:['PostgreSQL','CockroachDB','Oracle'],             avoid:'Cassandra (eventual consistency)' },
  { icon:'📡', name:'IoT / Sensor Data',     desc:'Millions of timestamped points, range queries, downsampling.',       rec:['InfluxDB','TimescaleDB','Cassandra'],            avoid:'MySQL (write bottleneck at scale)' },
  { icon:'🎮', name:'Gaming Backend',        desc:'Leaderboards, player state, inventory, matchmaking queues.',         rec:['Redis','DynamoDB','MongoDB'],                   avoid:'PostgreSQL alone at extreme write scale' },
  { icon:'🔍', name:'Search Engine',         desc:'Full-text, faceting, ranking, autocomplete, semantic search.',       rec:['PostgreSQL (FTS)','Weaviate','Qdrant'],          avoid:'MySQL (limited full-text search)' },
  { icon:'📦', name:'Content Management',    desc:'Articles, media assets, nested blocks, flexible schema.',            rec:['MongoDB','PostgreSQL (JSONB)','Firebase'],       avoid:'Oracle (over-engineered for this)' },
  { icon:'⚡', name:'Real-Time Metrics',     desc:'Infrastructure monitoring, alert pipelines, live dashboards.',       rec:['InfluxDB','TimescaleDB','Redis Streams'],        avoid:'SQLite (no network layer)' },
];
