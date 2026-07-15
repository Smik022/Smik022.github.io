/* Theme toggle, email copy, dialogs, and the project modal.
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
     Failures dialog
     ============================================================ */

  document.querySelectorAll("[data-dialog-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dialog = document.getElementById(btn.getAttribute("data-dialog-open"));
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    });
  });

  document.querySelectorAll("[data-dialog-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dialog = btn.closest("dialog");
      if (dialog) dialog.close();
    });
  });

  document.querySelectorAll("dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  });

  /* ============================================================
     Project modal

     Progressive enhancement: every project link is a real URL to a real
     static page. We intercept the click, fetch that page, and lift its
     .article-inner into a modal — so there is one source of truth for the
     markup. If anything fails, we fall back to normal navigation.
     ============================================================ */

  var modal = document.getElementById("modal");
  var modalBody = document.getElementById("modal-body");
  if (!modal || !modalBody) return; // not the home page

  var panel = modal.querySelector(".modal-panel");
  var cache = new Map();
  var inflight = new Map();
  var lastFocused = null;
  var openSlug = null;
  var homeUrl = location.href;
  var homeTitle = document.title;

  /** Fetch a project page and extract the shared case-study block. */
  function loadProject(slug, url) {
    if (cache.has(slug)) return Promise.resolve(cache.get(slug));
    if (inflight.has(slug)) return inflight.get(slug);

    var req = fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var inner = doc.querySelector(".article-inner");
        if (!inner) throw new Error("no .article-inner in " + url);
        var markup = inner.outerHTML;
        cache.set(slug, markup);
        inflight.delete(slug);
        return markup;
      })
      .catch(function (err) {
        inflight.delete(slug);
        throw err;
      });

    inflight.set(slug, req);
    return req;
  }

  function markActive(slug) {
    document.querySelectorAll(".work-item").forEach(function (item) {
      item.classList.toggle("is-active", item.getAttribute("data-slug") === slug);
    });
  }

  function render(markup) {
    modalBody.innerHTML = markup;
    panel.scrollTop = 0;
    panel.focus();
    var title = modalBody.querySelector(".article-title");
    if (title) document.title = title.textContent.trim() + " | " + homeTitle.split("|")[0].trim();
  }

  function openModal(slug, url, push) {
    openSlug = slug;
    lastFocused = document.activeElement;

    modal.hidden = false;
    document.body.classList.add("modal-open", "modal-locked");
    markActive(slug);

    // Unhide, force a layout so the transition has a start value, then animate.
    // A forced reflow beats rAF here: it still works when frames are throttled.
    void modal.offsetWidth;
    modal.classList.add("is-open");

    if (push) history.pushState({ slug: slug, url: url }, "", url);

    // Prefetched on hover in the common case, so skip the placeholder entirely.
    if (cache.has(slug)) {
      render(cache.get(slug));
      return;
    }

    modalBody.innerHTML = '<p class="modal-status">Loading…</p>';
    loadProject(slug, url).then(
      function (markup) {
        if (openSlug !== slug) return; // a different project won the race
        render(markup);
      },
      function () {
        if (openSlug !== slug) return;
        // Could not fetch — just go to the real page.
        window.location.href = url;
      }
    );
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

    // Warm the cache so the open feels instant.
    var prefetch = function () {
      loadProject(slug, link.href).catch(function () {});
    };
    link.addEventListener("mouseenter", prefetch);
    link.addEventListener("focus", prefetch);

    link.addEventListener("click", function (e) {
      // Let modified clicks (new tab, download, middle-click) behave normally.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      openModal(slug, link.href, true);
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
