(function () {
  const REPO = "EMAYAN08/workout-tracker";
  document.documentElement.classList.add("js");

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function bindMenu() {
    const nav = document.querySelector("nav.top");
    const toggle = document.querySelector("[data-menu]");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Menu");
      toggle.textContent = open ? "\u2715" : "\u2630";
      document.body.classList.toggle("nav-open", open);
    };

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });

    nav.querySelectorAll(".links a").forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(e.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  function bindReveal() {
    const els = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (!els.length) return;
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  function bindCarousel() {
    const root = document.querySelector("[data-carousel]");
    if (!root) return;
    const track = root.querySelector(".carousel-track");
    const slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
    const prev = root.querySelector("[data-prev]");
    const next = root.querySelector("[data-next]");
    const dotsWrap = root.querySelector("[data-dots]");
    if (!track || slides.length < 2) return;

    root.querySelectorAll(".viz-map").forEach((map) => {
      if (map.children.length) return;
      const pattern = [0,1,2,0,1,2,1,2,1,0,2,1,0,1,1,2,2,1,0,1,2,0,1,2,1,2,0,1,2,1,0,1,2,1,0];
      map.innerHTML = pattern
        .map((v) => '<i class="' + (v === 2 ? "on" : v === 1 ? "mid" : "") + '"></i>')
        .join("");
    });

    let index = 0;
    let timer = null;
    let paused = false;
    let user = false;

    dotsWrap.innerHTML = slides
      .map(function (_, n) {
        return '<button type="button" class="dot" aria-label="Feature ' + (n + 1) + '"></button>';
      })
      .join("");
    const dots = Array.prototype.slice.call(dotsWrap.querySelectorAll(".dot"));

    function paint() {
      slides.forEach(function (slide, n) {
        const on = n === index;
        slide.classList.toggle("is-active", on);
        slide.setAttribute("aria-hidden", on ? "false" : "true");
      });
      dots.forEach(function (dot, n) {
        if (n === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function go(n, fromUser) {
      index = (n + slides.length) % slides.length;
      const width = track.clientWidth || 1;
      track.scrollTo({
        left: index * width,
        behavior: reducedMotion() ? "auto" : "smooth",
      });
      paint();
      if (fromUser) {
        user = true;
        restart();
      }
    }

    function tick() {
      if (paused || document.hidden || reducedMotion() || user) return;
      go(index + 1);
    }

    function restart() {
      clearInterval(timer);
      timer = null;
      if (reducedMotion()) return;
      timer = setInterval(function () {
        if (user) {
          user = false;
          return;
        }
        tick();
      }, 5200);
    }

    if (prev) prev.addEventListener("click", function () { go(index - 1, true); });
    if (next) next.addEventListener("click", function () { go(index + 1, true); });
    dots.forEach(function (dot, n) {
      dot.addEventListener("click", function () { go(n, true); });
    });

    root.addEventListener("mouseenter", function () { paused = true; });
    root.addEventListener("mouseleave", function () { paused = false; });
    root.addEventListener("focusin", function () { paused = true; });
    root.addEventListener("focusout", function () { paused = false; });

    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, true); }
    });

    let raf = 0;
    track.addEventListener(
      "scroll",
      function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          const width = track.clientWidth || 1;
          const nextIndex = Math.round(track.scrollLeft / width);
          if (nextIndex !== index && nextIndex >= 0 && nextIndex < slides.length) {
            index = nextIndex;
            paint();
          }
        });
      },
      { passive: true }
    );

    window.addEventListener("resize", function () {
      track.scrollTo({ left: index * (track.clientWidth || 1), behavior: "auto" });
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearInterval(timer);
        timer = null;
      } else {
        restart();
      }
    });

    paint();
    restart();
  }

  function start() {
    bindMenu();
    bindReveal();
    bindCarousel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const form = document.querySelector("#feedback-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (form.name.value || "Anonymous").trim();
      const kind = form.kind.value || "Feedback";
      const message = (form.message.value || "").trim();
      if (!message) return;
      const title = `${kind}: ${message.slice(0, 70)}`;
      const body = [
        `**From:** ${name}`,
        `**Type:** ${kind}`,
        "",
        message,
        "",
        "—",
        "Sent from the TrackHit site.",
      ].join("\n");
      const url =
        `https://github.com/${REPO}/issues/new` +
        `?labels=${encodeURIComponent("feedback")}` +
        `&title=${encodeURIComponent(title)}` +
        `&body=${encodeURIComponent(body)}`;
      window.location.href = url;
    });
  }

  const wall = document.querySelector("#feedback-wall");
  if (!wall) return;

  const status = document.querySelector("#feedback-status");
  fetch(
    `https://api.github.com/repos/${REPO}/issues?state=all&labels=feedback&per_page=30&sort=created&direction=desc`,
    { headers: { Accept: "application/vnd.github+json" } }
  )
    .then((r) => {
      if (!r.ok) throw new Error("Could not load notes");
      return r.json();
    })
    .then((issues) => {
      if (!Array.isArray(issues) || issues.length === 0) {
        if (status) status.textContent = "No public notes yet. Be the first.";
        return;
      }
      if (status) status.textContent = `${issues.length} public note${issues.length === 1 ? "" : "s"}.`;
      wall.innerHTML = issues
        .map((issue) => {
          const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
          const acked = labels.includes("acknowledged") || issue.state === "closed";
          const badge = acked
            ? '<span class="badge ok">Acknowledged</span>'
            : '<span class="badge">Open</span>';
          const hearts = issue.reactions?.heart || 0;
          const plus = issue.reactions?.["+1"] || 0;
          const when = new Date(issue.created_at).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const body = (issue.body || "")
            .replace(/\*\*From:\*\*.+\n?/g, "")
            .replace(/\*\*Type:\*\*.+\n?/g, "")
            .replace(/Sent from the TrackHit site\.?/g, "")
            .replace(/^—+\s*$/gm, "")
            .trim();
          const safeTitle = escapeHtml(issue.title.replace(/^[^:]+:\s*/, ""));
          const safeBody = escapeHtml(body).slice(0, 600);
          return `<article class="note">
            <header>
              <h3>${safeTitle}</h3>
              ${badge}
            </header>
            <p>${safeBody || " "}</p>
            <footer>
              <span>${escapeHtml(issue.user?.login || "someone")} · ${when}</span>
              <span>${plus + hearts} heard</span>
              <a class="inline" href="${issue.html_url}">View</a>
            </footer>
          </article>`;
        })
        .join("");
    })
    .catch(() => {
      if (status) {
        status.innerHTML =
          'Notes live as public GitHub issues. <a class="inline" href="https://github.com/EMAYAN08/workout-tracker/issues?q=label%3Afeedback">Open the board</a>.';
      }
    });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }
})();
