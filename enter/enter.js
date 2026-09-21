/* The code entry page. Posts JSON to /api/enter; the Function sets the session cookie and answers
   with where to go next. Nothing here can see the cookie, which is the point of HttpOnly. */
(function () {
  const q = new URLSearchParams(location.search);
  const lede = document.getElementById('lede');
  const reason = q.get('reason');
  if (reason === 'paused') { lede.textContent = 'Access for your code has been paused. Contact the person who issued it.'; lede.classList.add('warn'); }
  else if (reason === 'unavailable') { lede.textContent = 'Your session could not be confirmed because the access service was unreachable for a day. Enter your code again.'; lede.classList.add('warn'); }
  else if (reason === 'lapsed') { lede.textContent = 'Your subscription has lapsed. Update your payment details in the billing portal and your code works again within a few minutes.'; lede.classList.add('warn'); }
  const next = q.get('next') || '';

  const code = document.getElementById('code');
  code.addEventListener('input', () => {
    /* Format as the person types: uppercase, alphanumerics only, a dash after five. */
    let v = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    code.value = v;
    code.removeAttribute('aria-invalid');
  });

  async function submit(form, payload, msgEl, btn) {
    msgEl.className = 'msg'; msgEl.textContent = 'Checking…'; btn.disabled = true;
    try {
      const r = await fetch('/api/enter', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ ...payload, next }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        /* The terminal's model routes (the Model view, the Council, Map pre-fill, World search) ask
           the worker with the profile's access code. A profile made before the invite gate has
           none, so the code that just opened the door is kept for it, on this origin only, the
           same place the terminal already keeps a profile's own code. */
        try { if (payload.code) localStorage.setItem('pf_door_code', payload.code); } catch (e) {}
        msgEl.className = 'msg ok'; msgEl.textContent = 'Opening…'; location.href = j.next || '/terminal/'; return;
      }
      msgEl.className = 'msg err'; msgEl.textContent = j.error || 'That did not work. Try again.';
      const field = form.querySelector('input'); field.setAttribute('aria-invalid', 'true'); field.focus();
    } catch {
      msgEl.className = 'msg err'; msgEl.textContent = 'No connection. Check your network and try again.';
    } finally { btn.disabled = false; }
  }

  const f = document.getElementById('f');
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    const v = code.value.trim();
    if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(v)) {
      const m = document.getElementById('msg'); m.className = 'msg err'; m.textContent = 'A code looks like XXXXX-XXXXX.';
      code.setAttribute('aria-invalid', 'true'); code.focus(); return;
    }
    submit(f, { code: v }, document.getElementById('msg'), document.getElementById('go'));
  });

  const op = document.getElementById('op');
  document.getElementById('opToggle').addEventListener('click', () => { op.hidden = !op.hidden; if (!op.hidden) document.getElementById('secret').focus(); });
  op.addEventListener('submit', ev => {
    ev.preventDefault();
    const s = document.getElementById('secret').value;
    if (!s) return;
    submit(op, { secret: s }, document.getElementById('opMsg'), op.querySelector('button[type=submit]'));
  });
})();
