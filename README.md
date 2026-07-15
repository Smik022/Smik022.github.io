# asifahmed.me

Personal portfolio. Static HTML/CSS/JS — no framework, no npm, no dependencies.

## How it works

Content lives in JSON. HTML is generated from it.

```
data/profile.json     your identity, links, ethos, failures
data/projects.json    every project + its case study
scripts/build.js      the generator (plain Node, zero deps)
assets/css/site.css   one stylesheet — design tokens at the top
assets/js/site.js     theme toggle, email copy, dialogs
```

Generated — **do not hand-edit, your changes get overwritten**:

```
index.html
project/<slug>/index.html
```

## Adding or editing a project

1. Edit `data/projects.json`.
2. Run the build:

```bash
node scripts/build.js
```

3. Commit the generated files too — GitHub Pages serves them directly.

Any empty field is skipped, so a project with only a `summary` and a link still
renders cleanly. Fill in `situation` / `task` / `result` / `contributions` as you
write them and the sections appear on their own.

Set `"draft": true` on a project to show a "Draft" chip next to its title.
Remove the flag when the write-up is final.

### Field notes

`situation`, `task`, `result` and `contributions` each accept **either** a
string (renders as a paragraph) **or** an array of strings (renders as bullets).
Use whichever suits the project.

`tags` accepts plain strings or objects with a variant:

```json
"tags": [
  { "label": "Automation & AI" },
  { "label": "Scale", "variant": "solid" },
  { "label": "System Engineering", "variant": "outline" }
]
```

`keyResults` drives the highlighted card in the right rail:

```json
"keyResults": {
  "metric": "< 5 Minutes",
  "metricLabel": "Workflow Time Reduction",
  "metricNote": "Longer explanation under the number.",
  "items": [{ "name": "Question to Flashcard", "label": "End-to-End", "note": "…" }]
}
```

## How clicking a project works

Each project is a real page at `project/<slug>/`. On the home page a click is
intercepted: the page is fetched, its `.article-inner` block is lifted out and
shown in a modal, and the URL updates via `pushState` so the link stays
shareable. Back/forward, Escape and the close button all restore the home view.

The case-study markup is generated **once** and reused by both the standalone
page and the modal, so the two can't drift apart. If JavaScript is off or the
fetch fails, the link just navigates to the real page — nothing breaks.

## Previewing locally

```bash
python -m http.server 4321
# then open http://localhost:4321
```

Open `index.html` directly via `file://` if you prefer — everything works except
clipboard copy, which needs a secure context and falls back to a `mailto:` link.

## Theming

All colors are CSS custom properties at the top of `assets/css/site.css`:
`:root` holds the light theme, `[data-theme="dark"]` overrides for dark. Change a
value in those two blocks and it propagates everywhere. The visitor's choice is
stored in `localStorage`; with no stored choice the site follows the OS setting.
