// Talk Library sync — Cloudflare Worker with one KV namespace bound as TALKS.
// GET  /u/<64-hex key>  -> that person's saved JSON (404 if none yet)
// PUT  /u/<64-hex key>  -> save JSON; refused with 409 + the saved copy if the saved copy is newer
// The key is SHA-256("talklib:" + email), made in the app, so emails are never stored here.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const reply = (body, status = 200) => new Response(body, { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const m = new URL(req.url).pathname.match(/^\/u\/([0-9a-f]{64})$/);
    if (!m) return reply('{"ok":true,"service":"talk-sync"}', m === null && new URL(req.url).pathname === '/' ? 200 : 404);
    const key = m[1];
    if (req.method === 'GET') {
      const v = await env.TALKS.get(key);
      return v ? reply(v) : reply('{"error":"not found"}', 404);
    }
    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > 2_000_000) return reply('{"error":"too large"}', 413);
      let data; try { data = JSON.parse(text); } catch (e) { return reply('{"error":"bad json"}', 400); }
      if (!data || typeof data.u !== 'number') return reply('{"error":"missing u"}', 400);
      const old = await env.TALKS.get(key);
      if (old) { try { if ((JSON.parse(old).u || 0) > data.u) return reply(old, 409); } catch (e) {} }
      await env.TALKS.put(key, text);
      return reply('{"ok":true}');
    }
    return reply('{"error":"method"}', 405);
  },
};
