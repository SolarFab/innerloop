export const config = { runtime: 'edge' };

// Credentials come from Vercel env vars — nothing hardcoded.
//   NEON_URL  = Neon SQL-over-HTTP endpoint
//   NEON_CONN = connection string of the read-only role (dashboard_ro)
// Page + API access is gated by HTTP Basic Auth in middleware.js.

const ALLOWED_ORIGIN = 'https://bloodbuddie.vercel.app';
function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  try {
    const { query } = await req.json();
    // defense in depth: this endpoint only serves reads (also a read-only DB role)
    const q = (query || '').trim().toLowerCase();
    if (!(q.startsWith('select') || q.startsWith('with'))) {
      return new Response(JSON.stringify({ error: 'read-only endpoint', rows: [] }), { status: 403, headers: cors() });
    }
    const res = await fetch(process.env.NEON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': process.env.NEON_CONN },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: cors() });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, rows: [] }), { status: 500, headers: cors() });
  }
}
