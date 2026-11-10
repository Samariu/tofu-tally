# tofu tally

A small printed diary for the tofu you eat.

Tap the big block when you finish a whole one, or the small ones for a half or a quarter. That's it.
The look borrows from risograph prints: grainy paper, pink, blue and yellow inks, halftone dots.

**→ [samariu.github.io/tofu-tally](https://samariu.github.io/tofu-tally/)**

## What's inside

**today** shows the date, how much you've had today and three buttons: a whole block, ½ and ¼.
Every tap gives you a few seconds to undo it.

**the past** is where the numbers live:

- totals for all time, this week and this month, plus a rough weight in kilos
- your average per day and how many tofu days you've had
- your current streak and your longest one
- bars for the last 12 weeks or months (tap a bar to see its value)
- a diary of every entry, where you can change an amount, delete it or add a day you forgot
- the weight of one block, if yours isn't 200 g
- backup and restore

## Install on the iPhone

Open the link in **Safari** → Share → **Add to Home Screen**.
Open it once while you're online; after that it works without a connection.

## Updates

The app updates itself. A new version is downloaded quietly in the background and shows up the next time you open the app.

For changes to the code: when you add or remove a file in `public/`, update `ASSETS` and bump `VERSION` in `public/sw.js`. Changes to existing files are picked up without that.

## Your data

Everything stays on your phone. There's no account, no server and no tracking.
That also means no automatic backup. If you clear Safari's website data or delete the home-screen icon, your history can disappear.
Use **save a backup** in the past tab now and then; **load a backup** adds the entries back.

## Credits

Typeface: [Fraunces](https://github.com/undercasetype/Fraunces) by Undercase Type, under the SIL Open Font License (included in `public/fonts`).
Built with plain HTML, CSS and JavaScript, with no dependencies.
