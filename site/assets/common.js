// Helpers shared by the training page (app.js) and the portal (portal.js).
(() => {
  'use strict';

  const store = {
    get(key) {
      try { return localStorage.getItem('gtl:' + key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem('gtl:' + key, value); } catch (e) { /* private mode: ignore */ }
    },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.text();
  }

  // Language priority: ?lang= in the URL, then the viewer's last choice, then the default.
  function pickLang(available, fallback) {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (available.includes(fromUrl)) return fromUrl;
    const saved = store.get('lang');
    if (available.includes(saved)) return saved;
    return available.includes(fallback) ? fallback : available[0];
  }

  function rememberLang(lang) {
    store.set('lang', lang);
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(history.state, '', url);
    document.documentElement.lang = lang;
  }

  // Fills [data-i18n], [data-i18n-label] and [data-i18n-title] from a dictionary.
  function translate(dict, root = document) {
    $$('[data-i18n]', root).forEach((el) => { el.textContent = dict[el.dataset.i18n] ?? ''; });
    $$('[data-i18n-label]', root).forEach((el) => {
      const text = dict[el.dataset.i18nLabel] ?? '';
      el.setAttribute('aria-label', text);
      el.title = text;
    });
    $$('[data-i18n-title]', root).forEach((el) => { el.title = dict[el.dataset.i18nTitle] ?? ''; });
  }

  function bindLangSwitch(current, onChange) {
    $$('#lang-switch [data-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === current));
      btn.onclick = () => onChange(btn.dataset.lang);
    });
  }

  function initTheme() {
    const btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const root = document.documentElement;
      const dark = root.dataset.theme
        ? root.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      store.set('theme', root.dataset.theme);
    });
  }

  function formatDate(iso, lang) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  window.GTL = { store, $, $$, esc, fetchJSON, fetchText, pickLang, rememberLang, translate, bindLangSwitch, initTheme, formatDate };
})();
