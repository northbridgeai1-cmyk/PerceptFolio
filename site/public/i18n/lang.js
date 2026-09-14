/* Language switch, English and Spanish.

   One dictionary (es.js), keyed by the exact English string, and a translator that walks text
   nodes and swaps exact matches. Nothing is tagged in markup and nothing untranslated breaks: a
   string not in the dictionary stays English. The choice persists in localStorage (pf_lang) and
   sets <html lang>. Views that re-render (the terminal's tabs) are re-translated by a debounced
   MutationObserver, so a translated screen stays translated after the app redraws it.

   Attributes translated: placeholder, title, aria-label, data-tip (the terminal's tooltips). */
(function () {
  const KEY = 'pf_lang';
  const dict = () => (window.PF_ES || {});
  const get = () => { try { return localStorage.getItem(KEY) === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; } };
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const originals = new WeakMap();   // node -> its English text, so switching back is exact

  function translateNode(n, lang) {
    const d = dict();
    if (n.nodeType === 3) {
      const en = originals.has(n) ? originals.get(n) : n.nodeValue;
      const key = norm(en);
      if (!key) return;
      if (lang === 'es') {
        const es = d[key];
        if (es) { if (!originals.has(n)) originals.set(n, n.nodeValue); n.nodeValue = en.replace(key, es); return; }
        /* Prefix rules for strings that carry a name or a number after a fixed phrase. */
        for (const [rx, rep] of (window.PF_ES_RX || [])) { if (rx.test(key)) { if (!originals.has(n)) originals.set(n, n.nodeValue); n.nodeValue = en.replace(rx, rep); return; } }
      }
      else if (originals.has(n)) { n.nodeValue = originals.get(n); }
      return;
    }
    if (n.nodeType !== 1 || /^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/.test(n.tagName)) return;
    for (const a of ['placeholder', 'title', 'aria-label', 'data-tip']) {
      if (!n.hasAttribute(a)) continue;
      const k = 'attr:' + a;
      const en = (n.__pfOrig && n.__pfOrig[k] != null) ? n.__pfOrig[k] : n.getAttribute(a);
      if (lang === 'es') { const es = d[norm(en)]; if (es) { n.__pfOrig = n.__pfOrig || {}; if (n.__pfOrig[k] == null) n.__pfOrig[k] = en; n.setAttribute(a, es); } }
      else if (n.__pfOrig && n.__pfOrig[k] != null) n.setAttribute(a, n.__pfOrig[k]);
    }
    for (const c of n.childNodes) translateNode(c, lang);
  }

  let busy = false;
  function apply(lang) {
    busy = true;
    document.documentElement.lang = lang;
    translateNode(document.body, lang);
    document.querySelectorAll('[data-lang-toggle]').forEach(b => { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-toggle') === lang)); });
    busy = false;
  }
  function set(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply(lang);
    /* Same-origin frames (the dashboard snapshot on the landing page) follow the choice. */
    document.querySelectorAll('iframe').forEach(f => { try { if (f.contentWindow && f.contentWindow.PF_LANG) f.contentWindow.PF_LANG.set(lang); } catch (e) {} });
  }

  window.PF_LANG = { get, set, apply: () => apply(get()) };

  document.addEventListener('DOMContentLoaded', () => {
    apply(get());
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lang-toggle]'); if (b) { e.preventDefault(); set(b.getAttribute('data-lang-toggle')); } });
    /* Re-translate after the app redraws a view. Debounced; skipped while we are the ones writing. */
    let t = null;
    new MutationObserver(() => { if (busy || get() !== 'es') return; clearTimeout(t); t = setTimeout(() => apply('es'), 80); })
      .observe(document.body, { childList: true, subtree: true, characterData: false });
  });
})();
