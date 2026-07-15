/* Theme toggle, email copy, and the project modal.
   The initial theme is set by an inline script in <head> to avoid a flash. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ============================================================
     Theme
     ============================================================ */

  var toggle = document.querySelector("[data-theme-toggle]");

  /** Keep the button's label and pressed state in step with the active theme. */
  function syncToggle(theme) {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.setAttribute("data-label", theme === "dark" ? "Light mode" : "Dark mode");
  }

  function setTheme(theme, persist) {
    document.body.classList.add("theme-switching");
    root.setAttribute("data-theme", theme);
    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {
        /* private mode — the choice just won't persist */
      }
    }
    syncToggle(theme);
    var release = function () {
      document.body.classList.remove("theme-switching");
    };
    requestAnimationFrame(function () {
      requestAnimationFrame(release);
    });
    // rAF is throttled in background tabs; never leave transitions suppressed.
    setTimeout(release, 200);
  }

  // The inline <head> script already picked a theme; catch the button up to it.
  syncToggle(root.getAttribute("data-theme"));

  if (toggle) {
    toggle.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }

  // Follow the OS unless the visitor has made an explicit choice.
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var onSchemeChange = function (e) {
    var stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (err) {
      /* ignore */
    }
    if (!stored) setTheme(e.matches ? "dark" : "light", false);
  };
  if (media.addEventListener) media.addEventListener("change", onSchemeChange);
  else if (media.addListener) media.addListener(onSchemeChange);

  /* ============================================================
     Email copy
     ============================================================ */

  var copyBtn = document.querySelector("[data-copy-email]");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-copy-email");

      var done = function () {
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.classList.remove("copied");
        }, 1600);
      };

      var fallback = function () {
        // Older browsers and non-secure contexts (e.g. file://).
        var field = document.createElement("textarea");
        field.value = email;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        try {
          document.execCommand("copy");
          done();
        } catch (e) {
          window.location.href = "mailto:" + email;
        }
        document.body.removeChild(field);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done, fallback);
      } else {
        fallback();
      }
    });
  }

  /* ============================================================
     Project modal

     Progressive enhancement: every project link is a real URL to a real
     static page. We intercept the click and show the case study from an
     inert <template> already in the page — no network, so this cannot stall
     and works from file:// or offline. Both the template and the standalone
     page come from the same generator, so they cannot drift apart.
     If the template is missing, the link just navigates.
     ============================================================ */

  var modal = document.getElementById("modal");
  var modalBody = document.getElementById("modal-body");
  if (!modal || !modalBody) return; // not the home page

  var panel = modal.querySelector(".modal-panel");
  var lastFocused = null;
  var openSlug = null;
  var homeUrl = location.href;
  var homeTitle = document.title;

  /** The inert <template> holding a project's case study, or null. */
  function contentFor(slug) {
    return document.querySelector('template[data-project-content="' + slug + '"]');
  }

  /**
   * Re-point relative URLs at the site root.
   *
   * pushState moves the document's base URL to /project/<slug>/, so a relative
   * path injected afterwards resolves against *that* rather than the root —
   * switching projects from inside the modal asked for
   * /project/a/assets/... and 404'd. Fixed on the fragment before it enters
   * the document, so the wrong request is never made.
   */
  function absolutise(frag) {
    frag.querySelectorAll("img[src], source[srcset]").forEach(function (el) {
      var attr = el.hasAttribute("src") ? "src" : "srcset";
      var raw = el.getAttribute(attr);
      if (!raw || /^([a-z][a-z0-9+.-]*:|\/\/|\/|data:)/i.test(raw)) return; // already absolute
      el.setAttribute(attr, new URL(raw, homeUrl).href);
    });
  }

  function markActive(slug) {
    document.querySelectorAll(".work-item").forEach(function (item) {
      item.classList.toggle("is-active", item.getAttribute("data-slug") === slug);
    });
  }

  function render(tpl) {
    // Clone rather than assign innerHTML: template content is inert, so URLs
    // can be corrected before anything is fetched.
    var frag = tpl.content.cloneNode(true);
    absolutise(frag);
    modalBody.innerHTML = "";
    modalBody.appendChild(frag);
    panel.scrollTop = 0;
    panel.focus();
    var title = modalBody.querySelector(".article-title");
    if (title) document.title = title.textContent.trim() + " | " + homeTitle.split("|")[0].trim();
  }

  function openModal(slug, url, push) {
    var tpl = contentFor(slug);
    if (!tpl) {
      // Nothing baked in for this slug — fall back to the real page.
      window.location.href = url;
      return;
    }

    openSlug = slug;
    lastFocused = document.activeElement;

    modal.hidden = false;
    document.body.classList.add("modal-open", "modal-locked");
    markActive(slug);
    render(tpl);

    // Unhide, force a layout so the transition has a start value, then animate.
    // A forced reflow beats rAF here: it still works when frames are throttled.
    void modal.offsetWidth;
    modal.classList.add("is-open");

    if (push) history.pushState({ slug: slug, url: url }, "", url);
  }

  function closeModal(push) {
    if (openSlug === null) return;
    openSlug = null;

    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open", "modal-locked");
    markActive(null);
    document.title = homeTitle;

    if (push) history.pushState({}, "", homeUrl);

    var onDone = function () {
      if (openSlug === null) {
        modal.hidden = true;
        modalBody.innerHTML = "";
      }
      panel.removeEventListener("transitionend", onDone);
    };
    panel.addEventListener("transitionend", onDone);
    // transitionend can be skipped if the tab is hidden or motion is reduced.
    setTimeout(onDone, 400);

    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  /* ---------- wiring ---------- */

  document.querySelectorAll("[data-project]").forEach(function (link) {
    var slug = link.getAttribute("data-project");
    // Resolve the absolute URL *now*, while the document URL is still the home
    // page. pushState moves the base, so reading link.href later would resolve
    // the relative href against /project/<slug>/ and compound the path.
    var href = link.href;

    link.addEventListener("click", function (e) {
      // Let modified clicks (new tab, download, middle-click) behave normally.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      openModal(slug, href, true);
    });
  });

  modal.querySelectorAll("[data-modal-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeModal(true);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openSlug !== null) closeModal(true);
  });

  window.addEventListener("popstate", function (e) {
    var state = e.state;
    if (state && state.slug) openModal(state.slug, state.url, false);
    else closeModal(false);
  });

  // Deep link support: /?project=slug is not used, but if someone lands on the
  // home page with a hash pointing at a project, honour it.
  var hash = location.hash.replace(/^#project=/, "");
  if (hash && hash !== location.hash) {
    var target = document.querySelector('[data-project="' + hash + '"]');
    if (target) openModal(hash, target.href, false);
  }
})();
