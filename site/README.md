# Training website

`site/` is the website used to **deliver** the training on this branch, instead of a slide deck. It is plain HTML, CSS and JavaScript: no Node, no build step, no dependencies to install. The session content lives in Markdown.

GitHub Pages publishes one site for the whole repository, with one path per training branch:

```text
https://<owner>.github.io/gitops-training-lab/                           portal listing every training
https://<owner>.github.io/gitops-training-lab/01-gitops-flux-foundations/ site/ of training/01-gitops-flux-foundations
https://<owner>.github.io/gitops-training-lab/main/                        site/ of main (material in progress)
```

Because each training branch is a frozen edition, its website is frozen with it: improving the engine on `main` never changes an already published training.

## Files

| Path | Purpose |
| --- | --- |
| `content/training.json` | Number, slug, titles, summary, duration and links of this training. |
| `content/es.md`, `content/en.md` | The session content, one file per language. A missing language falls back to `defaultLang`. |
| `index.html`, `assets/app.js` | Training page: renders the Markdown, table of contents, presentation and instructor modes. |
| `portal.html`, `assets/portal.js` | Portal page, published at the site root from `main` only. |
| `assets/common.js`, `assets/style.css` | Shared by both pages. |

## Writing content

Standard GitHub Markdown, plus a few conventions:

| Syntax | Result |
| --- | --- |
| `## Title {Theory · 5–12 min}` | A section: one screen in presentation mode. The text in braces is the small label above the title and in the table of contents. |
| `<!-- instructor -->` anywhere in a section | The whole section is shown only in instructor mode (preparation steps, answers). |
| `> [!NOTES]` | Speaker notes, shown only in instructor mode. |
| `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]` | Callouts, always visible. |
| `> [!DOCS]` followed by a `> - [text](url)` list | "Further reading" links at the foot of the section: the lab's reference docs (`repo:` links) and official documentation, for anyone who wants to go deeper. Put it last in the section. |
| ` ```flow ` | Boxes joined by arrows. One `Title \| text` per line. |
| ` ```cards ` / ` ```steps ` | A card grid; `steps` numbers the cards. One `Title \| text` per line; both parts accept inline Markdown. |
| `[text](repo:docs/es/…)` | Link to that file on GitHub, **on the branch being viewed**. Use it for every link into this repository. |

Keep it to what is shown during the session. Step-by-step detail belongs in the learner guide and the `docs/*/reference/` deep dives, which the page links to.

## Viewing and presenting

- **Presentar / Present** (or `P`): one section per screen. `←` `→`, `Space`, `PageUp`/`PageDown` (presentation clickers) navigate; `F` fullscreen; `Esc` exits.
- **Modo formador / Instructor mode** (or `N`): reveals notes, instructor-only sections and, while presenting, a timer against `minutes` in `training.json` (`T` resets it). Keep it off when sharing your screen with notes you don't want shown.
- `?present` in the URL opens straight into presentation mode; `?lang=en` picks the language.

## Local preview

The page loads its Markdown with `fetch`, so it needs an HTTP server (opening `index.html` as a file does not work):

```bash
python3 -m http.server 8000 -d site
# http://localhost:8000/             this branch's training
# http://localhost:8000/portal.html  portal (shows only this training locally)
```

To preview the full published site, built from the pushed branches:

```bash
git fetch origin
sh scripts/site/build-pages.sh
python3 -m http.server 8000 -d _site
```

## Publishing

`.github/workflows/pages.yml` runs on every push to `main` or `training/**`, and rebuilds the whole site from all branches with `scripts/site/build-pages.sh`. Branches without `site/content/training.json` are skipped.

One-time repository setup (GitHub Pages is free for public repositories):

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Environments → `github-pages` → Deployment branches and tags:** add a rule for `training/*` next to `main`. Without it, pushes to a training branch fail at the deploy step with *"Branch … is not allowed to deploy to github-pages due to environment protection rules"*.
3. Run the workflow once from **Actions → Pages → Run workflow**, or push to `main`.

## Starting the website for a new training

When creating `training/NN-slug` from `main`:

1. Update `content/training.json`: `number`, `slug` (must match the branch name after `training/`), titles, summary, duration and links.
2. Rewrite `content/es.md` and `content/en.md` for the new session.
3. Preview locally, push the branch, and it appears in the portal on the next deploy.
