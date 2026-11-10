// GET  /api/embed  -> { code, enabled, updatedAt }   (public: the site reads this)
// POST /api/embed  -> { password, code, enabled }     (admin only)
//      /api/embed  -> { password, verifyOnly: true }  (admin login check)
//
// Needs two environment variables in Vercel:
//   DATABASE_URL   - Neon Postgres connection string
//   ADMIN_PASSWORD - password for /admin

import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';

const MAX_CODE_LENGTH = 20000;
const KEY = 'chat_widget';

function passwordOk(given) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'DATABASE_URL is not set in Vercel.' });
  }
  const sql = neon(process.env.DATABASE_URL);

  try {
    await sql`CREATE TABLE IF NOT EXISTS site_settings (
      key        text PRIMARY KEY,
      value      jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

    if (req.method === 'GET') {
      const rows = await sql`SELECT value, updated_at FROM site_settings WHERE key = ${KEY}`;
      const value = rows[0]?.value || { code: '', enabled: false };
      return res.status(200).json({
        code: value.code || '',
        enabled: !!value.enabled,
        updatedAt: rows[0]?.updated_at || null,
      });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      if (!process.env.ADMIN_PASSWORD) {
        return res.status(503).json({ error: 'ADMIN_PASSWORD is not set in Vercel.' });
      }
      if (!passwordOk(body.password)) {
        return res.status(401).json({ error: 'Wrong password.' });
      }
      if (body.verifyOnly) return res.status(200).json({ ok: true });

      const code = String(body.code ?? '');
      if (code.length > MAX_CODE_LENGTH) {
        return res.status(413).json({ error: `Embed code is too long (max ${MAX_CODE_LENGTH} characters).` });
      }
      const value = JSON.stringify({ code, enabled: !!body.enabled });
      const rows = await sql`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES (${KEY}, ${value}::jsonb, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        RETURNING updated_at`;
      return res.status(200).json({ ok: true, updatedAt: rows[0].updated_at });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error — check the Vercel function logs.' });
  }
}
