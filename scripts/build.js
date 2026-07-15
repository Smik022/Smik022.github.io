#!/usr/bin/env node
/**
 * Static site generator — no dependencies.
 *
 *   node scripts/build.js
 *
 * Reads data/profile.json + data/projects.json and writes:
 *   index.html
 *   project/<slug>/index.html
 *
 * The markup inside .article-inner is shared: the standalone project page wraps
 * it in a page shell, and the home page's modal fetches a project page and
 * lifts that same block out of it. One source of truth for the case-study HTML.
 *
 * Empty fields are skipped, so half-written case studies still render cleanly.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const profile = read("data/profile.json");
const projects = read("data/projects.json");

/* ---------- helpers ---------- */

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const has = (v) =>
  Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : Boolean(v);

const join = (parts) => parts.filter(Boolean).join("\n");

/** Prose fields accept a string (one paragraph) or an array (bullet list). */
function prose(value) {
  if (!has(value)) return "";
  if (Array.isArray(value)) {
    return `      <ul>\n${value.map((i) => `        <li>${esc(i)}</li>`).join("\n")}\n      </ul>`;
  }
  return `      <p>${esc(value)}</p>`;
}

/** Tags accept "Label" or { label, variant: "solid" | "outline" }. */
const normalizeTag = (t) => (typeof t === "string" ? { label: t } : t);

/**
 * Find a project's logo. Drop a file named after the slug into
 * assets/images/logos/ (merlin.svg, narawe.png …) and it is picked up — no
 * JSON edit needed. An explicit "logo" path in projects.json wins if set.
 */
const LOGO_EXTS = [".svg", ".png", ".webp", ".jpg", ".jpeg"];
function logoFor(p) {
  if (has(p.logo)) return p.logo;
  for (const ext of LOGO_EXTS) {
    const relPath = `assets/images/logos/${p.slug}${ext}`;
    if (fs.existsSync(path.join(ROOT, relPath))) return relPath;
  }
  return "";
}

/* ---------- icons ---------- */

const icon = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  linkedin:
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-13h4v1.5A6 6 0 0 1 16 8z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  github:
    '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19.8 5a4.9 4.9 0 0 0-.1-3.6s-1.2-.4-3.9 1.5a13.4 13.4 0 0 0-7 0C6.1 1 4.9 1.4 4.9 1.4A4.9 4.9 0 0 0 4.8 5a5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-1 2.6V22"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
};

const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icon[name]}</svg>`;

/* ---------- shared chrome ---------- */

const rel = (depth) => "../".repeat(depth);

function head(depth, title, description, canonical) {
  const base = rel(depth);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">

<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/css/site.css">

<script>
// Set the theme before first paint so there is no flash of the wrong one.
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
</script>

<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(profile.analyticsId)}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${esc(profile.analyticsId)}');
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${backdrop()}`;
}

/** Layered ambient backdrop. Dark theme only — hidden in light. */
function backdrop() {
  return `<div class="backdrop" aria-hidden="true">
  <div class="backdrop-base"></div>
  <div class="backdrop-grid"></div>
  <div class="aurora aurora-teal"></div>
  <div class="aurora aurora-emerald"></div>
  <div class="aurora aurora-spring"></div>
  <div class="aurora aurora-jade"></div>
  <div class="backdrop-noise"></div>
</div>`;
}

function dock(depth, opts) {
  const base = rel(depth);
  const showFailures = has(profile.failures) && opts.failures;

  return `
<nav class="dock glass" aria-label="Quick links">
  <button class="dock-item" data-theme-toggle aria-pressed="false" data-label="Toggle theme">
    <span class="visually-hidden">Toggle theme</span>
    <span class="icon-sun">${svg("sun")}</span>
    <span class="icon-moon">${svg("moon")}</span>
  </button>
  <span class="dock-sep"></span>
  <a class="dock-item" href="${base}index.html" data-label="Portfolio">
    <span class="visually-hidden">Portfolio</span>${svg("home")}
  </a>
  <a class="dock-item" href="${esc(profile.links.resume)}" target="_blank" rel="noopener" data-label="Resume">
    <span class="visually-hidden">Resume</span>${svg("file")}
  </a>
  <button class="dock-item" data-copy-email="${esc(profile.email)}" data-label="Copy email">
    <span class="visually-hidden">Copy email address</span>${svg("mail")}
  </button>
  <a class="dock-item" href="${esc(profile.links.linkedin)}" target="_blank" rel="noopener" data-label="LinkedIn">
    <span class="visually-hidden">LinkedIn</span>${svg("linkedin")}
  </a>
  <a class="dock-item" href="${esc(profile.links.github)}" target="_blank" rel="noopener" data-label="GitHub">
    <span class="visually-hidden">GitHub</span>${svg("github")}
  </a>
  ${
    showFailures
      ? `<span class="dock-sep"></span>
  <button class="dock-item" data-dialog-open="failures" data-label="Failures">
    <span class="visually-hidden">Open failures</span>${svg("flag")}
  </button>`
      : ""
  }
</nav>`;
}

function foot(depth) {
  return `
<script src="${rel(depth)}assets/js/site.js"></script>
</body>
</html>`;
}

/* ---------- case study body (shared by page + modal) ---------- */

/**
 * @param depth  0 when embedded in the home page's <template>, 2 for the
 *               standalone page — the logo path has to resolve from both.
 */
function articleInner(p, depth) {
  const tags = (p.tags || []).map(normalizeTag).filter((t) => has(t.label));
  const pills = join([
    ...tags.map(
      (t) => `    <li class="pill${t.variant ? " pill-" + t.variant : ""}">${esc(t.label)}</li>`
    ),
    has(p.year) ? `    <li class="pill">${esc(p.year)}</li>` : "",
    p.draft ? `    <li class="pill pill-draft">Draft</li>` : "",
  ]);

  const byline = [
    has(p.role) ? `<span class="byline-role">${esc(p.role)}</span>` : "",
    has(p.company) ? `<span class="byline-org">${esc(p.company)}</span>` : "",
  ]
    .filter(Boolean)
    .join('<span class="byline-dot">•</span>');

  const block = (title, body) =>
    has(body) ? `    <section class="block">\n      <h2>${esc(title)}</h2>\n${body}\n    </section>` : "";

  const main = join([
    block("Situation", prose(p.situation)),
    block("Task", prose(p.task)),
    block("Result", prose(p.result)),
    block("My Contribution", prose(p.contributions)),
  ]);

  /* ----- right rail ----- */

  const kr = p.keyResults || {};
  const krItems = (kr.items || []).filter((i) => has(i.name));
  const keyResults =
    has(kr.metric) || krItems.length
      ? `      <div class="card">
        <h2 class="card-title">Key Results</h2>
${join([
  has(kr.metric)
    ? `        <div class="metric">
          <span class="metric-value">${esc(kr.metric)}</span>
          ${has(kr.metricLabel) ? `<span class="metric-label">${esc(kr.metricLabel)}</span>` : ""}
          ${has(kr.metricNote) ? `<p class="metric-note">${esc(kr.metricNote)}</p>` : ""}
        </div>`
    : "",
  ...krItems.map(
    (i) => `        <div class="metric">
          <span class="metric-name">${esc(i.name)}</span>
          ${has(i.label) ? `<span class="metric-label">${esc(i.label)}</span>` : ""}
          ${has(i.note) ? `<p class="metric-note">${esc(i.note)}</p>` : ""}
        </div>`
  ),
])}
      </div>`
      : "";

  // Bare chips rather than a card — the card's padding and title cost more
  // vertical space than the chips themselves, and the rail is the tall column.
  const skills = has(p.skills)
    ? `      <div class="rail-skills">
        <h2 class="eyebrow">Skills &amp; Technologies</h2>
        <ul class="tags">${p.skills.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>`
    : "";

  // Links sit in the header, not the rail — the rail is the tall column and a
  // whole extra card there is what pushed case studies past one screen.
  const links = has(p.links)
    ? `  <div class="article-links">
${p.links
  .map(
    (l) =>
      `    <a class="button" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(
        l.label
      )} ↗</a>`
  )
  .join("\n")}
  </div>`
    : "";

  const rail = join([keyResults, skills]);
  const empty = !has(p.situation) && !has(p.task) && !has(p.result) && !has(p.contributions);

  const logoSrc = logoFor(p);
  const logo = logoSrc
    ? `      <img class="article-logo" src="${rel(depth)}${esc(logoSrc)}" alt="${esc(p.title)} logo">`
    : "";

  return join([
    `<div class="article-inner">`,
    pills ? `  <ul class="pills">\n${pills}\n  </ul>` : "",
    `  <h1 class="article-title" id="modal-title">${esc(p.title)}</h1>`,
    // Logo, byline and links all share one row. Each on its own line cost ~40px,
    // and the case study has to fit a 768px-tall screen without scrolling.
    byline || links || logo
      ? `  <div class="byline-row">\n${join([
          logo || byline
            ? `    <div class="byline-id">\n${join([logo, byline ? `      <p class="byline">${byline}</p>` : ""])}\n    </div>`
            : "",
          links,
        ])}\n  </div>`
      : "",
    // The modal opens over the work list, which already shows this summary —
    // repeating it costs a screen-full of height for nothing. The standalone
    // page has no list behind it, so it keeps the lede.
    has(p.summary) && depth > 0 ? `  <p class="lede">${esc(p.summary)}</p>` : "",
    empty
      ? `  <p class="notice">This case study is still being written. The links are real — the write-up is on its way.</p>`
      : "",
    `  <div class="article-grid">`,
    `    <div class="article-main">`,
    main,
    `    </div>`,
    rail ? `    <aside class="article-rail">\n${rail}\n    </aside>` : "",
    `  </div>`,
    `</div>`,
  ]);
}

/* ---------- home ---------- */

function renderHome() {
  const items = projects
    .map((p) => {
      const logoSrc = logoFor(p);
      return `      <li class="work-item" data-slug="${esc(p.slug)}">
        <a class="work-link" href="project/${esc(p.slug)}/" data-project="${esc(p.slug)}">
${
  logoSrc
    ? `          <img class="work-logo" src="${esc(logoSrc)}" alt="" aria-hidden="true" loading="lazy">\n`
    : // No logo yet — a monogram tile keeps the column uniform instead of
      // leaving a hole. Same size and shape as a real one.
      `          <span class="work-logo work-logo-fallback" aria-hidden="true">${esc(
        p.title.trim().charAt(0)
      )}</span>\n`
}          <span class="work-title">${esc(p.title)}${
        p.draft ? '<span class="chip">Draft</span>' : ""
      }</span>
          <span class="work-meta">${esc(p.category)}</span>
          <p class="work-summary">${esc(p.summary)}</p>
        </a>
      </li>`;
    })
    .join("\n");

  const ethos = profile.ethos.items
    .map(
      (e) =>
        `        <li><span class="ethos-word">${esc(e.word)}</span><span class="ethos-note">(${esc(
          e.note
        )})</span></li>`
    )
    .join("\n");

  const failures = has(profile.failures)
    ? `
<dialog id="failures" class="glass">
  <div class="dialog-head">
    <h2>Failures</h2>
    <button class="dialog-close" data-dialog-close aria-label="Close">&times;</button>
  </div>
  <div class="dialog-body">
${profile.failures
  .map(
    (f) => `    <div class="failure-item">
      <h3>${esc(f.title)}${f.draft ? '<span class="chip">Draft</span>' : ""}</h3>
      <p>${esc(f.note)}</p>
    </div>`
  )
  .join("\n")}
  </div>
</dialog>`
    : "";

  // Case-study markup for every project, inert until cloned into the modal.
  // Embedded rather than fetched at click time: no network, so it works from
  // file://, offline, and on any host — and opens with zero latency.
  const templates = projects
    .map(
      (p) =>
        `<template data-project-content="${esc(p.slug)}">\n${articleInner(p, 0)}\n</template>`
    )
    .join("\n");

  // Modal shell — filled at click time from the template above.
  const modal = `
<div class="modal" id="modal" hidden>
  <div class="modal-scrim" data-modal-close></div>
  <div class="modal-panel glass" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <button class="modal-close" data-modal-close aria-label="Close case study">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>`;

  return join([
    head(0, `${profile.name} | ${profile.title}`, profile.intro, profile.domain + "/"),
    `<main class="shell" id="main">
  <div class="panel">
    <img class="avatar" src="${esc(profile.avatar)}" alt="${esc(profile.name)}" width="64" height="64">
    <p class="greeting">Hello there, I'm</p>
    <h1 class="name">${esc(profile.firstName)} <span class="wave">👋</span></h1>
    <p class="tagline">${esc(profile.tagline)}</p>
    <p class="intro">${esc(profile.intro)}</p>

    <section class="ethos">
      <h2 class="eyebrow">${esc(profile.ethos.heading)}</h2>
      <ul class="ethos-list">
${ethos}
      </ul>
    </section>

    <div class="panel-meta">
      <p><strong>${esc(profile.location)}</strong></p>
      <p>Last updated: <strong>${esc(profile.lastUpdated)}</strong></p>
      <p>${esc(profile.aside)}</p>
    </div>
  </div>

  <div class="work">
    <div class="work-head">
      <h2 class="eyebrow">Selected Work</h2>
      <span class="count">${projects.length} projects</span>
    </div>
    <ul class="work-list">
${items}
    </ul>
  </div>
</main>`,
    templates,
    modal,
    failures,
    dock(0, { failures: true }),
    foot(0),
  ]);
}

/* ---------- standalone project page ---------- */

function renderProject(p) {
  return join([
    head(2, `${p.title} | ${profile.name}`, p.summary, `${profile.domain}/project/${p.slug}/`),
    `<main class="article" id="main">
  <a class="back" href="../../index.html">← All work</a>
${articleInner(p, 2)}
</main>`,
    dock(2, { failures: false }),
    foot(2),
  ]);
}

/* ---------- write ---------- */

function write(relPath, contents) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  console.log("  ✓ " + relPath);
}

const seen = new Set();
for (const p of projects) {
  if (seen.has(p.slug)) throw new Error(`Duplicate slug in projects.json: "${p.slug}"`);
  seen.add(p.slug);
}

console.log("Building…");
write("index.html", renderHome());
projects.forEach((p) => write(`project/${p.slug}/index.html`, renderProject(p)));

// Delete pages for projects that are no longer in projects.json. Without this,
// a removed project keeps its URL live forever — unlinked but still reachable
// and still indexed.
const projectDir = path.join(ROOT, "project");
if (fs.existsSync(projectDir)) {
  for (const dir of fs.readdirSync(projectDir)) {
    if (seen.has(dir)) continue;
    fs.rmSync(path.join(projectDir, dir), { recursive: true, force: true });
    console.log("  ✗ removed project/" + dir + "/ (no longer in projects.json)");
  }
}

console.log(`Done — 1 home page, ${projects.length} project pages.`);
