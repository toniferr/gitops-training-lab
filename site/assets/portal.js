// Portal: lists every published training branch from trainings.json, which
// scripts/site/build-pages.sh generates. In a local preview (no trainings.json)
// it falls back to the training in the current working tree.
(() => {
  'use strict';

  const { $, esc, fetchJSON, pickLang, rememberLang, translate, bindLangSwitch, initTheme, formatDate } = window.GTL;

  const REPO = 'toniferr/gitops-training-lab';

  const UI = {
    es: {
      eyebrow: 'Formación interna', language: 'Idioma', theme: 'Cambiar tema',
      lead: 'Formaciones prácticas e incrementales de Kubernetes, Configuration as Code, GitOps y Flux. Cada formación es una rama de Git: una edición congelada y reproducible.',
      path: 'Ruta de aprendizaje', repo: 'Repositorio en GitHub', trainings: 'Formaciones',
      training: 'Formación', minutes: 'min', updated: 'Actualizada',
      empty: 'Todavía no hay formaciones publicadas.',
      preview: 'Vista previa de main (material en desarrollo)',
      pathDoc: 'docs/es/00-ruta-aprendizaje.md',
    },
    en: {
      eyebrow: 'Internal training', language: 'Language', theme: 'Toggle theme',
      lead: 'Hands-on, incremental trainings on Kubernetes, Configuration as Code, GitOps and Flux. Each training is a Git branch: a frozen, reproducible edition.',
      path: 'Learning path', repo: 'GitHub repository', trainings: 'Trainings',
      training: 'Training', minutes: 'min', updated: 'Updated',
      empty: 'No trainings have been published yet.',
      preview: 'Preview of main (material in progress)',
      pathDoc: 'docs/en/00-learning-path.md',
    },
  };

  let data = null;

  async function load() {
    try {
      return { ...(await fetchJSON('trainings.json')), local: false };
    } catch (e) {
      const training = await fetchJSON('content/training.json');
      return { local: true, trainings: [{ path: './index.html', build: null, training }] };
    }
  }

  function render(lang) {
    const ui = UI[lang];
    rememberLang(lang);
    translate(ui);
    bindLangSwitch(lang, render);

    $('#repo-link').href = `https://github.com/${REPO}`;
    $('#path-link').href = `https://github.com/${REPO}/blob/main/${ui.pathDoc}`;

    const cards = [...data.trainings]
      .sort((a, b) => String(a.training.number).localeCompare(String(b.training.number), undefined, { numeric: true }))
      .map(({ path, build, training: t }) => {
        const text = (obj) => obj?.[lang] ?? obj?.[t.defaultLang] ?? '';
        const href = path.endsWith('.html') ? path : `${path}?lang=${lang}`;
        return `
          <a class="training-card" href="${esc(href)}">
            <span class="num">${esc(ui.training)} ${esc(t.number)}</span>
            <h3>${esc(text(t.title))}</h3>
            <p>${esc(text(t.summary))}</p>
            <footer>
              <span>${esc(t.duration)} ${esc(ui.minutes)}</span>
              <code>${esc(build?.branch ?? `training/${t.slug}`)}</code>
              ${build?.date ? `<span>${esc(ui.updated)} ${esc(formatDate(build.date, lang))}</span>` : ''}
            </footer>
          </a>`;
      });
    $('#trainings').innerHTML = cards.join('') || `<p class="empty">${esc(ui.empty)}</p>`;

    $('#footer').innerHTML = data.local
      ? ''
      : `<a href="main/?lang=${lang}">${esc(ui.preview)}</a>`;
  }

  async function init() {
    initTheme();
    data = await load().catch((err) => {
      console.error(err);
      return { trainings: [], local: true };
    });
    render(pickLang(Object.keys(UI), 'es'));
  }

  init();
})();
