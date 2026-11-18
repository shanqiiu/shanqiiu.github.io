// 「前沿追踪」板块：拉取 Follow RSI 公开 JSON 快照并渲染（无构建依赖、无第三方库）
// 数据源 https://adongwanai.github.io/follow-rsi/feed/latest.json（CORS: *）
(function () {
  'use strict';

  var FEED = 'https://adongwanai.github.io/follow-rsi/feed/latest.json';
  var SITE = 'https://adongwanai.github.io/follow-rsi';
  var CACHE_KEY = 'frss.latest.v1';
  var TTL = 3 * 60 * 60 * 1000;
  var PAGE = 24;

  var DIR_LABEL = {
    harness: 'Harness / 脚手架',
    evaluation_benchmark: '评测与基准',
    theory_survey: '理论与综述',
    safety_governance: '安全与治理'
  };
  var KIND_LABEL = { daily: '日报', retrospective: '创刊回补', weekly_backlog: '周报补录' };

  var esc = (window.SiteUtils && window.SiteUtils.escapeHtml) || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function safeUrl(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '';
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var box = JSON.parse(raw);
      if (!box || !box.at || !box.data) return null;
      if (Date.now() - box.at > TTL) return null;
      return box;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data }));
    } catch (e) { /* 隐私模式或超额，忽略 */ }
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    // 站点定位国内读者，统一按北京时间展示
    var bj = new Date(d.getTime() + 8 * 3600 * 1000);
    return bj.getUTCFullYear() + '-' + p(bj.getUTCMonth() + 1) + '-' + p(bj.getUTCDate()) +
      ' ' + p(bj.getUTCHours()) + ':' + p(bj.getUTCMinutes());
  }

  var state = { data: null, view: 'papers', dir: 'all', q: '', shown: PAGE, cacheAt: 0 };

  var el = {};
  function bind() {
    el.status = document.getElementById('frss-status');
    el.q = document.getElementById('frss-q');
    el.refresh = document.getElementById('frss-refresh');
    el.nPapers = document.getElementById('frss-n-papers');
    el.nDaily = document.getElementById('frss-n-daily');
    el.chips = document.getElementById('frss-chips');
    el.papers = document.getElementById('frss-papers');
    el.daily = document.getElementById('frss-daily');
    el.empty = document.getElementById('frss-empty');
    el.moreWrap = document.getElementById('frss-more-wrap');
    el.more = document.getElementById('frss-more');
    el.tabs = Array.prototype.slice.call(document.querySelectorAll('.frss-tabs [data-view]'));
  }

  function setStatus(text, kind) {
    if (!el.status) return;
    el.status.textContent = text;
    el.status.setAttribute('data-state', kind || 'ok');
  }

  // ---------- 数据 ----------

  function load(force) {
    if (!force) {
      var cached = readCache();
      if (cached) {
        state.data = cached.data;
        state.cacheAt = cached.at;
        renderAll();
        setStatus(summaryText() + ' · 缓存', 'ok');
        return;
      }
    }
    setStatus('正在同步数据…', 'loading');
    fetch(FEED + (force ? '?t=' + Date.now() : ''), { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        state.data = data;
        state.cacheAt = Date.now();
        writeCache(data);
        renderAll();
        setStatus(summaryText(), 'ok');
      })
      .catch(function (err) {
        if (state.data) {
          setStatus('刷新失败，继续显示已加载的数据（' + err.message + '）', 'warn');
          return;
        }
        if (el.papers) el.papers.innerHTML = '';
        setStatus('数据拉取失败：' + err.message + '，可直接访问原站查看。', 'warn');
        showEmpty('第三方数据源暂时不可用。稍后重试，或前往 ' +
          '<a href="' + SITE + '/daily/" target="_blank" rel="noopener">原站今日动态 ↗</a>');
      });
  }

  function summaryText() {
    var d = state.data;
    if (!d) return '';
    var dates = d.daily_editions || [];
    var items = d.items || [];
    return '数据更新于 ' + fmtTime(d.updated_at) + '（北京时间） · 简报 ' + dates.length +
      ' 期 · 论文记录 ' + items.length + ' 条';
  }

  // ---------- 渲染 ----------

  function sortedItems() {
    var items = (state.data && state.data.items) || [];
    var list = items.slice();
    list.sort(function (a, b) {
      var ka = (b.news_date || b.published || ''), kb = (a.news_date || a.published || '');
      if (ka !== kb) return ka < kb ? -1 : 1;
      return (b.hf_upvotes || 0) - (a.hf_upvotes || 0);
    });
    return list;
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return sortedItems().filter(function (it) {
      if (state.dir !== 'all') {
        var p = (it.direction && it.direction.primary) || 'other';
        if (p !== state.dir) return false;
      }
      if (!q) return true;
      var hay = ((it.title || '') + ' ' + (it.short_title || '') + ' ' +
        (it.summary_zh || '') + ' ' + (it.arxiv_id || '')).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function renderAll() {
    renderCounts();
    renderChips();
    renderPapers();
    renderDaily();
    switchView(state.view);
  }

  function renderCounts() {
    if (el.nPapers) el.nPapers.textContent = String(((state.data && state.data.items) || []).length);
    if (el.nDaily) el.nDaily.textContent = String(((state.data && state.data.daily_editions) || []).length);
  }

  function renderChips() {
    if (!el.chips) return;
    var items = (state.data && state.data.items) || [];
    var counts = {};
    items.forEach(function (it) {
      var p = (it.direction && it.direction.primary) || 'other';
      counts[p] = (counts[p] || 0) + 1;
    });
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var out = '<button type="button" class="frss-chip' + (state.dir === 'all' ? ' is-active' : '') +
      '" data-dir="all">全部<b>' + items.length + '</b></button>';
    keys.forEach(function (k) {
      out += '<button type="button" class="frss-chip' + (state.dir === k ? ' is-active' : '') +
        '" data-dir="' + esc(k) + '">' + esc(DIR_LABEL[k] || k) + '<b>' + counts[k] + '</b></button>';
    });
    el.chips.innerHTML = out;
  }

  function paperCard(it) {
    var dir = (it.direction && it.direction.primary) || 'other';
    var tags = '<span class="frss-tag">' + esc(DIR_LABEL[dir] || dir) + '</span>';
    if (it.gate && it.gate.harness_specific === 'yes') {
      tags += '<span class="frss-tag frss-tag--ok">Harness ✓</span>';
    }
    if (it.edition_kind && KIND_LABEL[it.edition_kind]) {
      tags += '<span class="frss-tag frss-tag--kind">' + esc(KIND_LABEL[it.edition_kind]) + '</span>';
    }
    var hf = it.hf_upvotes > 0 ? '<span class="frss-hf">▲ ' + it.hf_upvotes + '</span>' : '';
    var links = '';
    if (safeUrl(it.links && it.links.arxiv)) {
      links += '<a href="' + esc(it.links.arxiv) + '" target="_blank" rel="noopener">arXiv' +
        (it.arxiv_id ? ' ' + esc(it.arxiv_id) : '') + ' ↗</a>';
    }
    if (safeUrl(it.links && it.links.s2)) {
      links += '<a href="' + esc(it.links.s2) + '" target="_blank" rel="noopener">Semantic Scholar ↗</a>';
    }
    var nd = it.news_date || it.published;
    if (nd) {
      links += '<a href="' + SITE + '/daily/' + esc(nd) + '.html" target="_blank" rel="noopener">本期简报 ↗</a>';
    }
    return '<article class="frss-card">' +
      '<div class="frss-card-top"><time>' + esc(nd || '') + '</time>' + tags + hf + '</div>' +
      '<h2>' + esc(it.short_title || it.title || '未命名') + '</h2>' +
      (it.title && it.short_title ? '<p class="frss-sub">' + esc(it.title) + '</p>' : '') +
      '<p class="frss-sum">' + esc(it.summary_zh || it.summary_en || '暂无摘要') + '</p>' +
      '<div class="frss-card-foot">' + links + '</div>' +
      '</article>';
  }

  function renderPapers() {
    if (!el.papers) return;
    var list = filtered();
    if (!list.length) {
      el.papers.innerHTML = '';
      el.moreWrap.hidden = true;
      showEmpty(state.q || state.dir !== 'all' ? '没有匹配的条目，试试换个关键词或切回「全部」。' : '暂无数据。');
      return;
    }
    hideEmpty();
    var slice = list.slice(0, state.shown);
    el.papers.innerHTML = slice.map(paperCard).join('');
    el.moreWrap.hidden = list.length <= state.shown;
    if (!el.moreWrap.hidden) {
      el.more.textContent = '加载更多（还有 ' + (list.length - state.shown) + ' 条）';
    }
  }

  function renderDaily() {
    if (!el.daily) return;
    var days = ((state.data && state.data.daily_editions) || []).slice();
    days.sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : (b.date === a.date ? 0 : 1); });
    el.daily.innerHTML = days.map(function (d) {
      var n = typeof d.paper_count === 'number' ? d.paper_count : 0;
      var zero = n === 0;
      return '<article class="frss-day' + (zero ? ' is-empty' : '') + '">' +
        '<div class="frss-day-head">' +
        '<time>' + esc(d.date) + '</time>' +
        '<span class="frss-pill' + (zero ? ' frss-pill--zero' : '') + '">' + n + ' 篇</span>' +
        (d.kind === 'daily_status' ? '<span class="frss-tag frss-tag--kind">采集简报</span>' : '') +
        '</div>' +
        '<p class="frss-day-sum">' + esc(d.summary_zh || d.summary_en || '') + '</p>' +
        '<div class="frss-card-foot">' +
        '<a href="' + SITE + '/daily/' + esc(d.date) + '.html" target="_blank" rel="noopener">阅读原文 ↗</a>' +
        '<button type="button" class="frss-expand">展开全文</button>' +
        '</div></article>';
    }).join('');
  }

  function showEmpty(html) {
    if (!el.empty) return;
    el.empty.innerHTML = html;
    el.empty.hidden = false;
  }
  function hideEmpty() {
    if (el.empty) el.empty.hidden = true;
  }

  function switchView(view) {
    state.view = view;
    el.tabs.forEach(function (b) {
      var on = b.getAttribute('data-view') === view;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (el.papers) el.papers.hidden = view !== 'papers';
    if (el.daily) el.daily.hidden = view !== 'daily';
    if (el.chips) el.chips.hidden = view !== 'papers';
    if (el.moreWrap) el.moreWrap.hidden = view !== 'papers' || filtered().length <= state.shown;
  }

  // ---------- 事件 ----------

  function init() {
    bind();
    if (!el.papers) return; // 非本板块页面

    el.tabs.forEach(function (b) {
      b.addEventListener('click', function () { switchView(b.getAttribute('data-view')); });
    });

    el.chips.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dir]');
      if (!b) return;
      state.dir = b.getAttribute('data-dir');
      state.shown = PAGE;
      renderChips();
      renderPapers();
    });

    var timer = null;
    el.q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = el.q.value || '';
        state.shown = PAGE;
        renderPapers();
      }, 200);
    });

    el.more.addEventListener('click', function () {
      state.shown += PAGE;
      renderPapers();
    });

    el.daily.addEventListener('click', function (e) {
      var b = e.target.closest('.frss-expand');
      if (!b) return;
      var art = b.closest('.frss-day');
      var on = art.classList.toggle('is-open');
      b.textContent = on ? '收起' : '展开全文';
    });

    el.refresh.addEventListener('click', function () {
      el.refresh.disabled = true;
      load(true);
      setTimeout(function () { el.refresh.disabled = false; }, 1200);
    });

    load(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
