// 个人站渐进增强脚本（纯原生 JS，无框架依赖）
(function () {
  'use strict';

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
  function renderHeatmap(username, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !username) return;
    var year = new Date().getFullYear();
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
        container.innerHTML = buildHeatmap(contribs);
      })
      .catch(function () { container.style.display = 'none'; });
  }

  // 把每日贡献按「周(列) x 星期(行)」分组并渲染为方块网格
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HM_PITCH = 12; // 9px cell + 3px gap

  function buildHeatmap(contribs) {
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

    return '<div class="hm-scroll">' +
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

  // 启动入口
  function boot() {
    initZoom();
    initTyping();
    var hm = document.getElementById('github-heatmap');
    if (hm) {
      var user = hm.getAttribute('data-user') || 'shanqiiu';
      renderHeatmap(user, 'github-heatmap');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
