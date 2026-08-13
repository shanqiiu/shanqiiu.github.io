// 个人站渐进增强脚本（纯原生 JS，无框架依赖）
(function () {
  'use strict';

  function initTheme() {
    var root = document.documentElement;
    var toggle = document.getElementById('theme-toggle');
    var stored = null;
    try {
      stored = localStorage.getItem('theme');
    } catch (e) { /* ignore */ }
    if (stored === 'light' || stored === 'dark') {
      root.setAttribute('data-theme', stored);
    }

    function syncToggle() {
      if (!toggle) return;
      var isDark = root.getAttribute('data-theme') === 'dark';
      toggle.setAttribute('aria-pressed', String(isDark));
      toggle.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }

    syncToggle();
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try {
          localStorage.setItem('theme', next);
        } catch (e) { /* ignore */ }
        syncToggle();
      });
    }
  }
  initTheme();

  function initVisitorStats() {
    var el = document.getElementById('today-visitor-count');
    if (!el) return;
    var now = new Date();
    var dateKey = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    var countKey = 'shanqiiu:visitors:today:' + dateKey;
    var seenKey = countKey + ':seen';
    var count = 1;
    try {
      count = Number(localStorage.getItem(countKey) || '0');
      if (!localStorage.getItem(seenKey)) {
        count += 1;
        localStorage.setItem(countKey, String(count));
        localStorage.setItem(seenKey, '1');
      }
    } catch (e) {
      count = 1;
    }
    el.textContent = String(Math.max(1, count));
  }

  function initKnowledgeBase() {
    var grid = document.getElementById('resource-card-grid');
    if (!grid) return;
    var search = document.getElementById('resource-search');
    var categories = document.getElementById('resource-categories');
    var sidebar = document.getElementById('resource-sidebar');
    var sidebarToggle = document.getElementById('knowledge-sidebar-toggle');
    var sidebarClose = document.getElementById('resource-sidebar-close');
    var sidebarBackdrop = document.getElementById('resource-sidebar-backdrop');
    var totalEl = document.getElementById('knowledge-total-count');
    var visibleEl = document.getElementById('knowledge-visible-count');
    var syncEl = document.getElementById('knowledge-sync-state');
    var drawer = document.getElementById('knowledge-drawer');
    var drawerClose = document.getElementById('knowledge-drawer-close');
    var newBtn = document.getElementById('knowledge-new-btn');
    var login = document.getElementById('knowledge-login');
    var loginBtn = document.getElementById('knowledge-login-btn');
    var emailInput = document.getElementById('knowledge-email');
    var form = document.getElementById('knowledge-form');
    var formStatus = document.getElementById('knowledge-form-status');
    var cat1 = document.getElementById('knowledge-category-1');
    var cat2 = document.getElementById('knowledge-category-2');
    var cat3 = document.getElementById('knowledge-category-3');
    var taxonomyEl = document.getElementById('knowledge-taxonomy-data');
    var taxonomy = {};
    try {
      taxonomy = taxonomyEl ? JSON.parse(taxonomyEl.textContent || '{}') : {};
    } catch (e) {
      taxonomy = {};
    }

    var supabaseClient = null;
    var isAdminSession = false;
    var editingId = null;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.resource-card'));
    var activePath = 'ALL';

    function cleanStr(v) {
      if (typeof v !== 'string') return '';
      var s = v.trim();
      if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
          (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
        s = s.slice(1, -1).trim();
      }
      return s;
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(str || ''));
      return div.innerHTML;
    }

    function syncCards() {
      cards = Array.prototype.slice.call(grid.querySelectorAll('.resource-card'));
      if (totalEl) totalEl.textContent = String(cards.length);
      applyFilters();
    }

    function applyFilters() {
      var query = search ? String(search.value || '').trim().toLowerCase() : '';
      var visible = 0;
      cards.forEach(function (card) {
        var path = card.getAttribute('data-path') || '';
        var haystack = card.getAttribute('data-search') || '';
        var matchesCategory = activePath === 'ALL' || path === activePath || path.indexOf(activePath + ' / ') === 0;
        var matchesQuery = !query || haystack.indexOf(query) !== -1;
        var matched = matchesCategory && matchesQuery;
        card.classList.toggle('is-hidden', !matched);
        if (matched) visible += 1;
      });
      if (visibleEl) visibleEl.textContent = String(visible);
    }

    function openSidebar() {
      if (!sidebar) return;
      sidebar.classList.remove('is-collapsed');
      document.body.classList.add('resource-sidebar-open');
      if (sidebarBackdrop) sidebarBackdrop.hidden = false;
      if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
      try { localStorage.setItem('knowledge-sidebar-collapsed', '0'); } catch (e) {}
    }

    function closeSidebar() {
      if (!sidebar) return;
      sidebar.classList.add('is-collapsed');
      document.body.classList.remove('resource-sidebar-open');
      if (sidebarBackdrop) sidebarBackdrop.hidden = true;
      if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
      try { localStorage.setItem('knowledge-sidebar-collapsed', '1'); } catch (e) {}
    }

    if (search) {
      search.addEventListener('input', applyFilters);
    }
    if (categories) {
      categories.addEventListener('click', function (event) {
        var btn = event.target.closest('.resource-category');
        if (!btn) return;
        activePath = btn.getAttribute('data-path') || 'ALL';
        categories.querySelectorAll('.resource-category').forEach(function (item) {
          item.classList.toggle('is-active', item === btn);
        });
        applyFilters();
      });
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        if (sidebar && sidebar.classList.contains('is-collapsed')) openSidebar();
        else closeSidebar();
      });
    }
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);
    try {
      if (localStorage.getItem('knowledge-sidebar-collapsed') === '1') closeSidebar();
    } catch (e) {}

    function openDrawer() {
      if (!drawer) return;
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      populateCategories();
      refreshAuthState();
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
    }

    if (newBtn) newBtn.addEventListener('click', function () {
      editingId = null;
      if (form) form.reset();
      openDrawer();
    });
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);

    function populateCategories() {
      if (!cat1 || !cat2 || !cat3) return;
      var topLevels = taxonomy.top_levels || [];
      cat1.innerHTML = topLevels.map(function (top) {
        return '<option value="' + escapeHtml(top.name) + '">' + escapeHtml(top.name) + '</option>';
      }).join('');
      populateSecond();
    }

    function populateSecond() {
      if (!cat1 || !cat2 || !cat3) return;
      var topLevels = taxonomy.top_levels || [];
      var top = topLevels.find(function (item) { return item.name === cat1.value; }) || topLevels[0] || {};
      var children = top.children || [];
      cat2.innerHTML = children.map(function (child) {
        return '<option value="' + escapeHtml(child.name) + '">' + escapeHtml(child.name) + '</option>';
      }).join('');
      populateThird();
    }

    function populateThird() {
      if (!cat1 || !cat2 || !cat3) return;
      var topLevels = taxonomy.top_levels || [];
      var top = topLevels.find(function (item) { return item.name === cat1.value; }) || {};
      var second = (top.children || []).find(function (item) { return item.name === cat2.value; }) || {};
      var children = second.children || [];
      cat3.innerHTML = children.map(function (name) {
        return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
      }).join('');
    }

    if (cat1) cat1.addEventListener('change', populateSecond);
    if (cat2) cat2.addEventListener('change', populateThird);

    function createSupabaseClient() {
      if (supabaseClient) return supabaseClient;
      var raw = window.SUPABASE_CONFIG || null;
      if (!raw || !window.supabase || typeof window.supabase.createClient !== 'function') return null;
      var url = cleanStr(raw.url);
      var anonKey = cleanStr(raw.anonKey);
      if (!url || !anonKey) return null;
      supabaseClient = window.supabase.createClient(url, anonKey);
      return supabaseClient;
    }

    function setSync(text) {
      if (syncEl) syncEl.textContent = text;
    }

    function renderDynamicItem(item) {
      var pathParts = [item.category_1, item.category_2, item.category_3].filter(Boolean);
      var path = pathParts.join(' / ');
      var tags = Array.isArray(item.tags) ? item.tags : [];
      var link = item.link || '#';
      var searchText = [item.title, item.description, path, tags.join(' ')].join(' ').toLowerCase();
      var card = document.createElement('a');
      card.className = 'resource-card resource-card-dynamic';
      card.setAttribute('data-id', item.id || '');
      card.href = link || '#';
      if (link) {
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      }
      card.setAttribute('data-category', item.category_1 || '');
      card.setAttribute('data-path', path);
      card.setAttribute('data-search', searchText);
      card.innerHTML =
        '<div class="resource-card-inner">' +
          '<div class="resource-path">' + escapeHtml(path) + '</div>' +
          '<h2>' + escapeHtml(item.title) + '</h2>' +
          '<p>' + escapeHtml(item.description || '') + '</p>' +
          '<div class="resource-card-tags">' + tags.map(function (tag) {
            return '<span class="resource-tag">' + escapeHtml(tag) + '</span>';
          }).join('') + '</div>' +
          '<div class="resource-meta"><span>' + escapeHtml(item.item_type || 'resource') + '</span></div>' +
          '<div class="resource-date"><span>' + escapeHtml(item.status === 'draft' ? '草稿' : '云端资源') + '</span></div>' +
          '<button class="knowledge-edit-btn" type="button" data-edit-id="' + escapeHtml(item.id || '') + '">编辑</button>' +
        '</div>';
      card._knowledgeItem = item;
      grid.prepend(card);
    }

    function loadDynamicItems() {
      var client = createSupabaseClient();
      if (!client) {
        setSync('静态数据；配置 Supabase 后启用云端新增');
        syncCards();
        return;
      }
      setSync('正在同步云端知识库...');
      client
        .from('knowledge_items')
        .select('id,title,description,content_markdown,link,category_1,category_2,category_3,tags,item_type,status,created_at')
        .order('created_at', { ascending: false })
        .then(function (result) {
          if (result.error) {
            setSync('云端同步失败：' + result.error.message);
            syncCards();
            return;
          }
          (result.data || []).forEach(renderDynamicItem);
          setSync('已同步云端知识库');
          syncCards();
        });
    }

    function waitForSupabase(callback) {
      if (createSupabaseClient()) {
        callback();
        return;
      }
      var raw = window.SUPABASE_CONFIG || null;
      if (!raw) {
        callback();
        return;
      }
      var waited = 0;
      var timer = setInterval(function () {
        if (createSupabaseClient()) {
          clearInterval(timer);
          callback();
          return;
        }
        waited += 250;
        if (waited >= 30000) {
          clearInterval(timer);
          callback();
        }
      }, 250);
    }

    function refreshAuthState() {
      var client = createSupabaseClient();
      if (!form || !login) return;
      if (!client) {
        login.hidden = false;
        form.hidden = true;
        if (formStatus) formStatus.textContent = '未配置 Supabase，无法在页面保存。';
        return;
      }
      client.auth.getSession().then(function (result) {
        var authed = !!(result.data && result.data.session);
        isAdminSession = authed;
        login.hidden = authed;
        form.hidden = !authed;
        document.body.classList.toggle('knowledge-admin-active', authed);
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', function () {
        var client = createSupabaseClient();
        var email = emailInput ? emailInput.value.trim() : '';
        if (!client || !email) return;
        loginBtn.disabled = true;
        client.auth.signInWithOtp({
          email: email,
          options: { emailRedirectTo: window.location.href }
        }).then(function (result) {
          loginBtn.disabled = false;
          if (formStatus) formStatus.textContent = result.error ? result.error.message : '登录链接已发送，请检查邮箱。';
        });
      });
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var client = createSupabaseClient();
        if (!client) return;
        var data = new FormData(form);
        var tags = String(data.get('tags') || '').split(',').map(function (tag) {
          return tag.trim();
        }).filter(Boolean);
        var payload = {
          title: String(data.get('title') || '').trim(),
          description: String(data.get('description') || '').trim(),
          content_markdown: String(data.get('content_markdown') || '').trim(),
          link: String(data.get('link') || '').trim(),
          category_1: String(data.get('category_1') || '').trim(),
          category_2: String(data.get('category_2') || '').trim(),
          category_3: String(data.get('category_3') || '').trim(),
          item_type: String(data.get('item_type') || 'external'),
          status: String(data.get('status') || 'published'),
          tags: tags
        };
        if (!payload.title || !payload.category_1 || !payload.category_2) return;
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        if (formStatus) formStatus.textContent = '正在保存...';
        var request = editingId
          ? client.from('knowledge_items').update(payload).eq('id', editingId).select().single()
          : client.from('knowledge_items').insert(payload).select().single();
        request.then(function (result) {
          if (btn) btn.disabled = false;
          if (result.error) {
            if (formStatus) formStatus.textContent = result.error.message;
            return;
          }
          if (formStatus) formStatus.textContent = '已保存。';
          form.reset();
          populateCategories();
          if (result.data) {
            if (editingId) {
              var oldCard = grid.querySelector('[data-id="' + editingId + '"]');
              if (oldCard) oldCard.remove();
            }
            renderDynamicItem(result.data);
          }
          editingId = null;
          syncCards();
        });
      });
    }

    grid.addEventListener('click', function (event) {
      var editBtn = event.target.closest('[data-edit-id]');
      if (!editBtn || !isAdminSession) return;
      event.preventDefault();
      var card = editBtn.closest('.resource-card');
      var item = card && card._knowledgeItem;
      if (!item || !form) return;
      openDrawer();
      editingId = item.id || null;
      form.elements.title.value = item.title || '';
      form.elements.link.value = item.link || '';
      form.elements.description.value = item.description || '';
      form.elements.content_markdown.value = item.content_markdown || '';
      form.elements.item_type.value = item.item_type || 'external';
      form.elements.status.value = item.status || 'published';
      form.elements.tags.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
      cat1.value = item.category_1 || cat1.value;
      populateSecond();
      cat2.value = item.category_2 || cat2.value;
      populateThird();
      cat3.value = item.category_3 || cat3.value;
    });

    populateCategories();
    syncCards();
    waitForSupabase(loadDynamicItems);
  }

  // 1) 首屏加载动画：资源就绪后移除 loader
  function hideLoader() {
    var loader = document.getElementById('page-loader');
    if (!loader) return;
    loader.classList.add('is-hidden');
    // 动画结束再从 DOM 移除，避免遮挡后续交互
    setTimeout(function () {
      if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    }, 600);
  }
  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
    // 兜底：最多 2.6s 强制移除，防止资源/JS 异常时永久遮挡内容
    setTimeout(hideLoader, 2600);
  }

  // 2) 图片灯箱（medium-zoom 由 CDN 引入；未加载则安全跳过）
  function initZoom() {
    if (window.mediumZoom) {
      try {
        window.mediumZoom('img:not(.no-zoom):not([data-zoom-ignore])', {
          background: 'rgba(0,0,0,0.86)',
          margin: 24
        });
      } catch (e) { /* 忽略异常 */ }
    }
  }

  // 3) GitHub 贡献热力图
  function renderHeatmap(username, containerId, year) {
    var container = document.getElementById(containerId);
    if (!container || !username) return;
    var currentYear = new Date().getFullYear();
    year = Number(year) || Number(container.getAttribute('data-year')) || currentYear;
    year = Math.min(currentYear, Math.max(2008, year));
    container.classList.add('hm-loading');
    var api = 'https://github-contributions-api.jogruber.de/v4/' +
              encodeURIComponent(username) + '?y=' + year;
    fetch(api)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var contribs = (data && data.contributions) || [];
        if (!contribs.length) { container.style.display = 'none'; return; }
        var total = contribs.reduce(function (sum, c) {
          return sum + (Number(c.count) || 0);
        }, 0);
        container.setAttribute('data-total', String(total));
        container.setAttribute('data-year', String(year));
        container.innerHTML = buildHeatmap(contribs, year, currentYear);
        container.classList.remove('hm-loading');
      })
      .catch(function () {
        container.classList.remove('hm-loading');
        container.style.display = 'none';
      });
  }

  // 把每日贡献按「周(列) x 星期(行)」分组并渲染为方块网格
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HM_PITCH = 12; // 9px cell + 3px gap

  function buildHeatmap(contribs, year, currentYear) {
    var weeks = [];
    var week = null;
    var started = false;
    contribs.forEach(function (c) {
      var d = new Date(c.date + 'T00:00:00');
      var dow = d.getDay(); // 0=周日
      if (!started) {
        started = true;
        week = { days: new Array(7).fill(null), first: d };
        week.days[dow] = c;
        weeks.push(week);
      } else if (dow === 0) {
        week = { days: new Array(7).fill(null), first: d };
        week.days[0] = c;
        weeks.push(week);
      } else {
        week.days[dow] = c;
      }
    });

    var cells = '';
    weeks.forEach(function (w) {
      cells += '<div class="hm-col">';
      for (var i = 0; i < 7; i++) {
        var c = w.days[i];
        if (!c) { cells += '<span class="hm-cell hm-empty"></span>'; continue; }
        var lvl = c.level || 0;
        var tip = c.date + '：' + c.count + ' 次贡献';
        cells += '<span class="hm-cell lvl-' + lvl + '" title="' + tip + '"></span>';
      }
      cells += '</div>';
    });

    // 月份横轴标签：当某列首日是新月份时标注（首项固定标注）
    var monthLabels = '';
    var lastMonth = -1;
    weeks.forEach(function (w, idx) {
      var m = w.first.getMonth();
      if (m !== lastMonth) {
        monthLabels += '<span class="hm-month" style="left:' + (idx * HM_PITCH) +
                       'px">' + MONTHS[m] + '</span>';
        lastMonth = m;
      }
    });

    var nextDisabled = year >= currentYear ? ' disabled aria-disabled="true"' : '';
    return '<div class="hm-year-controls" aria-label="Contribution year">' +
             '<button class="hm-year-btn" type="button" data-year="' + (year - 1) + '" aria-label="Previous year">‹</button>' +
             '<span class="hm-year-current">' + year + '</span>' +
             '<button class="hm-year-btn" type="button" data-year="' + (year + 1) + '" aria-label="Next year"' + nextDisabled + '>›</button>' +
           '</div>' +
           '<div class="hm-scroll">' +
             '<div class="hm-months">' + monthLabels + '</div>' +
             '<div class="hm-grid" role="img" aria-label="GitHub 贡献热力图">' + cells + '</div>' +
           '</div>' +
           '<div class="hm-legend"><span>少</span>' +
           '<span class="hm-cell lvl-0"></span><span class="hm-cell lvl-1"></span>' +
           '<span class="hm-cell lvl-2"></span><span class="hm-cell lvl-3"></span>' +
           '<span class="hm-cell lvl-4"></span><span>多</span></div>';
  }

  // 4) Hero 打字机效果
  function initTyping() {
    var el = document.querySelector('[data-typing]');
    if (!el) return;
    var nameSpan = el.querySelector('.hero-name');
    var enSpan = el.querySelector('.hero-en');
    var cursor = el.querySelector('.typing-cursor');
    if (!nameSpan || !enSpan || !cursor) return;

    var finalName = nameSpan.textContent || '';
    var finalEn = enSpan.textContent || '';
    var fullText = finalName + (finalEn ? ' ' + finalEn : '');

    // 清空内容，只保留光标
    nameSpan.textContent = '';
    enSpan.textContent = '';
    el.insertBefore(nameSpan, cursor);
    el.insertBefore(enSpan, cursor);

    var i = 0;
    var speed = 90;
    function type() {
      if (i <= fullText.length) {
        var current = fullText.slice(0, i);
        var nameEnd = finalName.length;
        if (i <= nameEnd) {
          nameSpan.textContent = current;
          enSpan.textContent = '';
        } else {
          nameSpan.textContent = finalName;
          enSpan.textContent = current.slice(nameEnd + 1); // 跳过中间空格
        }
        i++;
        setTimeout(type, speed + Math.random() * 40);
      }
    }
    // 等 loader 淡出后再开始打字，避免被遮挡
    setTimeout(type, 700);
  }

  // 5) 背景音乐播放器
  function initMusicPlayer() {
    var player = document.getElementById('music-player');
    var audio = document.getElementById('music-audio');
    var playBtn = document.getElementById('music-play');
    var prevBtn = document.getElementById('music-prev');
    var nextBtn = document.getElementById('music-next');
    var muteBtn = document.getElementById('music-mute');
    var toggle = document.getElementById('music-toggle');
    var progress = document.getElementById('music-progress');
    var timeEl = document.getElementById('music-time');
    if (!player || !audio || !playBtn) return;

    function formatTime(s) {
      if (!isFinite(s)) return '00:00';
      var m = Math.floor(s / 60);
      var sec = Math.floor(s % 60);
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function updateTime() {
      var current = audio.currentTime || 0;
      var duration = audio.duration || 0;
      timeEl.textContent = formatTime(current) + ' / ' + formatTime(duration);
      var percent = 0;
      if (duration) {
        percent = (current / duration) * 100;
        progress.value = String(percent);
      }
      progress.style.background = 'linear-gradient(90deg, var(--accent) ' + percent + '%, rgba(255, 255, 255, 0.14) ' + percent + '%)';
    }

    function setPlaying(isPlaying) {
      playBtn.classList.toggle('is-playing', isPlaying);
      playBtn.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
      playBtn.setAttribute('title', isPlaying ? '暂停' : '播放');
      playBtn.innerHTML = isPlaying
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }

    function play() {
      audio.play().then(function () {
        setPlaying(true);
      }).catch(function () {
        // 浏览器自动播放策略拦截，保持暂停态
      });
    }

    function pause() {
      audio.pause();
      setPlaying(false);
    }

    playBtn.addEventListener('click', function () {
      if (audio.paused) play(); else pause();
    });

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('ended', function () {
      setPlaying(false);
      progress.value = '0';
      progress.style.background = 'linear-gradient(90deg, var(--accent) 0%, rgba(255, 255, 255, 0.14) 0%)';
    });

    progress.addEventListener('input', function () {
      var duration = audio.duration || 0;
      var percent = Number(progress.value) || 0;
      progress.style.background = 'linear-gradient(90deg, var(--accent) ' + percent + '%, rgba(255, 255, 255, 0.14) ' + percent + '%)';
      if (duration) {
        audio.currentTime = (percent / 100) * duration;
      }
    });

    muteBtn.addEventListener('click', function () {
      audio.muted = !audio.muted;
      muteBtn.setAttribute('aria-label', audio.muted ? '取消静音' : '静音');
      muteBtn.setAttribute('title', audio.muted ? '取消静音' : '静音');
      muteBtn.innerHTML = audio.muted
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    });

    prevBtn.addEventListener('click', function () {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    });

    nextBtn.addEventListener('click', function () {
      var duration = audio.duration || 0;
      audio.currentTime = Math.min(duration, audio.currentTime + 10);
    });

    function setCollapsed(collapsed) {
      player.classList.toggle('is-collapsed', collapsed);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggle.setAttribute('aria-label', collapsed ? '展开播放器' : '收起播放器');
      toggle.setAttribute('title', collapsed ? '展开播放器' : '收起播放器');
      try {
        localStorage.setItem('music-player-collapsed', collapsed ? '1' : '0');
      } catch (e) { /* ignore */ }
    }

    toggle.addEventListener('click', function () {
      setCollapsed(!player.classList.contains('is-collapsed'));
    });

    try {
      var stored = localStorage.getItem('music-player-collapsed');
      if (stored === '1') setCollapsed(true);
    } catch (e) { /* ignore */ }

    // 初始时间显示
    updateTime();
  }

  // 6) 返回顶部按钮
  function initScrollTop() {
    var btn = document.createElement('button');
    btn.className = 'scroll-top';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', '返回顶部');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
    document.body.appendChild(btn);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var scrolled = window.pageYOffset || document.documentElement.scrollTop;
        btn.classList.toggle('is-visible', scrolled > 400);
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    onScroll();
  }

  // 7) page-nav-fab 当前页面高亮
  function initNavHighlight() {
    var menuLinks = document.querySelectorAll('.page-nav-menu a');
    if (!menuLinks.length) return;
    var currentPath = window.location.pathname.replace(/\/+$/, '');
    if (currentPath === '') currentPath = '/';

    menuLinks.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      var linkPath = href.replace(/\/+$/, '');
      if (linkPath === '') linkPath = '/';

      var isMatch = currentPath === linkPath ||
                     (linkPath !== '/' && currentPath.indexOf(linkPath + '/') === 0);
      if (isMatch) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // 8) 滚动揭示动画
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    var revealTargets = document.querySelectorAll(
      '.project-card, .post-card, .nav-card, .resource-card, .learning-card, .list-item, .timeline-item'
    );
    revealTargets.forEach(function (el) {
      el.classList.add('reveal');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  }

  // 9) 音乐播放器 aria-expanded 同步
  function initMusicAriaSync() {
    var player = document.getElementById('music-player');
    var toggle = document.getElementById('music-toggle');
    if (!player || !toggle) return;

    function syncAria() {
      var collapsed = player.classList.contains('is-collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    }

    syncAria();
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === 'class') syncAria();
      });
    });
    observer.observe(player, { attributes: true });
  }

  // 启动入口
  function boot() {
    initZoom();
    initTyping();
    initVisitorStats();
    initKnowledgeBase();
    initMusicPlayer();
    initScrollTop();
    initNavHighlight();
    initScrollReveal();
    initMusicAriaSync();
    var hm = document.getElementById('github-heatmap');
    if (hm) {
      var user = hm.getAttribute('data-user') || 'shanqiiu';
      renderHeatmap(user, 'github-heatmap');
      hm.addEventListener('click', function (event) {
        var btn = event.target.closest('.hm-year-btn');
        if (!btn || btn.disabled) return;
        renderHeatmap(user, 'github-heatmap', btn.getAttribute('data-year'));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
