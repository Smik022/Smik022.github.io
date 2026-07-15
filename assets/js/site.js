/* Theme toggle, email copy, and dialog wiring.
   The initial theme is set by an inline script in <head> to avoid a flash. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme ---------- */

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
    // Let the class land before we strip transition suppression.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.remove("theme-switching");
      });
    });
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
    if (!stored) setTheme(e.matches ? "dark" : "light");
  };
  if (media.addEventListener) media.addEventListener("change", onSchemeChange);
  else if (media.addListener) media.addListener(onSchemeChange);

  /* ---------- Email copy ---------- */

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
        // Older browsers and non-secure contexts.
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

  /* ---------- Dialogs ---------- */

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

  // Click the backdrop to dismiss.
  document.querySelectorAll("dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  });
})();
