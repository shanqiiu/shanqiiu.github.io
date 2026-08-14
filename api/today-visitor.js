// Vercel Serverless Function —— 真实「今日访客」统计（Supabase 版）
// 思路：用访客 IP 做 SHA-256 哈希（不直接存明文 IP，兼顾隐私），
//       调用 Supabase RPC 把哈希写入当日集合（按 day 去重），返回当日独立访客数。
// 依赖：环境变量中以下任一前缀的 SUPABASE_URL + 配套 *_SERVICE_ROLE_KEY / *_ANON_KEY
//   优先级：SUPABASE_* / NEXT_PUBLIC_SUPABASE_* > STORAGE_*（Vercel 集成） > 任意兜底
// 路由：GET /api/today-visitor
const { createHash } = require('crypto');

// 从环境变量中定位 Supabase 连接信息（兼容多种前缀命名）
function findSupabaseEnv(env) {
  const entries = Object.keys(env || {});
  let url = null;
  let key = null;

  // 给定 URL 变量名(urlKey，值 u)，推断配套的 key 候选名
  const tryKeysFor = function (u, urlKey) {
    if (!u || !/supabase\.(co|in)/i.test(u) || url) return;
    // 去掉 _URL / _SUPABASE_URL 后缀，得到前缀（如 STORAGE / NEXT_PUBLIC / 空）
    let prefix = urlKey.replace(/_?(SUPABASE_URL|URL)$/i, '').replace(/_$/, '');
    // SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL 统一回退到 SUPABASE 前缀
    const p = prefix === 'SUPABASE' || prefix === '' ? 'SUPABASE' : prefix;
    const candidates = [
      p + '_SERVICE_ROLE_KEY',
      p + '_SUPABASE_SERVICE_ROLE_KEY',
      p + '_ANON_KEY',
      p + '_SUPABASE_ANON_KEY',
    ];
    for (const c of candidates) {
      if (env[c]) {
        url = u;
        key = env[c];
        return;
      }
    }
  };

  // 优先级 1（最高）：SUPABASE_* 或 NEXT_PUBLIC_SUPABASE_* 前缀（手动配置的最高优先级）
  for (const k of entries) {
    if (/^SUPABASE_/i.test(k) && /supabase\.(co|in)/i.test(env[k] || '')) {
      tryKeysFor(env[k], k);
      if (url) break;
    }
  }
  // 优先级 2：STORAGE_* 前缀（Vercel Supabase Integration 注入；被 SUPABASE_* 覆盖）
  if (!url) {
    for (const k of entries) {
      if (/STORAGE/i.test(k) && /supabase\.(co|in)/i.test(env[k] || '')) {
        tryKeysFor(env[k], k);
        if (url) break;
      }
    }
  }
  // 优先级 3：兜底——任意包含 supabase.co/in 的 URL（排除 PASSWORD/HOST/POSTGRES/PRISMA）
  if (!url) {
    for (const k of entries) {
      if (
        /supabase\.(co|in)/i.test(env[k] || '') &&
        !/PASSWORD|HOST|PRISMA|POSTGRES/i.test(k)
      ) {
        tryKeysFor(env[k], k);
        if (url) break;
      }
    }
  }
  return { url, key };
}

module.exports = async function handler(req, res) {
  const env = findSupabaseEnv(process.env);
  if (!env.url || !env.key) {
    // 诊断：把含 supabase/storage/url/key 的环境变量名打出来，便于在 Vercel Functions 日志定位
    const candidateKeys = Object.keys(process.env).filter((k) =>
      /supabase|storage|url|key/i.test(k)
    );
    console.error('[today-visitor] supabase env not found. candidate keys:', candidateKeys);
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
      const body = await r.text();
      console.error('[today-visitor] rpc failed:', r.status, body.slice(0, 300));
      res.status(200).json({ count: null });
      return;
    }
    const text = await r.text();
    const count = Number(text);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ count: isFinite(count) ? count : null });
  } catch (e) {
    console.error('[today-visitor] fetch error:', e && e.message);
    res.status(200).json({ count: null });
  }
};
