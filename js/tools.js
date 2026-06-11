/**
 * tools.js - All developer tools
 * 1. Schema Designer (with DDL generation)
 * 2. Connection String Builder
 * 3. Regex Tester
 * 4. JSON Path Tester
 * 5. Data Type Cheatsheet
 * 6. Index Advisor
 */
'use strict';

import { copyText, showToast } from './nav.js';

/* ═══════════════════════════════════════════════════
   1. SCHEMA DESIGNER
   ═══════════════════════════════════════════════════ */
const TYPE_OPTIONS = ['SERIAL','INTEGER','BIGINT','SMALLINT','FLOAT','DECIMAL(10,2)','VARCHAR(255)','TEXT','CHAR(10)','BOOLEAN','DATE','TIMESTAMP','TIMESTAMPTZ','UUID','JSON','JSONB','BYTEA','ARRAY'];

export function initSchemaDesigner() {
  renderSchemaFields();
  generateDDL();

  document.getElementById('schTableName')?.addEventListener('input', generateDDL);
  document.getElementById('schDialect')?.addEventListener('change', generateDDL);
  document.getElementById('schIfNotExists')?.addEventListener('change', generateDDL);
  document.getElementById('schTimestamps')?.addEventListener('change', () => { syncTimestampFields(); generateDDL(); });
}

function renderSchemaFields() {
  const container = document.getElementById('schFields');
  if (!container) return;
  // Default fields
  const defaults = [
    { name:'id',         type:'SERIAL',      pk:true,  nn:true,  uq:false },
    { name:'name',       type:'VARCHAR(255)', pk:false, nn:true,  uq:false },
    { name:'email',      type:'VARCHAR(255)', pk:false, nn:true,  uq:true  },
    { name:'created_at', type:'TIMESTAMP',    pk:false, nn:false, uq:false },
  ];
  container.innerHTML = defaults.map((f,i) => buildFieldRow(f, i)).join('');
}

function buildFieldRow(f = {}, idx = Date.now()) {
  const opts = TYPE_OPTIONS.map(t => `<option${f.type===t?' selected':''}>${t}</option>`).join('');
  return `<div class="schema-field-row" data-idx="${idx}">
    <input type="text" class="field-input sf-name" placeholder="column_name" value="${f.name||''}" oninput="window.generateDDL()" />
    <select class="field-select sf-type" onchange="window.generateDDL()">${opts}</select>
    <div style="display:flex;gap:0.3rem;align-items:center;flex-shrink:0">
      <label title="Primary Key"  style="font-family:var(--mono);font-size:0.65rem;color:var(--text-muted);cursor:pointer;user-select:none;display:flex;gap:0.2rem;align-items:center"><input type="checkbox" class="sf-pk"  ${f.pk?'checked':''} onchange="window.generateDDL()" style="accent-color:var(--cyan)"> PK</label>
      <label title="Not Null"     style="font-family:var(--mono);font-size:0.65rem;color:var(--text-muted);cursor:pointer;user-select:none;display:flex;gap:0.2rem;align-items:center"><input type="checkbox" class="sf-nn"  ${f.nn?'checked':''} onchange="window.generateDDL()" style="accent-color:var(--cyan)"> NN</label>
      <label title="Unique"       style="font-family:var(--mono);font-size:0.65rem;color:var(--text-muted);cursor:pointer;user-select:none;display:flex;gap:0.2rem;align-items:center"><input type="checkbox" class="sf-uq"  ${f.uq?'checked':''} onchange="window.generateDDL()" style="accent-color:var(--cyan)"> UQ</label>
    </div>
    <button class="btn btn-sm btn-danger" onclick="window.removeSchField(this)" style="flex-shrink:0" title="Remove column">&#10005;</button>
  </div>`;
}

window.addSchField = () => {
  const container = document.getElementById('schFields');
  if (!container) return;
  container.insertAdjacentHTML('beforeend', buildFieldRow());
  generateDDL();
};

window.removeSchField = (btn) => {
  const rows = document.querySelectorAll('.schema-field-row');
  if (rows.length <= 1) return;
  btn.closest('.schema-field-row').remove();
  generateDDL();
};

function syncTimestampFields() {
  if (!document.getElementById('schTimestamps')?.checked) return;
  const container = document.getElementById('schFields');
  if (!container) return;
  const names = [...container.querySelectorAll('.sf-name')].map(i=>i.value.trim());
  if (!names.includes('created_at')) container.insertAdjacentHTML('beforeend', buildFieldRow({name:'created_at',type:'TIMESTAMP',nn:false,pk:false,uq:false}));
  if (!names.includes('updated_at')) container.insertAdjacentHTML('beforeend', buildFieldRow({name:'updated_at',type:'TIMESTAMP',nn:false,pk:false,uq:false}));
}

window.generateDDL = () => {
  const table   = (document.getElementById('schTableName')?.value || '').trim() || 'my_table';
  const dialect = document.getElementById('schDialect')?.value || 'postgres';
  const ine      = document.getElementById('schIfNotExists')?.checked;
  const rows    = document.querySelectorAll('.schema-field-row');

  const fields = [];
  const pks    = [];

  rows.forEach(row => {
    const name = row.querySelector('.sf-name')?.value.trim();
    let   type = row.querySelector('.sf-type')?.value || 'TEXT';
    const isPK = row.querySelector('.sf-pk')?.checked;
    const isNN = row.querySelector('.sf-nn')?.checked;
    const isUQ = row.querySelector('.sf-uq')?.checked;
    if (!name) return;

    // Dialect adjustments
    if (dialect === 'mysql') {
      if (type === 'SERIAL') type = 'INT AUTO_INCREMENT';
      if (type === 'BOOLEAN') type = 'TINYINT(1)';
      if (type === 'JSONB')   type = 'JSON';
      if (type === 'TIMESTAMPTZ') type = 'TIMESTAMP';
      if (type === 'UUID')    type = 'CHAR(36)';
    }
    if (dialect === 'sqlite') {
      if (type === 'SERIAL')              type = 'INTEGER';
      if (type.startsWith('VARCHAR'))     type = 'TEXT';
      if (type.startsWith('CHAR'))        type = 'TEXT';
      if (type === 'DECIMAL(10,2)')       type = 'REAL';
      if (type === 'FLOAT')               type = 'REAL';
      if (type.includes('TIMESTAMP'))     type = 'TEXT';
      if (type === 'JSONB' || type === 'JSON') type = 'TEXT';
      if (type === 'UUID')                type = 'TEXT';
      if (type === 'BYTEA')               type = 'BLOB';
    }

    let line = `  ${name.padEnd(22)}${type}`;
    if (isPK && rows.length > 1) pks.push(name);
    else if (isPK)              line += ' PRIMARY KEY';
    if (isNN)                   line += ' NOT NULL';
    if (isUQ)                   line += ' UNIQUE';

    // Smart defaults
    if (name === 'created_at' && type.includes('TIMESTAMP')) {
      line += dialect === 'sqlite' ? ' DEFAULT CURRENT_TIMESTAMP' : ' DEFAULT NOW()';
    }
    if (name === 'updated_at' && type.includes('TIMESTAMP') && dialect === 'postgres') {
      line += ' DEFAULT NOW()';
    }
    if (name === 'id' && type === 'UUID' && dialect === 'postgres') {
      line += ' DEFAULT gen_random_uuid()';
    }
    fields.push(line);
  });

  if (pks.length > 1) fields.push(`  PRIMARY KEY (${pks.join(', ')})`);

  // Build DDL
  const kw = s => `<span class="kw">${s}</span>`;
  const fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`;
  const st = s => `<span class="str">${s}</span>`;

  const tableClause = ine ? `${kw('CREATE TABLE IF NOT EXISTS')} ${table}` : `${kw('CREATE TABLE')} ${table}`;
  let ddl = `${tableClause} (\n${fields.join(',\n')}\n);\n`;

  // Add trigger for updated_at in postgres
  if (dialect === 'postgres' && fields.some(f => f.includes('updated_at'))) {
    ddl += `\n${cm('-- Auto-update trigger for updated_at')}\n${kw('CREATE OR REPLACE FUNCTION')} ${fn('set_updated_at')}()\n${kw('RETURNS TRIGGER AS')} $$\n${kw('BEGIN')}\n  NEW.updated_at = NOW();\n  ${kw('RETURN')} NEW;\n${kw('END')}; $$ ${kw('LANGUAGE')} plpgsql;\n\n${kw('CREATE TRIGGER')} ${table}_updated_at\n  ${kw('BEFORE UPDATE ON')} ${table}\n  ${kw('FOR EACH ROW EXECUTE FUNCTION')} ${fn('set_updated_at')}();\n`;
  }

  // Insert example
  const nonAuto = [...document.querySelectorAll('.schema-field-row')]
    .map(r => r.querySelector('.sf-name')?.value.trim())
    .filter(n => n && n !== 'id' && !n.endsWith('_at'));
  if (nonAuto.length > 0) {
    ddl += `\n${cm('-- Example INSERT')}\n${kw('INSERT INTO')} ${table} (${nonAuto.join(', ')})\n${kw('VALUES')} (${nonAuto.map(n => st("'value'")).join(', ')});\n`;
  }

  ddl += `\n${cm('-- Query')}\n${kw('SELECT')} * ${kw('FROM')} ${table};`;

  const pre = document.getElementById('schemaOutput');
  if (pre) pre.innerHTML = ddl;
};

window.copyDDL = () => {
  const pre = document.getElementById('schemaOutput');
  const btn = document.getElementById('schemaCopyBtn');
  if (pre) copyText(pre.innerText, btn);
};

/* ═══════════════════════════════════════════════════
   2. CONNECTION STRING BUILDER
   ═══════════════════════════════════════════════════ */
const CONN_DEFAULTS = {
  postgres: { driver:'postgresql', host:'localhost', port:'5432', db:'mydb', user:'postgres', pass:'password' },
  mysql:    { driver:'mysql',       host:'localhost', port:'3306', db:'mydb', user:'root',     pass:'password' },
  mongodb:  { driver:'mongodb',     host:'localhost', port:'27017',db:'mydb', user:'admin',    pass:'password' },
  redis:    { driver:'redis',       host:'localhost', port:'6379', db:'0',    user:'',         pass:'' },
  mssql:    { driver:'mssql',       host:'localhost', port:'1433', db:'mydb', user:'sa',       pass:'password' },
};

export function initConnBuilder() {
  const dbSel = document.getElementById('connDB');
  if (!dbSel) return;
  dbSel.addEventListener('change', () => {
    const def = CONN_DEFAULTS[dbSel.value] || CONN_DEFAULTS.postgres;
    document.getElementById('connHost').value  = def.host;
    document.getElementById('connPort').value  = def.port;
    document.getElementById('connName').value  = def.db;
    document.getElementById('connUser').value  = def.user;
    document.getElementById('connPass').value  = def.pass;
    buildConnString();
  });

  ['connDB','connHost','connPort','connName','connUser','connPass','connSSL'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', buildConnString);
    document.getElementById(id)?.addEventListener('change', buildConnString);
  });

  buildConnString();
}

window.buildConnString = () => {
  const db   = document.getElementById('connDB')?.value   || 'postgres';
  const host = document.getElementById('connHost')?.value || 'localhost';
  const port = document.getElementById('connPort')?.value || '5432';
  const name = document.getElementById('connName')?.value || 'mydb';
  const user = document.getElementById('connUser')?.value || '';
  const pass = document.getElementById('connPass')?.value || '';
  const ssl  = document.getElementById('connSSL')?.checked;
  const sslParam = ssl ? '?sslmode=require' : '';
  const sslMongo = ssl ? '?tls=true' : '';

  const auth = user ? (pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : `${encodeURIComponent(user)}@`) : '';

  let str = '';
  switch(db) {
    case 'postgres': str = `postgresql://${auth}${host}:${port}/${name}${sslParam}`; break;
    case 'mysql':    str = `mysql://${auth}${host}:${port}/${name}${sslParam}`; break;
    case 'mongodb':  str = `mongodb://${auth}${host}:${port}/${name}${sslMongo}`; break;
    case 'redis':    str = pass ? `redis://:${encodeURIComponent(pass)}@${host}:${port}/${name}` : `redis://${host}:${port}/${name}`; break;
    case 'mssql':    str = `Server=${host},${port};Database=${name};User Id=${user};Password=${pass};${ssl?'Encrypt=True;':''}TrustServerCertificate=False;`; break;
    default: str = `${db}://${auth}${host}:${port}/${name}`;
  }

  const display = document.getElementById('connDisplay');
  if (display) display.textContent = str;
};

window.copyConnString = () => {
  const text = document.getElementById('connDisplay')?.textContent || '';
  copyText(text);
};

/* ═══════════════════════════════════════════════════
   3. REGEX TESTER
   ═══════════════════════════════════════════════════ */
export function initRegexTester() {
  const patternEl = document.getElementById('regexPattern');
  const flagsEl   = document.getElementById('regexFlags');
  const testEl    = document.getElementById('regexTest');

  if (!patternEl || !testEl) return;

  const update = () => testRegex();
  patternEl.addEventListener('input', update);
  flagsEl?.addEventListener('input', update);
  testEl.addEventListener('input', update);
}

window.testRegex = () => {
  const pattern = document.getElementById('regexPattern')?.value || '';
  const flags   = (document.getElementById('regexFlags')?.value || 'g').replace(/[^gimsuy]/g, '');
  const test    = document.getElementById('regexTest')?.value || '';
  const statsEl = document.getElementById('regexStats');
  const matchEl = document.getElementById('regexMatches');

  if (!pattern) {
    document.getElementById('regexHighlight').innerHTML = escHtml(test);
    if (statsEl) statsEl.textContent = '';
    if (matchEl) matchEl.innerHTML = '';
    return;
  }

  try {
    const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    const matches = [...test.matchAll(re)];

    // Highlight
    let highlighted = '', last = 0;
    matches.forEach(m => {
      highlighted += escHtml(test.slice(last, m.index));
      highlighted += `<mark class="regex-match">${escHtml(m[0])}</mark>`;
      last = m.index + m[0].length;
    });
    highlighted += escHtml(test.slice(last));
    document.getElementById('regexHighlight').innerHTML = highlighted || escHtml(test);

    // Stats
    if (statsEl) statsEl.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`;

    // Match list
    if (matchEl) {
      matchEl.innerHTML = matches.slice(0, 20).map((m, i) => `
        <div class="regex-match-item">
          [${i}] index:${m.index}  match: "${escHtml(m[0])}"${m.length > 1 ? `  groups: ${m.slice(1).map(g=>`"${escHtml(g||'')}""`).join(', ')}` : ''}
        </div>`).join('');
    }
  } catch(e) {
    document.getElementById('regexHighlight').innerHTML = `<span style="color:var(--red)">${escHtml(e.message)}</span>`;
    if (statsEl) statsEl.textContent = '';
  }
};

/* ═══════════════════════════════════════════════════
   4. JSON PATH TESTER
   ═══════════════════════════════════════════════════ */
const DEFAULT_JSON = JSON.stringify({
  users: [
    { id: 1, name: 'Alice', role: 'admin', scores: [95, 88, 92] },
    { id: 2, name: 'Bob',   role: 'user',  scores: [72, 80, 78] },
    { id: 3, name: 'Carol', role: 'admin', scores: [88, 91, 95] },
  ],
  meta: { total: 3, version: '2.0' }
}, null, 2);

export function initJsonPath() {
  const jsonInput = document.getElementById('jsonInput');
  const pathInput = document.getElementById('jsonPath');
  if (!jsonInput || !pathInput) return;

  jsonInput.value = DEFAULT_JSON;
  renderJsonHighlight();
  jsonInput.addEventListener('input', renderJsonHighlight);
  pathInput.addEventListener('input', evalJsonPath);
}

function renderJsonHighlight() {
  const input = document.getElementById('jsonInput');
  const display = document.getElementById('jsonDisplay');
  if (!input || !display) return;
  try {
    const parsed = JSON.parse(input.value);
    display.innerHTML = syntaxHighlightJSON(parsed);
  } catch(e) {
    display.innerHTML = `<span style="color:var(--red)">Invalid JSON: ${escHtml(e.message)}</span>`;
  }
  evalJsonPath();
}

window.evalJsonPath = () => {
  const input = document.getElementById('jsonInput')?.value || '';
  const path  = document.getElementById('jsonPath')?.value  || '';
  const out   = document.getElementById('jsonPathResult');
  if (!out) return;

  if (!path.trim()) { out.innerHTML = ''; return; }

  try {
    const data = JSON.parse(input);
    const result = evalPath(data, path.trim());
    out.innerHTML = `<pre class="json-output">${syntaxHighlightJSON(result)}</pre>
      <div class="result-meta">${Array.isArray(result) ? result.length + ' items' : typeof result}</div>`;
  } catch(e) {
    out.innerHTML = `<div class="result-error">Error: ${escHtml(e.message)}</div>`;
  }
};

function evalPath(data, path) {
  // Support: $.users[0].name, $.users[*].role, $.users.length, ..name
  if (path === '$' || path === '') return data;

  // Deep scan ..key
  if (path.startsWith('..')) {
    const key = path.slice(2).split(/[.\[]/)[0];
    return deepScan(data, key);
  }

  const segments = tokenizePath(path.replace(/^\$\.?/,''));
  let current = data;

  for (const seg of segments) {
    if (current === null || current === undefined) return null;

    if (seg === '*') {
      return Array.isArray(current) ? current : Object.values(current);
    }
    if (seg.startsWith('[') && seg.endsWith(']')) {
      const inner = seg.slice(1,-1);
      if (inner === '*') {
        current = Array.isArray(current) ? current : Object.values(current);
      } else if (inner.includes(':')) {
        const [s,e] = inner.split(':').map(n=>n===''?undefined:parseInt(n));
        current = Array.isArray(current) ? current.slice(s,e) : null;
      } else if (inner.startsWith('?')) {
        // Filter: [?(@.role=="admin")]
        const filterM = inner.match(/\?\(@\.(\w+)\s*(==|!=|>|<|>=|<=)\s*"?([^")\s]+)"?\)/);
        if (filterM && Array.isArray(current)) {
          const [,k,op,v] = filterM;
          current = current.filter(item => {
            const val = item[k];
            if (op === '==') return String(val) === v;
            if (op === '!=') return String(val) !== v;
            if (op === '>')  return parseFloat(val) > parseFloat(v);
            if (op === '<')  return parseFloat(val) < parseFloat(v);
            return true;
          });
        }
      } else {
        const idx = parseInt(inner);
        current = Array.isArray(current) ? current[idx < 0 ? current.length + idx : idx] : null;
      }
    } else if (seg === 'length') {
      return Array.isArray(current) ? current.length : typeof current === 'string' ? current.length : Object.keys(current||{}).length;
    } else if (Array.isArray(current)) {
      current = current.map(item => item?.[seg]).filter(v => v !== undefined);
      if (current.length === 0) return undefined;
      if (current.length === 1) current = current[0];
    } else {
      current = current[seg];
    }
  }
  return current;
}

function tokenizePath(path) {
  const segments = [];
  let buf = '';
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '.') {
      if (buf) { segments.push(buf); buf = ''; }
    } else if (ch === '[') {
      if (buf) { segments.push(buf); buf = ''; }
      let bracket = '[';
      i++;
      let depth = 1;
      while (i < path.length && depth > 0) {
        if (path[i] === '[') depth++;
        if (path[i] === ']') depth--;
        if (depth > 0) bracket += path[i];
        i++;
      }
      i--;
      segments.push(bracket + ']');
    } else {
      buf += ch;
    }
  }
  if (buf) segments.push(buf);
  return segments;
}

function deepScan(obj, key) {
  const results = [];
  const scan = (node) => {
    if (Array.isArray(node)) node.forEach(scan);
    else if (node && typeof node === 'object') {
      if (key in node) results.push(node[key]);
      Object.values(node).forEach(scan);
    }
  };
  scan(obj);
  return results;
}

/* ═══════════════════════════════════════════════════
   5. DATA TYPE CHEATSHEET
   ═══════════════════════════════════════════════════ */
const DATA_TYPES = {
  postgres: [
    { type:'SMALLINT',     range:'-32,768 to 32,767',          bytes:'2',   note:'16-bit integer' },
    { type:'INTEGER',      range:'-2.1B to 2.1B',              bytes:'4',   note:'32-bit integer' },
    { type:'BIGINT',       range:'-9.2E18 to 9.2E18',          bytes:'8',   note:'64-bit integer' },
    { type:'SERIAL',       range:'1 to 2.1B',                  bytes:'4',   note:'Auto-increment INTEGER' },
    { type:'BIGSERIAL',    range:'1 to 9.2E18',                bytes:'8',   note:'Auto-increment BIGINT' },
    { type:'DECIMAL(p,s)', range:'Up to 131072 digits',        bytes:'var', note:'Exact numeric, use for money' },
    { type:'REAL',         range:'6 decimal digits',           bytes:'4',   note:'Floating point, imprecise' },
    { type:'DOUBLE PRECISION',range:'15 decimal digits',       bytes:'8',   note:'Higher precision float' },
    { type:'VARCHAR(n)',   range:'Up to n chars',              bytes:'n+4', note:'Variable-length string with limit' },
    { type:'TEXT',         range:'Unlimited',                  bytes:'var', note:'Unlimited string, preferred in PG' },
    { type:'CHAR(n)',      range:'Exactly n chars (padded)',   bytes:'n',   note:'Fixed-length, pads with spaces' },
    { type:'BOOLEAN',      range:'TRUE / FALSE / NULL',        bytes:'1',   note:'' },
    { type:'DATE',         range:'4713 BC to 294276 AD',       bytes:'4',   note:'Calendar date only (no time)' },
    { type:'TIMESTAMP',    range:'4713 BC to 294276 AD',       bytes:'8',   note:'Date + time (no timezone)' },
    { type:'TIMESTAMPTZ',  range:'4713 BC to 294276 AD',       bytes:'8',   note:'Date + time WITH timezone (recommended)' },
    { type:'UUID',         range:'128-bit UUID',               bytes:'16',  note:'Use gen_random_uuid() for default' },
    { type:'JSONB',        range:'Unlimited',                  bytes:'var', note:'Binary JSON — indexable, preferred over JSON' },
    { type:'JSON',         range:'Unlimited',                  bytes:'var', note:'Stores raw JSON text, no indexing' },
    { type:'ARRAY',        range:'1D to nD arrays',            bytes:'var', note:'e.g. INTEGER[], TEXT[]' },
    { type:'BYTEA',        range:'Unlimited binary',           bytes:'var', note:'Raw binary / file storage' },
    { type:'INET',         range:'IPv4 / IPv6 addresses',      bytes:'7+',  note:'Supports subnet/mask operations' },
  ],
  mysql: [
    { type:'TINYINT',      range:'-128 to 127 (or 0–255)',    bytes:'1',   note:'TINYINT UNSIGNED for 0–255' },
    { type:'SMALLINT',     range:'-32,768 to 32,767',          bytes:'2',   note:'' },
    { type:'MEDIUMINT',    range:'-8.4M to 8.4M',              bytes:'3',   note:'' },
    { type:'INT',          range:'-2.1B to 2.1B',              bytes:'4',   note:'Most common integer type' },
    { type:'BIGINT',       range:'-9.2E18 to 9.2E18',          bytes:'8',   note:'' },
    { type:'DECIMAL(p,s)', range:'Up to 65 digits',            bytes:'var', note:'Exact — use for currency' },
    { type:'FLOAT',        range:'~7 decimal digits',          bytes:'4',   note:'Imprecise' },
    { type:'DOUBLE',       range:'~15 decimal digits',         bytes:'8',   note:'' },
    { type:'VARCHAR(n)',   range:'Up to 65,535 bytes',         bytes:'n+2', note:'Row max 65,535 bytes total' },
    { type:'TEXT',         range:'Up to 65,535 bytes',         bytes:'var', note:'Cannot have DEFAULT value' },
    { type:'MEDIUMTEXT',   range:'Up to 16MB',                 bytes:'var', note:'' },
    { type:'LONGTEXT',     range:'Up to 4GB',                  bytes:'var', note:'' },
    { type:'CHAR(n)',      range:'0–255 chars (padded)',       bytes:'n',   note:'Fixed-length' },
    { type:'TINYINT(1)',   range:'TRUE (1) / FALSE (0)',       bytes:'1',   note:'MySQL convention for BOOLEAN' },
    { type:'DATE',         range:'1000-01-01 to 9999-12-31',   bytes:'3',   note:'No time component' },
    { type:'DATETIME',     range:'1000-01-01 to 9999-12-31',   bytes:'8',   note:'No timezone info' },
    { type:'TIMESTAMP',    range:'1970-01-01 to 2038-01-19',   bytes:'4',   note:'Stored as UTC; 2038 limit!' },
    { type:'JSON',         range:'Up to 1GB',                  bytes:'var', note:'Stored as binary internally; no GIN index' },
    { type:'ENUM',         range:'Up to 65,535 values',        bytes:'1-2', note:'Fixed set of allowed strings' },
    { type:'BLOB',         range:'Up to 65,535 bytes',         bytes:'var', note:'Binary data; prefer VARCHAR/TEXT for text' },
  ],
  sqlite: [
    { type:'NULL',    range:'NULL value',                     bytes:'var', note:'SQLite storage class' },
    { type:'INTEGER', range:'-9.2E18 to 9.2E18',             bytes:'1–8', note:'Signed integer, variable bytes' },
    { type:'REAL',    range:'8-byte IEEE float',              bytes:'8',   note:'Floating point' },
    { type:'TEXT',    range:'Unlimited UTF-8/16',             bytes:'var', note:'All string types map to TEXT' },
    { type:'BLOB',    range:'Unlimited binary',               bytes:'var', note:'Stored exactly as input' },
    { type:'BOOLEAN', range:'0 (false) / 1 (true)',          bytes:'1',   note:'Stored as INTEGER' },
    { type:'DATE',    range:'Any text in ISO format',        bytes:'var', note:'Stored as TEXT "YYYY-MM-DD"' },
    { type:'DATETIME',range:'Any text in ISO format',        bytes:'var', note:'SQLite has no dedicated date type' },
  ],
};

export function initDataTypes() {
  renderDataTypeTable('postgres');
  document.querySelectorAll('.dt-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dt-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDataTypeTable(tab.dataset.dialect);
    });
  });
}

function renderDataTypeTable(dialect) {
  const types = DATA_TYPES[dialect] || [];
  const container = document.getElementById('dtTable');
  if (!container) return;
  container.innerHTML = `<table class="dt-table">
    <thead><tr><th>Type</th><th>Range / Size</th><th>Storage</th><th>Notes</th></tr></thead>
    <tbody>${types.map(t => `<tr>
      <td class="dt-type">${t.type}</td>
      <td class="dt-range">${t.range}</td>
      <td class="dt-range">${t.bytes} bytes</td>
      <td class="dt-note">${t.note}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

/* ═══════════════════════════════════════════════════
   6. INDEX ADVISOR
   ═══════════════════════════════════════════════════ */
export function initIndexAdvisor() {
  document.getElementById('adviseBtn')?.addEventListener('click', runIndexAdvisor);
}

window.runIndexAdvisor = () => {
  const query   = document.getElementById('advQuery')?.value.trim() || '';
  const table   = document.getElementById('advTable')?.value.trim() || 'my_table';
  const dialect = document.getElementById('advDialect')?.value || 'postgres';
  const out     = document.getElementById('advResult');
  if (!out || !query) return;

  const upper = query.toUpperCase();
  const recs = [];
  const warns = [];
  const infos = [];

  // Parse WHERE conditions
  const whereM = query.match(/WHERE\s+([\s\S]+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|;|$)/i);
  if (whereM) {
    const cols = [...whereM[1].matchAll(/\b(\w+)\s*(?:=|!=|>|<|>=|<=|LIKE|IN|BETWEEN)/gi)].map(m => m[1]);
    if (cols.length) recs.push(`CREATE INDEX idx_${table}_${cols.join('_')} ON ${table} (${cols.join(', ')});`);
  }

  // ORDER BY
  const orderM = query.match(/ORDER BY\s+([\w\s,]+)/i);
  if (orderM) {
    const cols = orderM[1].trim().split(',').map(c => c.trim().split(/\s+/)[0]);
    infos.push(`Consider adding ${cols.join(', ')} to your index as trailing columns for sort optimization.`);
  }

  // SELECT *
  if (upper.includes('SELECT *')) warns.push('Avoid SELECT * — select only needed columns to reduce I/O and enable covering indexes.');

  // LIKE with leading wildcard
  if (/LIKE\s+'%/i.test(query)) warns.push("LIKE '%...' has a leading wildcard — cannot use a B-Tree index. Consider full-text search or a reverse index.");

  // Full table scan signals
  if (!whereM) warns.push('No WHERE clause detected — this query may result in a full table scan.');

  // JOIN columns
  const joinM = [...query.matchAll(/JOIN\s+\w+\s+(?:\w+\s+)?ON\s+([\w.]+)\s*=\s*([\w.]+)/gi)];
  joinM.forEach(m => {
    const col = m[1].split('.').pop();
    recs.push(`CREATE INDEX idx_${m[2].split('.')[0]}_${col} ON ${m[2].split('.')[0]} (${col});`);
  });

  // Partial index opportunity
  if (/WHERE\s+\w+\s*=\s*'[^']+'/i.test(query)) {
    const constM = query.match(/WHERE\s+(\w+)\s*=\s*'([^']+)'/i);
    if (constM) infos.push(`Consider a partial index: CREATE INDEX idx_${table}_partial ON ${table} (${constM[1]}) WHERE ${constM[1]} = '${constM[2]}'; — if this filter is used frequently and highly selective.`);
  }

  if (!recs.length && !warns.length) infos.push('Query looks reasonable. No obvious index improvements detected.');

  const section = (title, items, cls) => items.length ? `
    <div class="advisor-section-title">${title}</div>
    ${items.map(i => `<div class="${cls}"><span style="margin-right:0.4rem">${cls.includes('rec')?'✓':cls.includes('warn')?'⚠':'ℹ'}</span>${i.includes(';') ? `<span class="advisor-sql">${escHtml(i)}</span>` : escHtml(i)}</div>`).join('')}` : '';

  out.innerHTML = section('Recommended Indexes', recs, 'advisor-rec') +
                  section('Warnings', warns, 'advisor-warn') +
                  section('Tips', infos, 'advisor-info') ||
                  '<div class="advisor-info">ℹ Enter a query above to analyze it.</div>';
};

/* ═══════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

/* ═══════════════════════════════════════════════════
   TOOL PANEL SWITCHING
   ═══════════════════════════════════════════════════ */
export function initToolNav() {
  document.querySelectorAll('.tool-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.tool-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const panel = item.dataset.tool;
      document.querySelectorAll('.tool-panel').forEach(p => p.classList.toggle('active', p.id === panel));
    });
  });
}
