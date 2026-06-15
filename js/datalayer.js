/**
 * Adobe Client Data Layer (ACDL) — DatabaseVerse
 * AEP Web SDK (Alloy) + Adobe Analytics via Tags/Launch
 *
 * Event types
 * ─────────────────────────────────────────────────────────────────
 *  pageloaded      every page load
 *  linkClicked     every user interaction / click
 *  siteSearch      debounced search input (not a click)
 *  queryExecuted   playground query run   (engine · duration · success)
 *  quizCompleted   quiz result via MutationObserver
 *
 * webInteraction.name convention  →  "{PageName}|{region}|{label}"
 *   e.g.  "DBV:Home|global-nav|Playground"
 *         "DBV:Home|database-grid|PostgreSQL"
 *         "DBV:Tools|schema-designer|generate-ddl:MySQL"
 * ─────────────────────────────────────────────────────────────────
 */

window.adobeDataLayer = window.adobeDataLayer || [];

/* ═══════════════════════════════════════════════════════════════
   PAGE CONTEXT  (computed once at parse time)
═══════════════════════════════════════════════════════════════ */

(function () {
  const file = location.pathname.split('/').pop() || 'index.html';
  const MAP  = {
    'index.html':      { name: 'DBV:Home',       section: 'Home',       module: 'database-explorer', subSection: 'databases'       },
    'playground.html': { name: 'DBV:Playground', section: 'Playground', module: 'query-playground',  subSection: 'sql-editor'      },
    'tools.html':      { name: 'DBV:Tools',       section: 'Tools',      module: 'developer-tools',   subSection: 'schema-designer' },
    'learn.html':      { name: 'DBV:Learn',       section: 'Learn',      module: 'learning-center',   subSection: 'glossary'        },
    '404.html':        { name: 'DBV:404',         section: '404',        module: 'error-page',        subSection: ''                },
  };
  const p = MAP[file] ?? {
    name: document.title.split(/[—|]/)[0].trim(),
    section: 'Other', module: 'other', subSection: '',
  };

  window._DBV = {
    ...p,
    url:      location.href,
    referrer: document.referrer || '',
    isError:  p.section === '404',
    lang:     navigator.language || 'en',
    country:  (navigator.language || 'en').split('-')[1]?.toUpperCase() || 'US',
    device:   innerWidth <= 768 ? 'mobile' : innerWidth <= 1024 ? 'tablet' : 'desktop',
  };
})();

// dhanush
/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function _debounce(fn, ms) {
  let t;
  return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

/** Shared databaseverse block — merged into every event */
function _dbv(moduleOverride, extra) {
  return {
    webPageDataDetails: {
      pageType:       _DBV.section.toLowerCase(),
      siteSubSection: _DBV.subSection,
      country:        _DBV.country,
      language:       _DBV.lang,
      moduleType:     moduleOverride || _DBV.module,
      deviceType:     _DBV.device,
      ...extra,
    },
  };
}

/**
 * Push a linkClicked event.
 * @param {string} name       webInteraction.name  — "PageName|region|label"
 * @param {string} region     UI region identifier
 * @param {object} [opts]
 *   url       string   destination href  (default '')
 *   type      string   'other' | 'exit'  (default 'other')
 *   module    string   override moduleType
 *   details   object   extra KPI fields → pushed to databaseverse.interactionDetails
 */
function _lc(name, region, { url = '', type = 'other', module, details } = {}) {
  const payload = {
    event: 'linkClicked',
    web: {
      webInteraction: {
        name,
        type,
        URL:        url,
        region,
        linkClicks: { value: 1 },
      },
      webPageDetails: {
        name: _DBV.name,
        URL:  _DBV.url,
      },
      webReferrer: { URL: _DBV.referrer },
      databaseverse: _dbv(module),
    },
  };
  if (details) payload.web.databaseverse.interactionDetails = details;
  window.adobeDataLayer.push(payload);
}

/**
 * Push a non-click custom event (search / queryExecuted / quizCompleted).
 * @param {string} eventName
 * @param {string} detailKey  key name inside databaseverse  e.g. 'searchDetails'
 * @param {object} detailVal  the custom KPI object
 */
function _ev(eventName, detailKey, detailVal) {
  window.adobeDataLayer.push({
    event: eventName,
    web: {
      webPageDetails: { name: _DBV.name, URL: _DBV.url },
      webReferrer:    { URL: _DBV.referrer },
      databaseverse: {
        ..._dbv(),
        [detailKey]: detailVal,
      },
    },
  });
}

/* ═══════════════════════════════════════════════════════════════
   PAGE LOADED  — fires immediately (before DOMContentLoaded)
═══════════════════════════════════════════════════════════════ */

window.adobeDataLayer.push({
  event: 'pageloaded',
  web: {
    webPageDetails: {
      name:        _DBV.name,
      server:      location.hostname,
      URL:         _DBV.url,
      siteSection: _DBV.section,
      isErrorPage: _DBV.isError,
      pageViews:   { value: 1 },
    },
    webReferrer: { URL: _DBV.referrer },
    databaseverse: _dbv(),
  },
});

/* ─── DOM-ready ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  _trackGlobal();
  if (_DBV.section === 'Home')       _trackHome();
  if (_DBV.section === 'Playground') _trackPlayground();
  if (_DBV.section === 'Tools')      _trackTools();
  if (_DBV.section === 'Learn')      _trackLearn();
});

/* ═══════════════════════════════════════════════════════════════
   GLOBAL  (every page)
═══════════════════════════════════════════════════════════════ */

function _trackGlobal() {
  // Top-nav links
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      _lc(
        `${_DBV.name}|global-nav|${a.textContent.trim()}`,
        'global-nav',
        { url: a.href, details: { linkText: a.textContent.trim(), linkHref: a.getAttribute('href') } }
      );
    });
  });

  // Footer nav links
  document.querySelectorAll('.footer-nav a').forEach(a => {
    a.addEventListener('click', () => {
      _lc(
        `${_DBV.name}|footer-nav|${a.textContent.trim()}`,
        'footer-nav',
        { url: a.href, details: { linkText: a.textContent.trim(), linkHref: a.getAttribute('href') } }
      );
    });
  });

  // Outbound / social links
  document.querySelectorAll('a[target="_blank"]').forEach(a => {
    a.addEventListener('click', () => {
      const label = a.getAttribute('aria-label') || a.textContent.trim();
      const region = a.closest('.footer-social') ? 'footer-social' : 'outbound';
      _lc(
        `${_DBV.name}|${region}|${label}`,
        region,
        { url: a.href, type: 'exit', details: { linkHref: a.href, linkLabel: label } }
      );
    });
  });

  // Newsletter subscribe
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.querySelector('button')?.addEventListener('click', () => {
      const email  = form.querySelector('input[type="email"]')?.value ?? '';
      const domain = email.includes('@') ? email.split('@')[1] : '';
      _lc(
        `${_DBV.name}|newsletter|subscribe`,
        'newsletter',
        { details: { emailDomain: domain, hasEmail: !!email } }
      );
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   HOME
═══════════════════════════════════════════════════════════════ */

function _trackHome() {
  // Search (debounced input — siteSearch event, not linkClicked)
  const searchEl = document.getElementById('searchInput');
  if (searchEl) {
    searchEl.addEventListener('input', _debounce(() => {
      const q     = searchEl.value.trim();
      if (!q) return;
      const count = parseInt(document.getElementById('searchCount')?.textContent, 10) || 0;
      _ev('siteSearch', 'searchDetails', {
        searchQuery:  q,
        resultCount:  count,
        hasResults:   count > 0,
        searchArea:   'databases',
      });
    }, 600));
  }

  // Category pills
  document.addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill[data-cat]');
    if (!pill) return;
    _lc(
      `${_DBV.name}|category-filter|${pill.dataset.cat}`,
      'category-filter',
      { details: { category: pill.dataset.cat } }
    );
  });

  // DB card clicks (skip inner buttons/links)
  document.addEventListener('click', e => {
    if (e.target.closest('button, a')) return;
    const card = e.target.closest('.db-card[data-name]');
    if (!card) return;
    _lc(
      `${_DBV.name}|database-grid|${card.dataset.name}`,
      'database-grid',
      { details: { databaseName: card.dataset.name, databaseCategory: card.dataset.cat } }
    );
  });

  // Snippet copy — wrap window._copySnippet
  const _origCopySnippet = window._copySnippet;
  if (typeof _origCopySnippet === 'function') {
    window._copySnippet = function (btn, encoded) {
      const db = decodeURIComponent(encoded);
      _lc(
        `${_DBV.name}|database-card|snippet-copy:${db}`,
        'database-card',
        { details: { database: db, action: 'snippet-copy' } }
      );
      return _origCopySnippet.call(this, btn, encoded);
    };
  }

  // + Compare — wrap window._addToCompare
  const _origAddToCompare = window._addToCompare;
  if (typeof _origAddToCompare === 'function') {
    window._addToCompare = function (name) {
      _lc(
        `${_DBV.name}|database-card|comparator-add:${name}`,
        'database-card',
        { details: { database: name, action: 'comparator-add' } }
      );
      return _origAddToCompare.call(this, name);
    };
  }

  // Comparator dropdowns
  ['compareA', 'compareB'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const a = document.getElementById('compareA')?.value;
      const b = document.getElementById('compareB')?.value;
      if (a && b && a !== b) {
        _lc(
          `${_DBV.name}|comparator|${a} vs ${b}`,
          'comparator',
          { details: { databaseA: a, databaseB: b } }
        );
      }
    });
  });

  // Quiz
  const quizBody = document.getElementById('quizBody');
  if (quizBody) {
    let _quizStarted  = false;
    let _quizStep     = 0;
    let _quizStartTs  = 0;

    document.addEventListener('click', e => {
      const opt = e.target.closest('#quizBody .quiz-opt');
      if (!opt) return;
      if (!_quizStarted) {
        _quizStarted = true;
        _quizStartTs = Date.now();
        _lc(`${_DBV.name}|quiz|quiz-start`, 'quiz');
      }
      _quizStep++;
      _lc(
        `${_DBV.name}|quiz|quiz-answer:${opt.querySelector('.quiz-opt-title')?.textContent?.trim() ?? ''}`,
        'quiz',
        { details: { quizStep: _quizStep, answer: opt.querySelector('.quiz-opt-title')?.textContent?.trim() ?? '' } }
      );
    });

    // Retake
    const _origRestart = window._restartQuiz;
    if (typeof _origRestart === 'function') {
      window._restartQuiz = function () {
        _lc(`${_DBV.name}|quiz|quiz-restart`, 'quiz', { details: { stepsCompleted: _quizStep } });
        _quizStarted = false;
        _quizStep    = 0;
        _quizStartTs = 0;
        return _origRestart.call(this);
      };
    }

    // Result — MutationObserver (quizCompleted event, not linkClicked)
    let _observerAttached = false;
    function _observeQuizResult() {
      if (_observerAttached) return;
      _observerAttached = true;
      const obs = new MutationObserver(() => {
        const resultEl = quizBody.querySelector('.quiz-result-db');
        if (!resultEl) return;
        _ev('quizCompleted', 'quizDetails', {
          recommendation:  resultEl.textContent.trim(),
          totalSteps:      _quizStep,
          completionTimeSec: _quizStartTs ? Math.round((Date.now() - _quizStartTs) / 1000) : null,
        });
        obs.disconnect();
        _observerAttached = false;
      });
      obs.observe(quizBody, { childList: true, subtree: true });
    }
    _observeQuizResult();

    // Re-attach observer after restart
    const _wRestart = window._restartQuiz;
    if (typeof _wRestart === 'function') {
      const _prev = window._restartQuiz;
      window._restartQuiz = function () {
        const r = _prev.call(this);
        _observeQuizResult();
        return r;
      };
    }
  }

  // Use-case cards
  document.addEventListener('click', e => {
    const card = e.target.closest('#usecaseGrid .uc-card');
    if (!card) return;
    const name = card.querySelector('.uc-name')?.textContent?.trim() ?? '';
    _lc(
      `${_DBV.name}|use-case-grid|${name}`,
      'use-case-grid',
      { details: { useCaseName: name } }
    );
  });
}

/* ═══════════════════════════════════════════════════════════════
   PLAYGROUND
═══════════════════════════════════════════════════════════════ */

function _trackPlayground() {
  // Engine tab
  document.addEventListener('click', e => {
    const tab = e.target.closest('.eng-tab[data-engine]');
    if (!tab) return;
    _lc(
      `${_DBV.name}|engine-tabs|${tab.dataset.engine}`,
      'engine-tabs',
      { module: 'query-playground', details: { engine: tab.dataset.engine } }
    );
  });

  // Example pills
  document.addEventListener('click', e => {
    const pill = e.target.closest('.eg-pill[data-example]');
    if (!pill) return;
    const engine = pill.closest('[data-engine-panel]')?.dataset.enginePanel ?? 'unknown';
    _lc(
      `${_DBV.name}|example-picker|${engine}:${pill.dataset.example}`,
      'example-picker',
      { module: 'query-playground', details: { engine, example: pill.dataset.example } }
    );
  });

  // Copy output
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-copy-out]');
    if (!btn) return;
    _lc(
      `${_DBV.name}|query-output|copy-output:${btn.dataset.copyOut}`,
      'query-output',
      { module: 'query-playground', details: { engine: btn.dataset.copyOut } }
    );
  });

  // Query run — queryExecuted event (has perf data, not a click)
  ['SQL', 'Mongo', 'Redis'].forEach(eng => {
    const key      = `run${eng}`;
    const engineId = eng.toLowerCase();
    const orig     = window[key];
    if (typeof orig !== 'function') return;

    window[key] = function (...args) {
      const t0    = performance.now();
      const query = document.getElementById(`editor-${engineId}`)?.value?.trim() ?? '';

      const _emit = success => {
        const durationMs = Math.round(performance.now() - t0);
        _ev('queryExecuted', 'queryDetails', {
          engine:          engineId,
          queryLength:     query.length,
          durationMs,
          success,
          performanceTier: durationMs < 100 ? 'fast' : durationMs < 500 ? 'normal' : 'slow',
        });
      };

      let result;
      try { result = orig.apply(this, args); } catch (err) { _emit(false); throw err; }

      if (result && typeof result.then === 'function') {
        return result.then(r => { _emit(true); return r; }, er => { _emit(false); throw er; });
      }
      _emit(true);
      return result;
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   TOOLS
═══════════════════════════════════════════════════════════════ */

function _trackTools() {
  // Tool-nav tab
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tool-nav-btn[data-tool]');
    if (!btn) return;
    const label = btn.textContent.trim().replace(/\s+/g, ' ');
    _lc(
      `${_DBV.name}|tool-nav|${btn.dataset.tool}`,
      'tool-nav',
      { module: 'developer-tools', details: { toolId: btn.dataset.tool, toolLabel: label } }
    );
  });

  // Add field
  const _origAddField = window.addField;
  if (typeof _origAddField === 'function') {
    window.addField = function (...args) {
      const fieldCount = (document.querySelectorAll('.schema-row').length || 0) + 1;
      _lc(
        `${_DBV.name}|schema-designer|add-field`,
        'schema-designer',
        { module: 'developer-tools', details: { toolId: 'tool-schema', fieldCount } }
      );
      return _origAddField.apply(this, args);
    };
  }

  // Generate DDL
  const _origGenDDL = window.genDDL;
  if (typeof _origGenDDL === 'function') {
    window.genDDL = function (...args) {
      const dialect   = document.getElementById('schDialect')?.value ?? '';
      const tableName = document.getElementById('schTable')?.value?.trim() ?? '';
      _lc(
        `${_DBV.name}|schema-designer|generate-ddl:${dialect}`,
        'schema-designer',
        { module: 'developer-tools', details: { toolId: 'tool-schema', dialect, tableName } }
      );
      return _origGenDDL.apply(this, args);
    };
  }

  // Copy DDL
  const _origCopyDDL = window.copyDDL;
  if (typeof _origCopyDDL === 'function') {
    window.copyDDL = function (...args) {
      _lc(
        `${_DBV.name}|schema-designer|copy-ddl`,
        'schema-designer',
        { module: 'developer-tools', details: { toolId: 'tool-schema' } }
      );
      return _origCopyDDL.apply(this, args);
    };
  }

  // Copy connection string
  const _origCopyConn = window.copyConn;
  if (typeof _origCopyConn === 'function') {
    window.copyConn = function (...args) {
      _lc(
        `${_DBV.name}|connection-builder|copy-connection-string`,
        'connection-builder',
        { module: 'developer-tools', details: { toolId: 'tool-connstr' } }
      );
      return _origCopyConn.apply(this, args);
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEARN
═══════════════════════════════════════════════════════════════ */

function _trackLearn() {
  // Section tab
  document.addEventListener('click', e => {
    const tab = e.target.closest('.learn-tab[data-section]');
    if (!tab) return;
    _lc(
      `${_DBV.name}|section-tabs|${tab.textContent.trim()}`,
      'section-tabs',
      { module: 'learning-center', details: { tabSection: tab.dataset.section, sectionLabel: tab.textContent.trim() } }
    );
  });

  // Glossary search (siteSearch event, not linkClicked)
  const glossarySearch = document.getElementById('glossarySearch');
  if (glossarySearch) {
    glossarySearch.addEventListener('input', _debounce(() => {
      const q = glossarySearch.value.trim();
      if (!q) return;
      _ev('siteSearch', 'searchDetails', { searchQuery: q, searchArea: 'glossary' });
    }, 600));
  }

  // Glossary alpha filter
  document.addEventListener('click', e => {
    const btn = e.target.closest('.alpha-btn[data-letter]');
    if (!btn) return;
    const letter = btn.dataset.letter || 'All';
    _lc(
      `${_DBV.name}|glossary|filter:${letter}`,
      'glossary',
      { module: 'learning-center', details: { letter } }
    );
  });

  // Interview difficulty filter
  document.addEventListener('click', e => {
    const btn = e.target.closest('.iqa-filter[data-diff]');
    if (!btn) return;
    const diff = btn.dataset.diff || 'All';
    _lc(
      `${_DBV.name}|interview-qa|filter:${diff}`,
      'interview-qa',
      { module: 'learning-center', details: { difficulty: diff } }
    );
  });

  // Interview search (siteSearch event)
  const iqaSearch = document.getElementById('iqaSearch');
  if (iqaSearch) {
    iqaSearch.addEventListener('input', _debounce(() => {
      const q = iqaSearch.value.trim();
      if (!q) return;
      _ev('siteSearch', 'searchDetails', { searchQuery: q, searchArea: 'interview' });
    }, 600));
  }

  // Migration guide cards
  document.addEventListener('click', e => {
    const card = e.target.closest('#migrationGrid [class*="migration"]');
    if (!card) return;
    const title = card.querySelector('h3, h4, [class*="title"]')?.textContent?.trim() ?? '';
    _lc(
      `${_DBV.name}|migration-guides|${title}`,
      'migration-guides',
      { module: 'learning-center', details: { migrationTitle: title } }
    );
  });
}
