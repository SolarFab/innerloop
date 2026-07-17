// HTTP Basic Auth login wall for the Innerloop dashboard (Vercel Edge Middleware).
// Credentials live in the BASIC_AUTH_USER / BASIC_AUTH_PASS env vars.
export const config = { matcher: '/((?!favicon.ico).*)' };

export default function middleware(request) {
  const USER = process.env.BASIC_AUTH_USER;
  const PASS = process.env.BASIC_AUTH_PASS;
  const auth = request.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try { decoded = atob(encoded); } catch (e) {}
    const i = decoded.indexOf(':');
    if (i >= 0 && decoded.slice(0, i) === USER && decoded.slice(i + 1) === PASS) {
      return; // authorized → continue to the requested resource
    }
  }
  return new Response('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Innerloop", charset="UTF-8"' },
  });
}
