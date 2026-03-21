export const config = { runtime: 'edge' };

const NEON_URL = "https://ep-orange-brook-aly6hwp9.c-3.eu-central-1.aws.neon.tech/sql";
const NEON_CONN = "postgresql://neondb_owner:npg_I6Mjm2aFvdGC@ep-orange-brook-aly6hwp9-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const { query } = await req.json();
    const res = await fetch(NEON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': NEON_CONN
      },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, rows: [] }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
