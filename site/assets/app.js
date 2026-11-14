// Training page: renders site/content/<lang>.md as sections, with a table of
// contents and a presentation mode. Authoring conventions
// are documented in site/README.md.
(() => {
  'use strict';

  const { $, $$, esc, fetchJSON, fetchText, pickLang, rememberLang, translate, bindLangSwitch, initTheme, formatDate } = window.GTL;

  const UI = {
    es: {
      toc: 'Índice', contents: 'Contenido', language: 'Idioma', theme: 'Cambiar tema',
      present: 'Presentar', exit: 'Salir',
      prev: 'Anterior', next: 'Siguiente', copy: 'Copiar', copied: 'Copiado',
      training: 'Formación', minutes: 'min', branch: 'Rama', start: 'Inicio',
      allTrainings: 'Todas las formaciones', learner: 'Guía del alumno',
      source: 'Material en GitHub', edit: 'Editar esta página',
      keys: '← → navegar · F pantalla completa · Esc salir',
      fallback: 'Esta formación todavía no está traducida a este idioma; se muestra la versión original.',
      error: 'No se ha podido cargar el contenido de la formación.',
      callout: { note: 'Nota', tip: 'Consejo', warning: 'Atención', important: 'Importante', caution: 'Cuidado', docs: 'Para saber más' },
    },
    en: {
      toc: 'Contents', contents: 'Contents', language: 'Language', theme: 'Toggle theme',
      present: 'Present', exit: 'Exit',
      prev: 'Previous', next: 'Next', copy: 'Copy', copied: 'Copied',
      training: 'Training', minutes: 'min', branch: 'Branch', start: 'Start',
      allTrainings: 'All trainings', learner: 'Learner guide',
      source: 'Material on GitHub', edit: 'Edit this page',
      keys: '← → navigate · F fullscreen · Esc exit',
      fallback: 'This training is not translated into this language yet; showing the original version.',
      error: 'The training content could not be loaded.',
      callout: { note: 'Note', tip: 'Tip', warning: 'Warning', important: 'Important', caution: 'Caution', docs: 'Further reading' },
    },
  };

  const CUSTOM_BLOCKS = new Set(['flow', 'cards', 'steps', 'row', 'compare']);

  const state = {
    meta: null,
    build: null,
    branch: 'main',
    lang: 'es',
    ui: UI.es,
    presenting: false,
    current: null,      // the section element being read or presented
    idleId: null,
    observer: null,
    mdCache: {},
    slidesCache: [],
  };

  const main = $('#content');
  const toc = $('#toc');

  // ---------- Markdown → sections ----------

  // Splits on "## " headings that are not inside a fenced code block.
  function splitSections(md) {
    const intro = [];
    const sections = [];
    let fence = null;
    let current = null;
    for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
      const f = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
      if (f) {
        if (!fence) fence = f[1];
        else if (f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null;
      } else if (!fence && line.startsWith('## ')) {
        current = { heading: line.slice(3).trim(), lines: [] };
        sections.push(current);
        continue;
      }
      (current ? current.lines : intro).push(line);
    }
    // A leading "# Title" keeps the file readable on GitHub; the page takes its title from training.json.
    const introMd = intro.join('\n').replace(/^\s*# .*\n/, '');
    return { intro: introMd, sections: sections.map((s) => ({ heading: s.heading, body: s.lines.join('\n') })) };
  }

  function slugify(text, used) {
    const base = text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/<[^>]+>|`/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return slug;
  }

  const inline = (md) => window.marked.parseInline(md);

  function renderHero(introMd, missingLang) {
    const { meta, ui, lang } = state;
    const link = (key) => {
      const path = meta.links?.[key]?.[lang] ?? meta.links?.[key]?.[meta.defaultLang];
      return path ? `<a class="btn btn-ghost" href="repo:${esc(path)}">${esc(ui[key])}</a>` : '';
    };
    const el = document.createElement('section');
    el.className = 'slide hero';
    el.id = 'top';
    el.dataset.toc = ui.start;
    el.innerHTML = `
      ${missingLang ? `<aside class="callout callout-warning"><p>${esc(ui.fallback)}</p></aside>` : ''}
      <p class="eyebrow">${esc(ui.training)} ${esc(meta.number)} · ${esc(meta.duration)} ${esc(ui.minutes)}</p>
      <h1>${esc(localized(meta.title))}</h1>
      <p class="lead">${esc(localized(meta.summary))}</p>
      ${window.marked.parse(introMd)}
      <ul class="meta">
        <li class="chip">${esc(ui.branch)} <code>${esc(state.branch)}</code></li>
      </ul>
      <div class="hero-links">
        ${link('learner')}
        <a class="btn btn-ghost" href="https://github.com/${esc(meta.repo)}/tree/${esc(state.branch)}">${esc(ui.source)}</a>
      </div>`;
    return el;
  }

  function renderSection(section, used) {
    const m = section.heading.match(/^(.*?)\s*\{([^}]*)\}\s*$/);
    const title = m ? m[1] : section.heading;
    const eyebrow = m ? m[2].trim() : '';
    const el = document.createElement('section');
    el.className = 'slide';
    el.id = slugify(title, used);
    el.dataset.toc = title;
    el.dataset.eyebrow = eyebrow;
    el.innerHTML = `
      ${eyebrow ? `<p class="eyebrow">${inline(eyebrow)}</p>` : ''}
      <h2>${inline(title)}</h2>
      ${window.marked.parse(section.body)}`;
    return el;
  }

  // ---------- Enhancements on rendered HTML ----------

  function enhance(root) {
    $$('pre > code', root).forEach((code) => {
      const pre = code.parentElement;
      const info = (code.className.match(/language-(\S+)/) || [])[1] || '';
      if (CUSTOM_BLOCKS.has(info)) pre.replaceWith(customBlock(info, code.textContent));
      else decorateCode(pre, code, info);
    });

    $$('blockquote', root).forEach((bq) => {
      const first = bq.firstElementChild;
      const m = first?.textContent.match(/^\s*\[!(\w+)\]/);
      if (!m) return;
      const type = m[1].toLowerCase();
      first.innerHTML = first.innerHTML.replace(/^\s*\[!\w+\]\s*/, '');
      if (!first.textContent.trim() && !first.querySelector('img')) first.remove();
      const aside = document.createElement('aside');
      aside.className = `callout callout-${type}`;
      aside.innerHTML = `<span class="callout-label">${esc(state.ui.callout[type] ?? type)}</span>${bq.innerHTML}`;
      bq.replaceWith(aside);
    });

    $$('table', root).forEach((table) => {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.replaceWith(wrap);
      wrap.append(table);
    });

    $$('a[href]', root).forEach((a) => {
      const href = a.getAttribute('href');
      if (href.startsWith('repo:')) {
        a.href = `https://github.com/${state.meta.repo}/blob/${state.branch}/${href.slice(5)}`;
      }
      if (a.host && a.host !== location.host) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
    });
  }

  // SVG images are inlined so their classes pick up the page theme (light/dark).
  // The file's own <style> only serves standalone viewing (e.g. on GitHub) and is dropped.
  const svgCache = {};

  async function inlineDiagrams(root) {
    await Promise.all($$('img[src$=".svg"]', root).map(async (img) => {
      const src = img.getAttribute('src');
      svgCache[src] ??= fetchText(src).catch(() => null);
      const text = await svgCache[src];
      // Drop <style> before parsing: the CSP forbids inline styles, even in a parsed document.
      const clean = text && text.replace(/<style[\s\S]*?<\/style>/g, '');
      const svg = clean && new DOMParser().parseFromString(clean, 'image/svg+xml').documentElement;
      if (!svg || svg.nodeName !== 'svg') return; // keep the plain <img> as a fallback
      svg.querySelectorAll('style, script').forEach((n) => n.remove());
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', img.alt);
      const figure = document.createElement('figure');
      figure.className = 'diagram';
      const scroll = document.createElement('div');
      scroll.className = 'diagram-scroll';
      scroll.append(document.importNode(svg, true));
      figure.append(scroll);
      if (img.title) {
        const caption = document.createElement('figcaption');
        caption.textContent = img.title;
        figure.append(caption);
      }
      const p = img.parentElement;
      (p.tagName === 'P' && p.childNodes.length === 1 ? p : img).replaceWith(figure);
    }));
  }

  // ```flow / ```cards / ```steps / ```row: one "Title | text" item per line.
  // ```compare: two "Title | point | point…" lines, what is left out and what is in.
  function customBlock(kind, text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split(' | ').map((p) => p.trim()));
    if (kind === 'compare') {
      const div = document.createElement('div');
      div.className = 'compare';
      div.innerHTML = lines.map(([title, ...points], i) => `
        <div class="card ${i ? 'is-in' : 'is-out'}"><h3>${inline(title)}</h3>
          <ul>${points.map((p) => `<li>${inline(p)}</li>`).join('')}</ul></div>`).join('');
      return div;
    }
    const items = lines.map(([title, ...rest]) => ({ title, text: rest.join(' | ') }));
    if (kind === 'flow') {
      const ol = document.createElement('ol');
      ol.className = 'flow';
      ol.innerHTML = items.map((i) => `<li><strong>${inline(i.title)}</strong><span>${inline(i.text)}</span></li>`).join('');
      return ol;
    }
    const div = document.createElement('div');
    div.className = { steps: 'cards numbered', row: 'cards row' }[kind] ?? 'cards';
    div.innerHTML = items.map((i) => `<div class="card"><h3>${inline(i.title)}</h3>${i.text ? `<p>${inline(i.text)}</p>` : ''}</div>`).join('');
    return div;
  }

  function decorateCode(pre, code, lang) {
    const wrap = document.createElement('div');
    wrap.className = 'code';
    pre.replaceWith(wrap);
    wrap.append(pre);
    if (lang && lang !== 'text' && window.hljs?.getLanguage(lang)) {
      window.hljs.highlightElement(code);
      wrap.insertAdjacentHTML('afterbegin', `<span class="lang">${esc(lang)}</span>`);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy';
    btn.textContent = state.ui.copy;
    btn.addEventListener('click', async () => {
      await copyText(code.textContent.replace(/\n$/, ''));
      btn.textContent = state.ui.copied;
      btn.classList.add('done');
      setTimeout(() => { btn.textContent = state.ui.copy; btn.classList.remove('done'); }, 1500);
    });
    wrap.append(btn);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  // ---------- Page rendering ----------

  const localized = (obj) => (obj ? obj[state.lang] ?? obj[state.meta.defaultLang] ?? '' : '');

  async function loadMarkdown(lang) {
    if (!(lang in state.mdCache)) {
      state.mdCache[lang] = await fetchText(`content/${lang}.md`).catch(() => null);
    }
    return state.mdCache[lang];
  }

  async function render(lang) {
    const previous = state.current?.id;
    state.lang = lang;
    state.ui = UI[lang] ?? UI.en;
    rememberLang(lang);
    translate(state.ui);
    bindLangSwitch(lang, (l) => { if (l !== state.lang) render(l); });

    let md = await loadMarkdown(lang);
    const missingLang = md === null;
    if (missingLang) md = await loadMarkdown(state.meta.defaultLang);
    if (md === null) throw new Error(`content/${lang}.md`);

    const { intro, sections } = splitSections(md);
    const used = new Set(['top']);
    const els = [renderHero(intro, missingLang), ...sections.map((s) => renderSection(s, used))];

    main.replaceChildren(...els, renderFooter());
    enhance(main);
    inlineDiagrams(main).then(fitSlide);

    const title = localized(state.meta.title);
    document.title = `${state.meta.number} · ${title} — GitOps Training Lab`;
    $('#crumb').textContent = `${state.meta.number} · ${title}`;

    renderToc();
    observeSections();

    // Keep the reader's place across a language switch (section ids differ per language).
    const index = previous ? state.slidesCache.findIndex((s) => s.id === previous) : -1;
    state.slidesCache = slides();
    const target = index >= 0 ? state.slidesCache[index] : document.getElementById(decodeURIComponent(location.hash.slice(1)));
    state.current = target ?? state.slidesCache[0];
    if (state.presenting) go(state.current);
    else if (target && target.id !== 'top') target.scrollIntoView();
  }

  function renderFooter() {
    const { build, ui, meta, lang } = state;
    const footer = document.createElement('footer');
    footer.className = 'page-footer';
    const parts = [`${esc(ui.branch)} <code>${esc(state.branch)}</code>`];
    if (build?.commit) parts.push(`commit <code>${esc(build.commit)}</code>`);
    if (build?.date) parts.push(esc(formatDate(build.date, lang)));
    parts.push(`<a href="https://github.com/${esc(meta.repo)}/edit/${esc(state.branch)}/site/content/${esc(lang)}.md" target="_blank" rel="noopener">${esc(ui.edit)}</a>`);
    footer.innerHTML = parts.join(' · ');
    return footer;
  }

  function renderToc() {
    const items = slides().map((s) => `
      <li><a href="#${s.id}" data-target="${s.id}">${inline(s.dataset.toc)}${s.dataset.eyebrow ? `<small>${inline(s.dataset.eyebrow)}</small>` : ''}</a></li>`).join('');
    toc.innerHTML = `<h2>${esc(state.ui.contents)}</h2><ol>${items}</ol>`;
    $$('a', toc).forEach((a) => a.addEventListener('click', (e) => {
      setTocOpen(false);
      if (!state.presenting) return;
      e.preventDefault();
      go(document.getElementById(a.dataset.target));
    }));
  }

  function markToc(section) {
    $$('a', toc).forEach((a) => a.setAttribute('aria-current', String(a.dataset.target === section.id)));
  }

  // Scroll spy for document mode: the section crossing the upper third of the viewport is current.
  function observeSections() {
    state.observer?.disconnect();
    state.observer = new IntersectionObserver((entries) => {
      if (state.presenting) return;
      const hit = entries.filter((e) => e.isIntersecting).pop();
      if (!hit) return;
      state.current = hit.target;
      markToc(hit.target);
    }, { rootMargin: '-25% 0px -65% 0px' });
    slides().forEach((s) => state.observer.observe(s));
  }

  const slides = () => $$('.slide', main);

  // ---------- Presentation mode ----------

  function go(target) {
    const list = slides();
    const el = list.includes(target) ? target : list[0];
    state.current = el;
    slides().forEach((s) => s.classList.toggle('current', s === el));
    const i = list.indexOf(el);
    $('#counter').textContent = `${i + 1} / ${list.length}`;
    $('#progress').style.width = `${((i + 1) / list.length) * 100}%`;
    fitSlide();
    el.scrollTop = 0;
    markToc(el);
    history.replaceState(history.state, '', `#${el.id}`);
  }

  // Scales the current slide down just enough to fit the screen, so it never needs a scrollbar.
  // Below MIN_FIT the text would be too small to read: the slide scrolls instead.
  const MIN_FIT = 0.55;

  function fitSlide() {
    const el = state.current;
    if (!state.presenting || !el) return;
    const fits = (scale) => {
      el.style.setProperty('--fit', scale.toFixed(3));
      return el.scrollHeight <= el.clientHeight;
    };
    document.body.classList.add('fitting');
    if (!fits(1)) {
      let low = MIN_FIT;
      let high = 1;
      for (let i = 0; i < 7; i++) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle;
        else high = middle;
      }
      fits(low);
    }
    document.body.classList.remove('fitting');
  }

  function step(delta) {
    const list = slides();
    const i = Math.max(0, Math.min(list.length - 1, list.indexOf(state.current) + delta));
    go(list[i]);
  }

  function setPresenting(on) {
    state.presenting = on;
    document.body.classList.toggle('presenting', on);
    if (on) {
      setTocOpen(false);
      go(state.current ?? slides()[0]);
      wake();
    } else {
      clearTimeout(state.idleId);
      document.body.classList.remove('idle');
      slides().forEach((s) => s.classList.remove('current'));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      state.current?.scrollIntoView();
    }
  }

  // Hide the control bar and cursor after a few seconds without movement.
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(state.idleId);
    if (state.presenting) state.idleId = setTimeout(() => document.body.classList.add('idle'), 2500);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function setTocOpen(open) {
    document.body.classList.toggle('toc-open', open);
    $('#toc-toggle').setAttribute('aria-expanded', String(open));
    $('#toc-scrim').hidden = !open;
  }

  function bindControls() {
    $('#present').addEventListener('click', () => setPresenting(true));
    $('#exit').addEventListener('click', () => setPresenting(false));
    $('#prev').addEventListener('click', () => step(-1));
    $('#next').addEventListener('click', () => step(1));
    $('#toc-toggle').addEventListener('click', () => setTocOpen(!document.body.classList.contains('toc-open')));
    $('#toc-scrim').addEventListener('click', () => setTocOpen(false));
    initTheme();

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!state.presenting) {
        if (key === 'p') setPresenting(true);
        if (key === 'Escape') setTocOpen(false);
        return;
      }
      const actions = {
        ArrowRight: () => step(1), PageDown: () => step(1), ' ': () => step(e.shiftKey ? -1 : 1),
        ArrowLeft: () => step(-1), PageUp: () => step(-1),
        Home: () => go(slides()[0]), End: () => go(slides().at(-1)),
        Escape: () => setPresenting(false), f: toggleFullscreen,
      };
      if (actions[key]) {
        e.preventDefault();
        actions[key]();
        wake();
      }
    });

    document.addEventListener('mousemove', wake, { passive: true });

    // Entering or leaving fullscreen also fires resize. Web fonts change text size when they arrive.
    window.addEventListener('resize', fitSlide, { passive: true });
    document.fonts?.addEventListener('loadingdone', fitSlide);

    // Horizontal swipe changes slide on touch screens.
    let touch = null;
    document.addEventListener('touchstart', (e) => { touch = e.touches[0]; }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!state.presenting || !touch) return;
      const dx = e.changedTouches[0].clientX - touch.clientX;
      const dy = e.changedTouches[0].clientY - touch.clientY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
      touch = null;
    }, { passive: true });
  }

  // ---------- Start ----------

  async function init() {
    bindControls();
    try {
      if (!window.marked) throw new Error('marked.js did not load (CDN blocked?)');
      // Relative image paths in the Markdown are relative to content/, like the Markdown file itself.
      window.marked.use({
        walkTokens(token) {
          if (token.type === 'image' && !/^([a-z]+:|\/|#)/i.test(token.href)) token.href = `content/${token.href}`;
        },
      });
      state.meta = await fetchJSON('content/training.json');
      // build.json is written by scripts/site/build-pages.sh; absent in a local preview.
      state.build = await fetchJSON('build.json').catch(() => null);
      state.branch = state.build?.branch ?? `training/${state.meta.slug}`;
      const langs = state.meta.languages ?? [state.meta.defaultLang];
      await render(pickLang(langs, state.meta.defaultLang));
      // ?present opens the page straight into presentation mode (handy as a bookmark).
      if (new URLSearchParams(location.search).has('present')) setPresenting(true);
    } catch (err) {
      console.error(err);
      main.innerHTML = `<p class="error">${esc((UI[document.documentElement.lang] ?? UI.es).error)}<br><code>${esc(err.message)}</code></p>`;
    }
  }

  init();
})();
