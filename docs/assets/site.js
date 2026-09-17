(function () {
  const REPO = "EMAYAN08/workout-tracker";

  function bindMenu() {
    const nav = document.querySelector("nav.top");
    const toggle = document.querySelector("[data-menu]");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Menu");
      toggle.textContent = open ? "✕" : "☰";
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMenu);
  } else {
    bindMenu();
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
      .replace(/&/g, '\u0026amp;')
      .replace(/</g, '\u0026lt;')
      .replace(/>/g, '\u0026gt;')
      .replace(/"/g, '\u0026quot;');
  }
})();
