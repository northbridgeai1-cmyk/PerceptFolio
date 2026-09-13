/* POST /api/leave — end the session on this device. The grant is untouched; the code still works
   elsewhere and can be entered again here. Pausing a grant is the operator's job, from admin. */
import { clearCookie } from '../_lib/session.js';
export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Set-Cookie': clearCookie() },
  });
}
