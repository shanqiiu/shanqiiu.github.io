// Vercel Serverless Function —— 真实「今日访客」统计（Supabase 版）
// 思路：用访客 IP 做 SHA-256 哈希（不直接存明文 IP，兼顾隐私），
//       调用 Supabase RPC 把哈希写入当日集合（按 day 去重），返回当日独立访客数。
// 依赖：Vercel 项目连接 Supabase 后注入的环境变量
//       （兼容 Vercel 集成 STORAGE_ 前缀、SUPABASE_ 前缀或默认命名，
//        优先 service_role，回退 anon key）。
// 路由：GET /api/today-visitor
const { createHash } = require('crypto');

// 从环境变量中定位 Supabase 连接信息（兼容多种前缀命名）
function findSupabaseEnv(env) {
  const entries = Object.keys(env || {});
  let url = null;
  let key = null;

  const consider = function (u, k) {
    if (!u || !/supabase\.(co|in)/i.test(u)) return;
    const base = k.replace(/_?(SUPABASE_URL|URL)$/i, '');
    const found =
      env[base + '_SERVICE_ROLE_KEY'] ||
      env[base + '_SUPABASE_SERVICE_ROLE_KEY'] ||
      env[base + '_ANON_KEY'] ||
      env[base + '_SUPABASE_ANON_KEY'];
    if (found) {
      url = u;
      key = found;
    }
  };

  // 优先匹配带 STORAGE 前缀的 Supabase URL
  for (const k of entries) {
    if (/STORAGE/i.test(k) && /supabase\.(co|in)/i.test(env[k] || '')) consider(env[k], k);
  }
  // 回退到任意 Supabase URL
  if (!url) {
    for (const k of entries) {
      if (/supabase\.(co|in)/i.test(env[k] || '')) {
        consider(env[k], k);
        if (url) break;
      }
    }
  }
  return { url, key };
}

module.exports = async function handler(req, res) {
  const env = findSupabaseEnv(process.env);
  if (!env.url || !env.key) {
    // Supabase 未连接：返回 null，前端回退显示「--」，页面不报错
    res.status(200).json({ count: null, reason: 'supabase-not-configured' });
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

  const member = createHash('sha256').update('v1:' + ip).digest('hex');

  try {
    const endpoint = env.url.replace(/\/$/, '') + '/rest/v1/rpc/count_today_visitor';
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: env.key,
        Authorization: 'Bearer ' + env.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_day: day, p_hash: member }),
    });
    if (!r.ok) {
      res.status(200).json({ count: null });
      return;
    }
    const text = await r.text();
    const count = Number(text);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ count: isFinite(count) ? count : null });
  } catch (e) {
    res.status(200).json({ count: null });
  }
};
