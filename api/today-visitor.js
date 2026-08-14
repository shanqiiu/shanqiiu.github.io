// Vercel Serverless Function —— 真实「今日访客」统计
// 思路：用访客 IP 做 SHA-256 哈希（不直接存明文 IP，兼顾隐私），
//       写入 Vercel KV（Upstash Redis）的当日集合做去重，再读集合基数即为今日独立访客数。
// 依赖：在 Vercel 控制台为项目绑定一个 KV Database，绑定后自动注入
//       KV_REST_API_URL / KV_REST_API_TOKEN 等环境变量，无需额外配置。
// 路由：GET /api/today-visitor
const { createHash } = require('crypto');

module.exports = async function handler(req, res) {
  const url = process.env.KV_REST_API_URL || process.env.KV_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    // KV 未绑定：返回 null，前端回退显示「--」，页面不报错
    res.status(200).json({ count: null, reason: 'kv-not-configured' });
    return;
  }

  // 取访客 IP（Vercel 经 x-forwarded-for 透传，链首即客户端）
  const ip =
    (req.headers && req.headers['x-forwarded-for']
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
      : '') ||
    (req.headers && req.headers['x-real-ip']) ||
    'unknown';

  // 按 UTC 日期切分「今日」（统计口径统一，避免服务器时区漂移）
  const now = new Date();
  const day =
    now.getUTCFullYear() +
    '-' +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getUTCDate()).padStart(2, '0');

  const setKey = 'site:visitors:' + day;
  const member = createHash('sha256').update('v1:' + ip).digest('hex');

  try {
    await kv(url, token, ['sadd', setKey, member]);
    await kv(url, token, ['expire', setKey, '2592000']); // 30 天后自动过期，避免无限增长
    const scard = await kv(url, token, ['scard', setKey]);
    const count = typeof scard.result === 'number' ? scard.result : 0;
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ count });
  } catch (e) {
    res.status(200).json({ count: null });
  }
};

// 调用 Upstash Redis REST API（Vercel KV 底层）
function kv(url, token, command) {
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command }),
  }).then(function (r) {
    return r.json();
  });
}
