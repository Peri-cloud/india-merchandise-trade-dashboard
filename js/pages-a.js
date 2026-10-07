/* ============================================================
   pages-a.js — helpers + Overview, Trends, Commodity, Country
   All data from window.DASH (data.js). Unit: Rs Crore throughout.
   ============================================================ */
(function () {
  "use strict";
  const D = window.DASH;
  const FYS = D.meta.fys;
  const FY_LATEST = FYS[FYS.length - 1];
  const CHARTS = {};          // global chart registry (filled by pages, resized in app.js)

  /* ---------------- formatting ---------------- */
  const nfIN = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  const nfIN1 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
  function inr(v) { return "₹" + nfIN.format(Math.round(v)); }               // ₹1,25,000
  function cr(v) { return inr(v) + " Cr"; }
  function crS(v) { return (v < 0 ? "−" : "") + "₹" + nfIN.format(Math.round(Math.abs(v))) + " Cr"; }
  function pct(v, d = 2) { return (v > 0 ? "+" : "") + v.toFixed(d) + "%"; }
  function lakh(v) { return (v / 100000).toFixed(1).replace(/\.0$/, "") + "L"; } // axis compact

  /* ---------------- count-up ---------------- */
  function countUp(el, target, fmt, dur = 900) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), from = 0;
    function frame(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (target - from) * e);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- ECharts dark fragments ---------------- */
  const AX = { c: "#64748B", f: 11 };
  function baseOpt(extra) {
    return Object.assign({
      animationDuration: 700,
      animationDurationUpdate: 900,
      animationEasingUpdate: "cubicOut",
      textStyle: { fontFamily: "Inter, Segoe UI, system-ui, sans-serif" },
      tooltip: {
        backgroundColor: "#0D1B31", borderColor: "rgba(148,163,184,0.3)",
        textStyle: { color: "#E4EAF3", fontSize: 12 },
        extraCssText: "box-shadow:0 8px 24px rgba(0,0,0,.45);border-radius:8px;"
      },
      grid: { left: 8, right: 18, top: 34, bottom: 6, containLabel: true },
    }, extra || {});
  }
  function catAxis(data, extra) {
    return Object.assign({
      type: "category", data: data, axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      axisTick: { show: false }, axisLabel: Object.assign({ color: AX.c, fontSize: AX.f }, extra || {})
    });
  }
  function valAxis(extra) {
    return Object.assign({
      type: "value", axisLabel: { color: AX.c, fontSize: AX.f, formatter: lakh },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
      axisLine: { show: false }, axisTick: { show: false }
    }, extra || {});
  }
  function legend(extra) {
    return Object.assign({
      top: 0, right: 0, itemWidth: 14, itemHeight: 3, icon: "rect",
      textStyle: { color: "#97A5BB", fontSize: 11.5 }
    }, extra || {});
  }
  function mountChart(id, opt) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (CHARTS[id]) { CHARTS[id].dispose(); }
    const c = echarts.init(el, null, { renderer: "canvas" });
    c.setOption(opt);
    CHARTS[id] = c;
    return c;
  }

  /* ---------------- shared builders ---------------- */
  function kpiCard(id, label, color) {
    const div = document.createElement("div");
    div.className = "kpi";
    div.id = id;
    div.style.setProperty("--kc", color || "var(--accent)");
    return div;
  }
  function growthChip(v) {
    if (v === null || v === undefined) return "";
    const cls = v >= 0 ? "up" : "down";
    return `<b class="${cls}">${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(2)}%</b>`;
  }

  function topBarOpt(items, color, fmtTip, extra) {
    // items: [{name, value}] sorted desc; horizontal bars
    const sorted = [...items].sort((a, b) => a.value - b.value); // asc -> largest on top
    return baseOpt({
      tooltip: { trigger: "item", formatter: p => `${p.name}<br/><b>${fmtTip(p.value)}</b>` },
      xAxis: valAxis({ axisLabel: { color: AX.c, fontSize: 11, formatter: lakh } }),
      yAxis: catAxis(sorted.map(d => d.name), { width: 205, overflow: "truncate" }),
      grid: { left: 8, right: 40, top: 8, bottom: 4, containLabel: true },
      series: [Object.assign({
        type: "bar", data: sorted.map(d => d.value), barWidth: "62%",
        itemStyle: { color: color, borderRadius: [0, 4, 4, 0], opacity: 0.92 },
        label: { show: true, position: "right", color: "#97A5BB", fontSize: 10.5, formatter: p => lakh(p.value) + " Cr" },
        animationDurationUpdate: 850, animationEasingUpdate: "cubicOut"
      }, extra || {})]
    });
  }

  const EXP_C = "#2DD4BF", IMP_C = "#E8A75D", NEG_C = "#F37272", POS_C = "#6FD3A6";
  const SHORT = { "Latin America & Caribbean": "Latin America & Carib.", "East & Southeast Asia": "E & SE Asia",
                  "Europe (Non-EU)": "Europe (non-EU)", "CIS & Central Asia": "CIS & C. Asia",
                  "Other / Unspecified": "Other/Unspec.", "West Asia & Gulf": "West Asia & Gulf" };
  const sh = s => SHORT[s] || s;

  /* ============================================================
     OVERVIEW
     ============================================================ */
  const overview = {
    init() {
      const t = D.totals[FY_LATEST];
      document.getElementById("ovFyChip").innerHTML =
        `Latest complete year <strong>${FY_LATEST}</strong> · CAGR exports <strong>${D.meta.cagr.export}%</strong> · imports <strong>${D.meta.cagr.import}%</strong>`;
      document.getElementById("ovNotice").innerHTML =
        `<strong>Provenance:</strong> every number on this site comes from the official TradeStat EIDB tables retrieved on 2026-10-06 — nothing is simulated. ` +
        `FY2025-26 (ended 31 Mar 2026) is the latest full year and remains subject to official revision. ` +
        `FY2023-24 export <em>item-level</em> values carry a source-side defect (items sum to 2.0× the official total); national totals are unaffected. Details: <a href="#/source">Data Source</a>.`;

      const wrap = document.getElementById("ovKpis");
      wrap.innerHTML = "";
      const defs = [
        ["Exports " + FY_LATEST, t.e, cr, EXP_C, growthChip(t.eg) + " vs FY2024-25"],
        ["Imports " + FY_LATEST, t.i, cr, IMP_C, growthChip(t.ig) + " vs FY2024-25"],
        ["Trade balance " + FY_LATEST, t.b, crS, NEG_C, "largest deficit in the series"],
        ["Total trade " + FY_LATEST, t.tt, cr, "#8FA6C9", "export share " + t.es + "% of total trade"],
      ];
      defs.forEach((d, i) => {
        const card = kpiCard("ovk" + i, d[0], d[3]);
        card.innerHTML = `<div class="kpi-label">${d[0]}</div><div class="kpi-value" id="ovkv${i}">₹0 Cr</div><div class="kpi-sub">${d[4]}</div>`;
        wrap.appendChild(card);
      });
      defs.forEach((d, i) => countUp(document.getElementById("ovkv" + i), d[1], d[2], 950 + i * 120));

      const fys = FYS, es = fys.map(f => D.totals[f].e), im = fys.map(f => D.totals[f].i);
      mountChart("ovTrend", baseOpt({
        tooltip: { trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "rgba(148,163,184,0.35)" } },
          valueFormatter: v => crS(v) },
        legend: legend(),
        xAxis: catAxis(fys, { interval: 0 }),
        yAxis: valAxis(),
        series: [
          { name: "Exports", type: "line", data: es, smooth: false, symbol: "circle", symbolSize: 6,
            lineStyle: { width: 2.5, color: EXP_C }, itemStyle: { color: EXP_C },
            areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: "rgba(45,212,191,0.18)" }, { offset: 1, color: "rgba(45,212,191,0)" }] } } },
          { name: "Imports", type: "line", data: im, smooth: false, symbol: "circle", symbolSize: 6,
            lineStyle: { width: 2.5, color: IMP_C }, itemStyle: { color: IMP_C } },
        ]
      }));
      mountChart("ovBalance", baseOpt({
        tooltip: { trigger: "axis", valueFormatter: v => crS(v) },
        xAxis: catAxis(fys, { interval: 0, rotate: 32, fontSize: 9.5 }),
        yAxis: valAxis({ axisLabel: { color: AX.c, fontSize: 11, formatter: v => v === 0 ? "0" : "−" + lakh(Math.abs(v)) } }),
        series: [{ type: "bar", data: fys.map(f => D.totals[f].b), barWidth: "48%",
          itemStyle: { color: NEG_C, opacity: 0.85, borderRadius: 3 } }]
      }));
      this.charts5();
      // hover sync between trend panels is unnecessary; keep charts independent
    },
    charts5() {
      const ch = D.chapters.byFY[FY_LATEST].export.slice(0, 5)
        .map(d => ({ name: d.n.length > 34 ? d.n.slice(0, 33) + "…" : d.n, value: d.v }));
      mountChart("ovChapters", topBarOpt(ch, EXP_C, v => cr(v)));
      const pn = D.countries.byFY[FY_LATEST].export.slice(0, 5)
        .map(d => ({ name: d.c, value: d.v }));
      mountChart("ovPartners", topBarOpt(pn, IMP_C, v => cr(v)));
      document.getElementById("ovChFy").textContent = FY_LATEST;
      document.getElementById("ovPnFy").textContent = FY_LATEST;
      mountChart("ovHhi", baseOpt({
        tooltip: { trigger: "axis" },
        legend: legend(),
        xAxis: catAxis(FYS, { interval: 0 }),
        yAxis: valAxis({ axisLabel: { color: AX.c, fontSize: 11 } }),
        series: [
          { name: "Export HHI", type: "line", data: FYS.map(f => D.chapters.hhi[f].export), symbolSize: 5,
            lineStyle: { color: EXP_C, width: 2 }, itemStyle: { color: EXP_C } },
          { name: "Import HHI", type: "line", data: FYS.map(f => D.chapters.hhi[f].import), symbolSize: 5,
            lineStyle: { color: IMP_C, width: 2 }, itemStyle: { color: IMP_C } },
        ]
      }));
    }
  };

  /* ============================================================
     TRADE TRENDS
     ============================================================ */
  const trends = {
    mode: "both",
    init() {
      const k = document.getElementById("trKpis");
      const t0 = D.totals[FYS[0]], t1 = D.totals[FY_LATEST];
      const peakExp = FYS.reduce((a, f) => D.totals[f].e > D.totals[a].e ? f : a, FYS[0]);
      const maxDef = FYS.reduce((a, f) => Math.abs(D.totals[f].b) > Math.abs(D.totals[a].b) ? f : a, FYS[0]);
      k.innerHTML = "";
      const defs = [
        ["CAGR exports FY2018-19 → " + FY_LATEST, D.meta.cagr.export, v => v.toFixed(2) + "%", EXP_C, "from " + cr(t0.e) + " to " + cr(t1.e)],
        ["CAGR imports FY2018-19 → " + FY_LATEST, D.meta.cagr.import, v => v.toFixed(2) + "%", IMP_C, "from " + cr(t0.i) + " to " + cr(t1.i)],
        ["Peak export year", 0, v => peakExp, "#8FA6C9", cr(D.totals[peakExp].e) + " of exports"],
        ["Widest deficit", 0, v => maxDef, NEG_C, crS(D.totals[maxDef].b) + " in " + maxDef],
      ];
      defs.forEach((d, i) => {
        const card = kpiCard("trk" + i, d[0], d[3]);
        card.innerHTML = `<div class="kpi-label">${d[0]}</div><div class="kpi-value" id="trkv${i}"></div><div class="kpi-sub">${d[4]}</div>`;
        k.appendChild(card);
      });
      this.kpiDefs = defs;
      this.renderMain();
      this.renderAux();
    },
    show() { this.renderMain(); this.renderAux(); this.animateKpis(); },
    animateKpis() {
      this.kpiDefs.forEach((d, i) => countUp(document.getElementById("trkv" + i), d[1], d[2], 850 + i * 110));
    },
    renderMain() {
      const fys = FYS, mode = this.mode;
      const series = [];
      const es = fys.map(f => D.totals[f].e), im = fys.map(f => D.totals[f].i), bs = fys.map(f => D.totals[f].b);
      if (mode === "both" || mode === "exp") series.push({
        name: "Exports", type: "line", data: es, symbolSize: 6,
        lineStyle: { width: 2.5, color: EXP_C }, itemStyle: { color: EXP_C },
        areaStyle: mode === "exp" ? { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: "rgba(45,212,191,0.16)" }, { offset: 1, color: "rgba(45,212,191,0)" }] } } : null
      });
      if (mode === "both" || mode === "imp") series.push({
        name: "Imports", type: "line", data: im, symbolSize: 6,
        lineStyle: { width: 2.5, color: IMP_C }, itemStyle: { color: IMP_C }
      });
      if (mode === "both" || mode === "bal") series.push({
        name: "Balance", type: "bar", data: bs, barWidth: "34%",
        itemStyle: { color: NEG_C, opacity: 0.8, borderRadius: 3 }
      });
      mountChart("trMain", baseOpt({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: v => crS(v) },
        legend: legend(),
        xAxis: catAxis(fys, { interval: 0 }),
        yAxis: valAxis(),
        series: series.filter(Boolean)
      }));
    },
    renderAux() {
      const fys = FYS.slice(1);
      mountChart("trGrowth", baseOpt({
        tooltip: { trigger: "axis", valueFormatter: v => v === null ? "—" : v.toFixed(2) + "%" },
        legend: legend(),
        xAxis: catAxis(fys, { interval: 0 }),
        yAxis: valAxis({ axisLabel: { color: AX.c, fontSize: 11, formatter: "{value}%" } }),
        series: [
          { name: "Export growth", type: "bar", data: fys.map(f => D.totals[f].eg), barWidth: "30%",
            itemStyle: { color: EXP_C, opacity: 0.85, borderRadius: 2 } },
          { name: "Import growth", type: "bar", data: fys.map(f => D.totals[f].ig), barWidth: "30%",
            itemStyle: { color: IMP_C, opacity: 0.85, borderRadius: 2 } },
        ]
      }));
      mountChart("trShare", baseOpt({
        tooltip: { trigger: "axis", valueFormatter: v => v.toFixed(2) + "%" },
        xAxis: catAxis(FYS, { interval: 0 }),
        yAxis: valAxis({ axisLabel: { color: AX.c, fontSize: 11, formatter: "{value}%" },
          max: v => Math.min(45, Math.ceil(v)) }),
        series: [{ name: "Export share", type: "line", data: FYS.map(f => D.totals[f].es),
          symbolSize: 6, lineStyle: { width: 2.5, color: "#8FA6C9" }, itemStyle: { color: "#8FA6C9" },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(143,166,201,0.15)" }, { offset: 1, color: "rgba(143,166,201,0)" }] } } }]
      }));
    }
  };

  /* ============================================================
     COMMODITY ANALYSIS
     ============================================================ */
  const commodities = {
    dir: "export", fy: FY_LATEST, sel: null,
    init() {
      const selFy = document.getElementById("cmFy");
      selFy.innerHTML = [...FYS].reverse().map(f => `<option value="${f}" ${f === this.fy ? "selected" : ""}>${f}</option>`).join("");
      selFy.addEventListener("change", () => { this.fy = selFy.value; this.renderTop(); this.renderTable(); this.renderHhi(); });
      document.getElementById("cmDir").addEventListener("click", e => {
        const b = e.target.closest(".seg-btn"); if (!b) return;
        document.querySelectorAll("#cmDir .seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active"); this.dir = b.dataset.v; this.sel = null;
        this.renderTop(); this.renderTable(); this.renderHhi();
      });
      document.getElementById("cmSearch").addEventListener("input", () => this.renderTable());
      this.renderTop(); this.renderTable(); this.renderHhi();
    },
    flagged() { return this.fy === "FY2023-24" && this.dir === "export"; },
    renderTop() {
      document.getElementById("cmFlag").hidden = !this.flagged();
      if (this.flagged()) {
        document.getElementById("cmFlag").innerHTML =
          `<strong>Source-side data warning — FY2023-24 exports:</strong> the sum of TradeStat chapter values for this year equals 2.000000× its own official total. ` +
          `Values below are shown exactly as published; interpret this year's rankings with care.`;
      }
      document.getElementById("cmTopTitle").textContent = this.dir + "s";
      document.getElementById("cmTblTitle").textContent = this.dir;
      document.getElementById("cmHhiDir").textContent = this.dir;
      const arr = D.chapters.byFY[this.fy][this.dir].slice(0, 10)
        .map(d => ({ name: d.n.length > 40 ? d.n.slice(0, 39) + "…" : d.n, value: d.v, code: d.c }));
      if (!this.sel) this.sel = arr.length ? arr[0].code : null;
      mountChart("cmTop", topBarOpt(arr, this.dir === "export" ? EXP_C : IMP_C, v => cr(v), {
        emphasis: { itemStyle: { opacity: 1 } }
      }));
      const c = CHARTS["cmTop"];
      if (c) c.off("click").on("click", p => {
        if (p.componentType === "series") {
          const item = D.chapters.byFY[this.fy][this.dir].find(x =>
            (x.n.length > 40 ? x.n.slice(0, 39) + "…" : x.n) === p.name || x.n === p.name);
          if (item) { this.sel = item.c; this.renderDetail(); }
        }
      });
      this.renderDetail();
    },
    renderDetail() {
      const code = this.sel;
      const row = code && D.chapters.byFY[this.fy][this.dir].find(x => x.c === code);
      const nameEl = document.getElementById("cmDetailName");
      if (!row) { nameEl.textContent = ""; return; }
      nameEl.textContent = `HS ${code} · ${row.n}`;
      // KPIs: value, share, growth vs previous FY
      const idx = FYS.indexOf(this.fy);
      const prevFy = idx > 0 ? FYS[idx - 1] : null;
      const prevRow = prevFy && D.chapters.byFY[prevFy][this.dir].find(x => x.c === code);
      const flaggedPrev = prevFy === "FY2023-24" && this.dir === "export";
      const g = (prevRow && prevRow.v > 0 && !flaggedPrev) ? (row.v / prevRow.v - 1) * 100 : null;
      const kpis = document.getElementById("cmDetailKpis");
      kpis.innerHTML = `
        <div class="detail-kpi"><div class="k">Value ${this.fy}</div><div class="v">${cr(row.v)}</div></div>
        <div class="detail-kpi"><div class="k">Share</div><div class="v">${row.s.toFixed(2)}%</div></div>
        <div class="detail-kpi"><div class="k">YoY${flaggedPrev ? " (n/a)" : ""}</div><div class="v" style="color:${g === null ? "var(--text-3)" : g >= 0 ? "var(--pos)" : "var(--neg)"}" ${flaggedPrev ? 'title="Prior-year item values carry the FY2023-24 source-side doubling"' : ""}>${g === null ? (flaggedPrev ? "n/a*" : "—") : pct(g, 1)}</div></div>`;
      // trend across all FYs
      const series = FYS.map(f => {
        const r = D.chapters.byFY[f][this.dir].find(x => x.c === code);
        return r ? r.v : null;
      });
      mountChart("cmTrend", baseOpt({
        tooltip: { trigger: "axis", valueFormatter: v => v == null ? "—" : cr(v) },
        xAxis: catAxis(FYS, { interval: 0, rotate: 32, fontSize: 9.5 }),
        yAxis: valAxis(),
        series: [{ type: "line", data: series, symbolSize: 6,
          lineStyle: { width: 2.4, color: this.dir === "export" ? EXP_C : IMP_C },
          itemStyle: { color: this.dir === "export" ? EXP_C : IMP_C },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: this.dir === "export" ? "rgba(45,212,191,0.15)" : "rgba(232,167,93,0.15)" },
                     { offset: 1, color: "rgba(0,0,0,0)" }] } } }]
      }));
      // hs4 drill-down
      const prefix = String(code);
      const lines = D.chapters.hs4_fy2024_25
        .filter(d => String(d.c).slice(0, 2) === prefix && (this.dir === "export" ? d.e : d.i) > 0)
        .sort((a, b) => (b[this.dir === "export" ? "e" : "i"]) - (a[this.dir === "export" ? "e" : "i"]))
        .slice(0, 6)
        .map(d => ({ name: "HS " + d.c + " " + (d.n.length > 26 ? d.n.slice(0, 25) + "…" : d.n), value: this.dir === "export" ? d.e : d.i }));
      document.getElementById("cmHs4Hint").textContent = lines.length
        ? "4-digit breakdown is from the FY2024-25 4-digit report."
        : "No 4-digit lines reported for this chapter in the FY2024-25 report.";
      if (lines.length) mountChart("cmHs4", topBarOpt(lines, "#8FA6C9", v => cr(v)));
      else { const el = document.getElementById("cmHs4"); if (CHARTS["cmHs4"]) { CHARTS["cmHs4"].dispose(); delete CHARTS["cmHs4"]; } el.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:var(--text-3);font-size:12px;">No 4-digit data for this chapter</div>'; }
    },
    renderHhi() {
      mountChart("cmHhi", baseOpt({
        tooltip: { trigger: "axis" },
        legend: legend(),
        xAxis: catAxis(FYS, { interval: 0 }),
        yAxis: valAxis({ axisLabel: { color: AX.c, fontSize: 11 } }),
        series: [
          { name: "Export HHI", type: "bar", barWidth: "34%", data: FYS.map(f => D.chapters.hhi[f].export),
            itemStyle: { color: EXP_C, opacity: 0.85, borderRadius: 2 } },
          { name: "Import HHI", type: "bar", barWidth: "34%", data: FYS.map(f => D.chapters.hhi[f].import),
            itemStyle: { color: IMP_C, opacity: 0.85, borderRadius: 2 } },
        ]
      }));
    },
    renderTable() {
      const q = (document.getElementById("cmSearch").value || "").toLowerCase();
      const arr = D.chapters.byFY[this.fy][this.dir]
        .filter(d => !q || d.n.toLowerCase().includes(q) || d.c.includes(q));
      document.getElementById("cmTable").innerHTML = `
        <table><thead><tr>
          <th class="num">#</th><th>HS</th><th>Chapter</th><th class="num">Value (₹ Cr)</th><th class="num">Share</th>
        </tr></thead><tbody>
        ${arr.slice(0, 120).map((d, i) => `
          <tr class="${this.flagged() ? "flag-row" : ""}" data-code="${d.c}" style="cursor:pointer">
            <td class="num muted">${i + 1}</td><td class="muted">${d.c}</td><td class="wrap">${d.n}</td>
            <td class="num">${nfIN1.format(d.v)}</td><td class="num">${d.s.toFixed(2)}%</td>
          </tr>`).join("")}
        </tbody></table>`;
      document.querySelector("#cmTable tbody").addEventListener("click", e => {
        const tr = e.target.closest("tr[data-code]");
        if (tr) { this.sel = tr.dataset.code; this.renderDetail();
          document.getElementById("cmDetailName").scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      });
    }
  };

  /* ============================================================
     COUNTRY & REGION
     ============================================================ */
  const countries = {
    dir: "export", fy: FY_LATEST, sel: null,
    flagged() { return this.fy === "FY2023-24" && this.dir === "export"; },
    init() {
      const selFy = document.getElementById("cnFy");
      selFy.innerHTML = [...FYS].reverse().map(f => `<option value="${f}" ${f === this.fy ? "selected" : ""}>${f}</option>`).join("");
      selFy.addEventListener("change", () => { this.fy = selFy.value; this.renderAll(); });
      document.getElementById("cnDir").addEventListener("click", e => {
        const b = e.target.closest(".seg-btn"); if (!b) return;
        document.querySelectorAll("#cnDir .seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active"); this.dir = b.dataset.v; this.sel = null; this.renderAll();
      });
      document.getElementById("cnSearch").addEventListener("input", () => this.renderTable());
      this.renderAll();
    },
    renderAll() {
      document.getElementById("cnFlag").hidden = !(this.fy === "FY2023-24" && this.dir === "export");
      if (this.fy === "FY2023-24" && this.dir === "export") {
        document.getElementById("cnFlag").innerHTML =
          `<strong>Source-side data warning — FY2023-24 exports:</strong> partner values for this year sum to 2.000000× the official total on TradeStat. Shown as published; interpret with care.`;
      }
      document.getElementById("cnTopTitle").textContent = this.dir + "s";
      document.getElementById("cnTblTitle").textContent = this.dir;
      document.getElementById("cnEvoDir").textContent = this.dir + "s";
      const arr = D.countries.byFY[this.fy][this.dir].slice(0, 10).map(d => ({ name: d.c, value: d.v }));
      if (!this.sel) this.sel = arr.length ? arr[0].name : null;
      mountChart("cnTop", topBarOpt(arr, this.dir === "export" ? EXP_C : IMP_C, v => cr(v)));
      const c = CHARTS["cnTop"];
      if (c) c.off("click").on("click", p => {
        if (p.componentType === "series") { this.sel = p.name; this.renderProfile(); }
      });
      // regions horizontal bar
      const regs = D.countries.regions[this.fy][this.dir].map(d => ({ name: sh(d.r), value: d.v }));
      mountChart("cnRegion", topBarOpt(regs, this.dir === "export" ? EXP_C : IMP_C, v => cr(v)));
      document.getElementById("cnRegionHint").textContent = this.fy + " · " + this.dir + "s";
      // evolution: top5 regions share across FYs
      const top5 = D.countries.regions[FY_LATEST][this.dir].slice(0, 5).map(d => d.r);
      const top5s = top5.map(r => sh(r));
      mountChart("cnEvolution", baseOpt({
        tooltip: { trigger: "axis", valueFormatter: v => v.toFixed(2) + "%" },
        legend: legend({ top: 0, left: 0 }),
        grid: { left: 8, right: 18, top: 60, bottom: 6, containLabel: true },
        xAxis: catAxis(FYS, { interval: 0 }),
        yAxis: valAxis({ axisLabel: { color: AX.c, fontSize: 11, formatter: "{value}%" } }),
        series: top5.map((r, i) => ({
          name: sh(r), type: "line", symbolSize: 5,
          data: FYS.map(f => { const x = D.countries.regions[f][this.dir].find(y => y.r === r); return x ? x.s : null; }),
          lineStyle: { width: 2 },
          itemStyle: { color: [EXP_C, IMP_C, "#8FA6C9", NEG_C, POS_C][i % 5] }
        }))
      }));
      this.renderProfile();
      this.renderTable();
    },
    renderProfile() {
      const color = this.dir === "export" ? EXP_C : IMP_C;
      if (this.sel) {
        // one country across FYs, exports vs imports
        const es = FYS.map(f => { const x = D.countries.byFY[f].export.find(y => y.c === this.sel); return x ? x.v : null; });
        const im = FYS.map(f => { const x = D.countries.byFY[f].import.find(y => y.c === this.sel); return x ? x.v : null; });
        mountChart("cnProfile", baseOpt({
          tooltip: { trigger: "axis", valueFormatter: v => v == null ? "—" : cr(v) },
          legend: legend(),
          xAxis: catAxis(FYS, { interval: 0 }),
          yAxis: valAxis(),
          series: [
            { name: "Exports to " + this.sel, type: "bar", data: es, barWidth: "34%",
              itemStyle: { color: EXP_C, borderRadius: [3, 3, 0, 0], opacity: 0.9 } },
            { name: "Imports from " + this.sel, type: "bar", data: im, barWidth: "34%",
              itemStyle: { color: IMP_C, borderRadius: [3, 3, 0, 0], opacity: 0.9 } },
          ]
        }));
      } else {
        const top = D.countries.byFY["FY2024-25"].export.slice(0, 8);
        const names = top.map(d => d.c);
        const imp = names.map(n => { const x = D.countries.byFY["FY2024-25"].import.find(y => y.c === n); return x ? x.v : 0; });
        mountChart("cnProfile", baseOpt({
          tooltip: { trigger: "axis", valueFormatter: v => cr(v) },
          legend: legend(),
          xAxis: catAxis(names, { rotate: 28, fontSize: 10 }),
          yAxis: valAxis(),
          series: [
            { name: "Exports FY2024-25", type: "bar", data: top.map(d => d.v), barWidth: "30%",
              itemStyle: { color: EXP_C, borderRadius: [3, 3, 0, 0], opacity: 0.9 } },
            { name: "Imports FY2024-25", type: "bar", data: imp, barWidth: "30%",
              itemStyle: { color: IMP_C, borderRadius: [3, 3, 0, 0], opacity: 0.9 } },
          ]
        }));
      }
    },
    renderTable() {
      const q = (document.getElementById("cnSearch").value || "").toLowerCase();
      const arr = D.countries.byFY[this.fy][this.dir]
        .filter(d => !q || d.c.toLowerCase().includes(q) || (D.countries.regionMap[d.c] || "").toLowerCase().includes(q));
      document.getElementById("cnTable").innerHTML = `
        <table><thead><tr>
          <th class="num">#</th><th>Country</th><th>Region</th><th class="num">Value (₹ Cr)</th><th class="num">Share</th>
        </tr></thead><tbody>
        ${arr.slice(0, 260).map((d, i) => `
          <tr class="${this.flagged() ? "flag-row" : ""}"><td class="num muted">${i + 1}</td>
          <td class="wrap">${d.c}</td><td class="muted">${D.countries.regionMap[d.c] || "—"}</td>
          <td class="num">${nfIN1.format(d.v)}</td><td class="num">${d.s.toFixed(2)}%</td></tr>`).join("")}
        </tbody></table>`;
    }
  };

  window.PAGES_A = { overview, trends, commodities, countries };
  window.DASHUTIL = { inr, cr, crS, pct, lakh, countUp, mountChart, baseOpt, catAxis, valAxis, legend, topBarOpt, CHARTS, EXP_C, IMP_C, NEG_C, POS_C, nfIN, nfIN1, FYS, FY_LATEST, kpiCard, growthChip };
})();
