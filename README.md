# tofu

A tiny risograph-style PWA for counting the blocks of tofu you eat.

- **today**: one big button for a whole block, two small ones for ½ and ¼, and today's count. Each tap shows an *undo* for 5 seconds.
- **the past**: all-time / week / month totals, average per day, streaks, weekly or monthly bars (tap a bar for its value), a diary where you can change or delete entries or add a forgotten day, the weight of one block (used for the kg estimate), and backup export/import as JSON.

Plain HTML/CSS/JS, no build step, no dependencies. Data is stored in `localStorage` on the device only.
Font: [Fraunces](https://github.com/undercasetype/Fraunces) (SIL OFL, bundled in `public/fonts`).

## Deploy on Netlify

1. In Netlify: *Add new site → Import an existing project →* pick this repo.
2. Leave the build command empty. The publish directory (`public`) comes from `netlify.toml`.
3. Deploy.

(Or drag the `public/` folder onto app.netlify.com/drop.)

## Install on the iPhone

Open the site in **Safari** → Share → **Add to Home Screen**. Open it once while online; after that it works offline.

## Develop

```sh
cd public && python3 -m http.server 8000
```

When you change the list of files in `public/`, update `ASSETS` and bump `VERSION` in `public/sw.js`.
Changes to existing files are picked up automatically on the next launch after the one that downloads them (stale-while-revalidate).
