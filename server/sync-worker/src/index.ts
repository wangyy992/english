// 知更 Robin 同步後端(Cloudflare Worker)。
// 職責:郵箱驗證碼登錄 + 單用戶進度 blob 的版本化存取。
// 服務端為準:PUT 帶 baseVersion,落後即 409,客戶端拉取後重推。
//
// 綁定(wrangler.toml / secrets):
//   KV: DATA
//   secret AUTH_SECRET      — token 簽名密鑰(隨機長字符串)
//   secret RESEND_API_KEY   — Resend 發信(可選;未配置時僅 DEV_MODE=1 可用)
//   var ALLOWED_EMAILS      — 逗號分隔的允許登錄郵箱(自用強烈建議設置)
//   var DEV_MODE            — '1' 時驗證碼直接隨響應返回(本地調試用)

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  DATA: KVNamespace;
  AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  ALLOWED_EMAILS?: string;
  DEV_MODE?: string;
}

const CODE_TTL_SECONDS = 600;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 天

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function normEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function emailAllowed(email: string, env: Env): boolean {
  const list = env.ALLOWED_EMAILS?.trim();
  if (!list) return true;
  return list
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .includes(email);
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function makeToken(email: string, env: Env): Promise<string> {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${btoa(email)}.${exp}`;
  return `${payload}.${await hmac(env.AUTH_SECRET, payload)}`;
}

async function verifyToken(req: Request, env: Env): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const parts = auth.slice(7).split('.');
  if (parts.length !== 3) return null;
  const [emailB64, expStr, sig] = parts;
  if (Number(expStr) < Date.now()) return null;
  const expected = await hmac(env.AUTH_SECRET, `${emailB64}.${expStr}`);
  if (sig !== expected) return null;
  try {
    return atob(emailB64);
  } catch {
    return null;
  }
}

async function sendCodeEmail(email: string, code: string, env: Env): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'Robin <onboarding@resend.dev>',
      to: [email],
      subject: `知更 Robin 登录验证码:${code}`,
      text: `你的验证码是 ${code},10 分钟内有效。若非本人操作请忽略。`,
    }),
  });
  return res.ok;
}

interface StoredBlob {
  version: number;
  updatedAt: number;
  payload: unknown;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/auth/request-code') {
      const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
      const email = normEmail(body?.email);
      if (!email) return json({ error: '邮箱格式不正确' }, 400);
      if (!emailAllowed(email, env)) return json({ error: '该邮箱未被允许登录' }, 403);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await env.DATA.put(`code:${email}`, code, { expirationTtl: CODE_TTL_SECONDS });

      const sent = await sendCodeEmail(email, code, env);
      if (sent) return json({ ok: true });
      if (env.DEV_MODE === '1') return json({ ok: true, devCode: code });
      return json({ error: '发信服务未配置(需设置 RESEND_API_KEY)' }, 500);
    }

    if (req.method === 'POST' && url.pathname === '/auth/verify') {
      const body = (await req.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
      const email = normEmail(body?.email);
      if (!email || typeof body?.code !== 'string') return json({ error: '参数不完整' }, 400);
      const stored = await env.DATA.get(`code:${email}`);
      if (!stored || stored !== body.code.trim()) return json({ error: '验证码错误或已过期' }, 401);
      return json({ ok: true, token: await makeToken(email, env) });
    }

    if (url.pathname === '/sync') {
      const email = await verifyToken(req, env);
      if (!email) return json({ error: '未登录或登录已过期' }, 401);
      const key = `data:${email}`;

      if (req.method === 'GET') {
        const raw = await env.DATA.get(key);
        if (!raw) return json({ version: 0, updatedAt: 0, payload: null });
        return new Response(raw, { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
      }

      if (req.method === 'PUT') {
        const body = (await req.json().catch(() => null)) as { baseVersion?: unknown; payload?: unknown } | null;
        if (!body || typeof body.baseVersion !== 'number' || body.payload === undefined) {
          return json({ error: '参数不完整' }, 400);
        }
        const raw = await env.DATA.get(key);
        const current: StoredBlob = raw ? (JSON.parse(raw) as StoredBlob) : { version: 0, updatedAt: 0, payload: null };
        if (body.baseVersion !== current.version) {
          return json({ error: 'conflict', version: current.version }, 409);
        }
        const next: StoredBlob = { version: current.version + 1, updatedAt: Date.now(), payload: body.payload };
        await env.DATA.put(key, JSON.stringify(next));
        return json({ ok: true, version: next.version, updatedAt: next.updatedAt });
      }
    }

    return json({ error: 'not found' }, 404);
  },
};
