/* ============================================================
   app.js — router, navigation indicator, reveal-on-scroll, boot
   ============================================================ */
(function () {
  "use strict";
  const pages = Object.assign({}, window.PAGES_A, window.PAGES_B);
  const D = window.DASH;
  const order = ["overview", "trends", "commodities", "countries", "statistics", "forecast", "models", "explorer", "methodology", "source"];
  const inited = {};
  let current = null;

  const U = window.DASHUTIL;
  const CHARTS = U.CHARTS;

  function navIndicatorTo(el) {
    const ind = document.getElementById("navIndicator");
    if (!el || !ind) return;
    ind.style.transform = `translateY(${el.offsetTop}px)`;
  }

  function route() {
    const id = (location.hash.replace("#/", "") || "overview").split("?")[0];
    const pageId = order.includes(id) ? id : "overview";
    const section = document.getElementById("page-" + pageId);
    if (!section) return;

    order.forEach(p => {
      const el = document.getElementById("page-" + p);
      if (el) el.hidden = p !== pageId;
    });

    document.querySelectorAll(".nav-item").forEach(a => {
      const on = a.dataset.page === pageId;
      a.classList.toggle("active", on);
      if (on) { a.setAttribute("aria-current", "page"); navIndicatorTo(a); }
      else a.removeAttribute("aria-current");
    });

    document.title = `India Merchandise Trade — ${section.querySelector("h1")?.textContent || ""}`;

    if (!inited[pageId]) { pages[pageId].init(); inited[pageId] = true; }
    if (typeof pages[pageId].show === "function") pages[pageId].show();

    // re-trigger entering animation
    section.classList.remove("entering");
    void section.offsetWidth;
    section.classList.add("entering");

    window.scrollTo({ top: 0, behavior: "auto" });
    current = pageId;
    Object.values(CHARTS).forEach(c => c && c.resize && c.resize());
  }

  /* ---------------- reveal on scroll ---------------- */
  const io = ("IntersectionObserver" in window)
    ? new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
        });
      }, { threshold: 0.08 })
    : null;

  function observeReveals() {
    document.querySelectorAll(".reveal:not(.visible)").forEach(el => {
      if (io) io.observe(el); else el.classList.add("visible");
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    // init all sections present; ensure pages hidden initially except overview
    route();
    observeReveals();
    // after route, observe any new reveals (pages render lazily on first visit)
    const mo = new MutationObserver(() => observeReveals());
    document.getElementById("main").querySelectorAll(".page").forEach(p => mo.observe(p, { attributes: true, attributeFilter: ["hidden"] }));

    window.addEventListener("hashchange", () => { route(); observeReveals(); });
    window.addEventListener("resize", () => {
      const active = document.querySelector(".nav-item.active");
      if (active) navIndicatorTo(active);
      Object.values(CHARTS).forEach(c => c && c.resize && c.resize());
    });
    // keyboard: arrows navigate pages
    document.addEventListener("keydown", e => {
      if (e.target.matches("input, select, textarea")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const idx = order.indexOf(current);
      if (e.key === "ArrowRight" && idx < order.length - 1) location.hash = "#/" + order[idx + 1];
      if (e.key === "ArrowLeft" && idx > 0) location.hash = "#/" + order[idx - 1];
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
