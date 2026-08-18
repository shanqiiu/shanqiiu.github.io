// 站点共享工具（单一真源，供 main.js / chat.js 共用，避免各自复制一份）
// 以 defer 在 head 中最先加载，故消费方（同为 defer）执行时 window.SiteUtils 必已就绪。
(function () {
  'use strict';

  // 容错清洗：环境变量值常因复制粘贴带入首尾空格或包裹引号，统一 trim + 去首尾引号。
  function cleanStr(v) {
    if (typeof v !== 'string') return '';
    var s = v.trim();
    if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
        (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
      s = s.slice(1, -1).trim();
    }
    return s;
  }

  // 文本转义：走 textNode，杜绝把用户输入直接塞进 innerHTML 造成 XSS。
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  window.SiteUtils = { cleanStr: cleanStr, escapeHtml: escapeHtml };
})();
