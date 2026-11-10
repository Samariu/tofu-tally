# tofu tally

A tiny risograph-style PWA for counting the blocks of tofu you eat.

- **today**: one big button for a whole block, two small ones for ½ and ¼, and today's count. Each tap shows an *undo* for 5 seconds.
- **the past**: all-time / week / month totals, average per day, streaks, weekly or monthly bars (tap a bar for its value), a diary where you can change or delete entries or add a forgotten day, the weight of one block (used for the kg estimate), and backup export/import as JSON.

Plain HTML/CSS/JS, no build step, no dependencies. Data is stored in `localStorage` on the device only.
Font: [Fraunces](https://github.com/undercasetype/Fraunces) (SIL OFL, bundled in `public/fonts`).

## Deploy (GitHub Pages)

Every push to `main` publishes `public/` via `.github/workflows/pages.yml`.

One-time setup: the repo must be public (or on a paid plan), and under
*Settings → Pages → Build and deployment → Source* choose **GitHub Actions**.
The site then lives at `https://<user>.github.io/tofu-tally/`.

All paths in the app are relative, so it works under that subpath.

## Install on the iPhone

Open the site in **Safari** → Share → **Add to Home Screen**. Open it once while online; after that it works offline.

## Develop

```sh
cd public && python3 -m http.server 8000
```

When you change the list of files in `public/`, update `ASSETS` and bump `VERSION` in `public/sw.js`.
Changes to existing files are picked up automatically on the next launch after the one that downloads them (stale-while-revalidate).
