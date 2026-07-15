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

/** Join non-empty strings with newlines — keeps templates free of `&&` noise. */
const join = (parts) => parts.filter(Boolean).join("\n");

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

/** @param depth  0 for root, 2 for project/<slug>/ */
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
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
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
<a class="skip-link" href="#main">Skip to content</a>`;
}

function dock(depth, opts) {
  const base = rel(depth);
  const showFailures = has(profile.failures) && opts.failures;

  return `
<nav class="dock" aria-label="Quick links">
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

/* ---------- home ---------- */

function renderHome() {
  const items = projects
    .map(
      (p) => `      <li class="work-item">
        <a class="work-link" href="project/${esc(p.slug)}/">
          <span class="work-title">${esc(p.title)}${
        p.draft ? '<span class="chip">Draft</span>' : ""
      }</span>
          <span class="work-meta">${esc(p.category)} · ${esc(p.year)}</span>
          <p class="work-summary">${esc(p.summary)}</p>
        </a>
      </li>`
    )
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
<dialog id="failures">
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

  return join([
    head(
      0,
      `${profile.name} | ${profile.title}`,
      profile.intro,
      profile.domain + "/"
    ),
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
    failures,
    dock(0, { failures: true }),
    foot(0),
  ]);
}

/* ---------- project page ---------- */

function renderProject(p) {
  const meta = [p.category, p.role, p.year].filter(has).map((m) => `<li>${esc(m)}</li>`).join("");

  const block = (title, body) =>
    has(body) ? `  <section class="block">\n    <h2>${esc(title)}</h2>\n${body}\n  </section>` : "";

  const para = (text) => `    <p>${esc(text)}</p>`;

  const bullets = (list) =>
    `    <ul>\n${list.map((i) => `      <li>${esc(i)}</li>`).join("\n")}\n    </ul>`;

  const kr = p.keyResults || {};
  const keyResultsBody = join([
    has(kr.metric)
      ? `    <div class="metric"><span class="metric-value">${esc(
          kr.metric
        )}</span><span class="metric-label">${esc(kr.metricLabel)}</span></div>`
      : "",
    has(kr.items)
      ? `    <ul>\n${kr.items
          .map(
            (i) =>
              `      <li><strong>${esc(i.name)}</strong>${i.note ? " — " + esc(i.note) : ""}</li>`
          )
          .join("\n")}\n    </ul>`
      : "",
  ]);

  const links = has(p.links)
    ? `  <section class="block">
    <h2>Links</h2>
    <div class="article-links">
${p.links
  .map(
    (l) =>
      `      <a class="button" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(
        l.label
      )} ↗</a>`
  )
  .join("\n")}
    </div>
  </section>`
    : "";

  const bodyBlocks = join([
    block("Situation", has(p.situation) ? para(p.situation) : ""),
    block("Task", has(p.task) ? para(p.task) : ""),
    block("Result", has(p.result) ? para(p.result) : ""),
    block("My Contribution", has(p.contributions) ? bullets(p.contributions) : ""),
    block("Key Results", keyResultsBody),
    links,
    block("Skills & Technologies", has(p.skills) ? `    <ul class="tags">${p.skills
      .map((s) => `<li>${esc(s)}</li>`)
      .join("")}</ul>` : ""),
  ]);

  const empty = !has(p.situation) && !has(p.task) && !has(p.result) && !has(p.contributions);

  return join([
    head(
      2,
      `${p.title} | ${profile.name}`,
      p.summary,
      `${profile.domain}/project/${p.slug}/`
    ),
    `<main class="article" id="main">
  <a class="back" href="../../index.html">← All work</a>

  <h1 class="article-title">${esc(p.title)}</h1>
  <ul class="article-meta">${meta}</ul>
  <p class="lede">${esc(p.summary)}</p>
${
  empty
    ? `  <p class="notice">This case study is still being written. The live links below are real — the write-up is on its way.</p>`
    : ""
}
${bodyBlocks}
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

// Fail loudly on duplicate slugs — they'd silently overwrite each other.
const seen = new Set();
for (const p of projects) {
  if (seen.has(p.slug)) throw new Error(`Duplicate slug in projects.json: "${p.slug}"`);
  seen.add(p.slug);
}

console.log("Building…");
write("index.html", renderHome());
projects.forEach((p) => write(`project/${p.slug}/index.html`, renderProject(p)));
console.log(`Done — 1 home page, ${projects.length} project pages.`);
