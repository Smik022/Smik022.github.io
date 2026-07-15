# Project logos

Drop a file named after the project's slug and the build picks it up — no JSON
edit needed. Slugs are the `slug` field in `data/projects.json`:

    merlin.svg
    zerotouch-onboarding.svg
    narawe.svg
    siratul-mustakim.svg
    mofiz-marma.svg
    repo-map.svg
    git-insight.svg
    socratic-ai.svg
    otsukare.svg
    fabric-qr-web-app.svg

Then run `node scripts/build.js`.

Accepted: `.svg`, `.png`, `.webp`, `.jpg` — first match in that order wins.
To point at a different path, set `"logo"` on the project instead; it overrides
the filename lookup.

## What works best

- **SVG** if you have it — it stays sharp at any size.
- **Square-ish**, roughly 128×128 or larger. Rendered at 26px in the list and
  28px in the case-study header.
- **Transparent background**, and legible on a *dark* background — the dark
  theme is the one with the aurora behind it. Logos sit on a faint light plate
  (`--logo-plate`), so mid-tone marks are fine; pure black ones may not read.
  If your logos are dark-on-white, tell me and I'll switch the plate to solid
  white instead.

A project with no file here still renders correctly — its row keeps the same
alignment as the others and just leaves the logo space empty.
