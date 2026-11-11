(function () {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* -----------------------------------------------------------------------
     Language
     ----------------------------------------------------------------------- */
  const languageButtons = Array.from(document.querySelectorAll("[data-set-lang]"));
  const titleZh = document.body.getAttribute("data-title-zh");
  const titleEn = document.body.getAttribute("data-title-en");

  function currentLanguage() {
    return root.lang === "en" ? "en" : "zh";
  }

  function setLanguage(language, persist) {
    const normalized = language === "en" ? "en" : "zh";
    root.lang = normalized === "en" ? "en" : "zh-CN";

    languageButtons.forEach(function (button) {
      const active = button.getAttribute("data-set-lang") === normalized;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (titleZh && titleEn) {
      document.title = normalized === "en" ? titleEn : titleZh;
    }

    if (persist) {
      try {
        localStorage.setItem("diting-lang-v2", normalized);
      } catch (error) {
        /* Storage may be unavailable in private contexts. */
      }
    }

    document.dispatchEvent(
      new CustomEvent("langchange", { detail: { language: normalized } })
    );
  }

  function updateLanguageUrl(language) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language);
      window.history.replaceState({}, "", url);
    } catch (error) {
      /* History can be unavailable in embedded contexts. */
    }
  }

  languageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const language = button.getAttribute("data-set-lang");
      setLanguage(language, true);
      updateLanguageUrl(language);
    });
  });

  try {
    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    if (queryLanguage === "en" || queryLanguage === "zh") {
      setLanguage(queryLanguage, true);
    } else {
      const storedLanguage = localStorage.getItem("diting-lang-v2");
      setLanguage(storedLanguage === "zh" ? "zh" : "en", false);
    }
  } catch (error) {
    setLanguage(currentLanguage(), false);
  }

  document.addEventListener("langchange", function (event) {
    const language = event.detail && event.detail.language;
    document.querySelectorAll("video[data-lang]").forEach(function (video) {
      if (video.getAttribute("data-lang") !== language) video.pause();
    });
  });

  /* -----------------------------------------------------------------------
     Mobile navigation
     ----------------------------------------------------------------------- */
  const nav = document.getElementById("site-nav");
  const navToggle = document.querySelector("[data-nav-toggle]");

  function navLabel(open) {
    if (!navToggle) return;
    const zh = currentLanguage() === "zh";
    navToggle.setAttribute(
      "aria-label",
      open ? (zh ? "关闭导航" : "Close navigation") : zh ? "打开导航" : "Open navigation"
    );
  }

  function setNav(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
    navLabel(open);
  }

  if (nav && navToggle) {
    navLabel(false);

    navToggle.addEventListener("click", function () {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNav(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setNav(false);
        navToggle.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) setNav(false);
    });

    document.addEventListener("langchange", function () {
      navLabel(nav.classList.contains("is-open"));
    });
  }

  /* -----------------------------------------------------------------------
     Copy buttons
     ----------------------------------------------------------------------- */
  function legacyCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    document.body.removeChild(textarea);
    return copied;
  }

  function markScrollableCode() {
    document.querySelectorAll(".code-box pre, .terminal-body pre").forEach(function (pre) {
      if (pre.scrollWidth > pre.clientWidth + 2) {
        pre.setAttribute("tabindex", "0");
        pre.setAttribute(
          "aria-label",
          currentLanguage() === "zh" ? "可滚动代码示例" : "Scrollable code sample"
        );
      } else {
        pre.removeAttribute("tabindex");
      }
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(markScrollableCode);
  }
  window.addEventListener("resize", markScrollableCode);
  document.addEventListener("langchange", markScrollableCode);
  markScrollableCode();

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.setAttribute("aria-live", "polite");
    button.addEventListener("click", function () {
      const selector = button.getAttribute("data-copy");
      const target = selector ? document.querySelector(selector) : null;
      if (!target) return;

      const text = target.textContent.replace(/\n$/, "");
      const done = function () {
        button.classList.add("is-copied");
        window.setTimeout(function () {
          button.classList.remove("is-copied");
        }, 1800);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          if (legacyCopy(text)) done();
        });
      } else if (legacyCopy(text)) {
        done();
      }
    });
  });

  /* -----------------------------------------------------------------------
     Scroll reveal
     ----------------------------------------------------------------------- */
  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  if (revealItems.length) {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
    } else {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );

      revealItems.forEach(function (item) {
        observer.observe(item);
      });

      // Reveal everything on a timer as a safety net. Fast scrolling, hash
      // navigation and background tabs can otherwise leave content hidden.
      window.setTimeout(function () {
        revealItems.forEach(function (item) {
          item.classList.add("is-visible");
        });
      }, 2200);
    }
  }

  reducedMotion.addEventListener("change", function (event) {
    if (event.matches) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
    }
  });


  /* -----------------------------------------------------------------------
     Scroll chrome: header progress, sticky state, and page-jump scrollspy
     ----------------------------------------------------------------------- */
  const header = document.querySelector(".site-header");
  let progressBar = null;
  if (header) {
    progressBar = document.createElement("span");
    progressBar.className = "scroll-progress";
    progressBar.setAttribute("aria-hidden", "true");
    header.appendChild(progressBar);
  }

  const jumpLinks = Array.from(
    document.querySelectorAll('.page-jump a[href^="#"]')
  );
  const jumpTargets = jumpLinks
    .map(function (link) {
      return { link: link, target: document.querySelector(link.getAttribute("href")) };
    })
    .filter(function (entry) {
      return entry.target;
    });

  let scrollTicking = false;

  function updateScrollChrome() {
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressBar.style.transform = "scaleX(" + value + ")";
    }

    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 4);
    }

    if (jumpTargets.length) {
      const threshold = (header ? header.offsetHeight : 0) + 40;
      let active = jumpTargets[0].link;
      jumpTargets.forEach(function (entry) {
        if (entry.target.getBoundingClientRect().top <= threshold) {
          active = entry.link;
        }
      });
      jumpTargets.forEach(function (entry) {
        const isActive = entry.link === active;
        entry.link.classList.toggle("is-active", isActive);
        if (isActive) entry.link.setAttribute("aria-current", "location");
        else entry.link.removeAttribute("aria-current");
      });
    }

    scrollTicking = false;
  }

  function requestScrollChrome() {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateScrollChrome);
    }
  }

  window.addEventListener("scroll", requestScrollChrome, { passive: true });
  window.addEventListener("resize", requestScrollChrome, { passive: true });
  window.addEventListener("hashchange", requestScrollChrome);
  updateScrollChrome();



  /* Code headers: keep the copy control, remove decorative labels. */
  document.querySelectorAll(".code-top").forEach(function (top) {
    top.querySelectorAll(":scope > span").forEach(function (label) {
      label.remove();
    });
    if (!top.querySelector(".copy-btn")) top.remove();
  });

})();
