export const config = { runtime: 'edge' };

// Credentials come from Vercel env vars — nothing hardcoded.
//   NEON_URL   = Neon SQL-over-HTTP endpoint for this project
//   NEON_CONN  = connection string of the read-only role (dashboard_ro)
//   APP_TOKEN  = long random string, checked on every request

const ALLOWED_ORIGIN = 'https://bloodbuddie.vercel.app';

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }

  // auth gate
  const token = req.headers.get('x-app-token');
  if (!token || token !== process.env.APP_TOKEN) {
    return new Response(JSON.stringify({ error: 'unauthorized', rows: [] }), {
      status: 401,
      headers: cors(),
    });
  }

  try {
    const { query } = await req.json();

    // defense in depth: this endpoint only serves reads
    const q = (query || '').trim().toLowerCase();
    if (!(q.startsWith('select') || q.startsWith('with'))) {
      return new Response(JSON.stringify({ error: 'read-only endpoint', rows: [] }), {
        status: 403,
        headers: cors(),
      });
    }

    const res = await fetch(process.env.NEON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': process.env.NEON_CONN,
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: cors() });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, rows: [] }), {
      status: 500,
      headers: cors(),
    });
  }
}
