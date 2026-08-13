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

  function initResourceFilters() {
    var grid = document.getElementById('resource-card-grid');
    if (!grid) return;
    var search = document.getElementById('resource-search');
    var categories = document.getElementById('resource-categories');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.resource-card'));
    var activeCategory = '全部';

    function applyFilters() {
      var query = search ? String(search.value || '').trim().toLowerCase() : '';
      cards.forEach(function (card) {
        var category = card.getAttribute('data-category') || '';
        var haystack = card.getAttribute('data-search') || '';
        var matchesCategory = activeCategory === '全部' || category === activeCategory;
        var matchesQuery = !query || haystack.indexOf(query) !== -1;
        card.classList.toggle('is-hidden', !(matchesCategory && matchesQuery));
      });
    }

    if (search) {
      search.addEventListener('input', applyFilters);
    }
    if (categories) {
      categories.addEventListener('click', function (event) {
        var btn = event.target.closest('.resource-category');
        if (!btn) return;
        activeCategory = btn.getAttribute('data-category') || '全部';
        categories.querySelectorAll('.resource-category').forEach(function (item) {
          item.classList.toggle('is-active', item === btn);
        });
        applyFilters();
      });
    }
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
    initResourceFilters();
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
