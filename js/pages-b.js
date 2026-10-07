/* ============================================================
   pages-b.js — Statistics, Forecast, Models, Explorer,
                Methodology, Data Source
   ============================================================ */
(function () {
  "use strict";
  const D = window.DASH;
  const U = window.DASHUTIL;
  const { cr, crS, pct, countUp, mountChart, baseOpt, catAxis, valAxis, legend, topBarOpt,
          CHARTS, EXP_C, IMP_C, NEG_C, POS_C, nfIN, nfIN1, FYS, FY_LATEST, kpiCard } = U;
  const S = D.stats, F = D.forecast;

  /* ============================================================
     STATISTICS
     ============================================================ */
  const statistics = {
    inited: { corr: false, anova: false, chi: false, kw: false },
    init() {
      document.getElementById("stTabs").addEventListener("click", e => {
        const b = e.target.closest(".tab"); if (!b) return;
        document.querySelectorAll("#stTabs .tab").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        const t = b.dataset.t;
        document.querySelectorAll("#page-statistics .tabpane").forEach(p => p.hidden = true);
        document.getElementById("stp-" + t).hidden = false;
        this["render_" + t]();
      });
      document.getElementById("stNotice").innerHTML =
        `<strong>Protocol:</strong> cross-sectional tests use FY2024-25 (the reference year). FY2023-24 export item values are excluded from cross-sections because their sum equals 2.0× the official total on TradeStat (verified; see <a href="#/source">Data Source</a>). ` +
        `With only 8 annual observations, national-level p-values are indicative, not conclusive. No causal claims are made anywhere on this page.`;
      this.render_corr();
    },
    pfmt(p) { return p < 1e-4 ? p.toExponential(1) : p.toFixed(4); },
    fmtLog(v) {
      if (v >= 100000) return U.lakh(v);
      if (v >= 1000) return (v / 1000) + "K";
      return String(v);
    },
    card(title, rows, accent) {
      return `<div class="panel" style="margin-bottom:0">
        <div class="panel-head"><h2>${title}</h2></div>
        <div class="stat-list">${rows.map(r => `<div class="stat-row"><span class="stat-k">${r[0]}</span><span class="stat-v">${r[1]}</span></div>`).join("")}</div>
      </div>`;
    },
    render_corr() {
      if (this.inited.corr) return; this.inited.corr = true;
      const c = S.correlation, nat = c.national_export_import_full, nat2 = c.national_export_import_excl_2526, xs = c.chapter_cross_section;
      document.getElementById("stCorrCards").innerHTML =
        this.card("National series — n = 8 FY", [
          ["Pearson r", `<b>${nat.pearson_r}</b> · p = ${this.pfmt(nat.pearson_p)}`],
          ["Spearman rho", `<b>${nat.spearman_rho}</b> · p = ${this.pfmt(nat.spearman_p)}`],
          ["Sensitivity", `excluding FY2025-26: r = ${nat2.pearson_r}, ρ = ${nat2.spearman_rho} (n=7)`],
          ["Reading", "exports and imports moved together strongly across the period — expected for a growing economy; correlation is not causation"],
        ]) +
        this.card("Chapter cross-section — FY2024-25, n = 98", [
          ["Pearson r", `<b>${xs.pearson_r}</b> · p = ${xs.pearson_p.toExponential(2)}`],
          ["Spearman rho", `<b>${xs.spearman_rho}</b> · p = ${xs.spearman_p.toExponential(2)}`],
          ["Reading", "chapters with high exports also tend to have high imports (e.g. petroleum); the rank correlation is much lower — the very largest chapters drive the linear fit"],
        ]);
      // scatter: chapter x/y (log-log)
      const pts = c.chapter_cross_section_points;
      const ptData = pts.x.map((x, i) => ({ value: [x, pts.y[i]], code: pts.codes[i] }));
      mountChart("stScatter", baseOpt({
        tooltip: { formatter: p => `HS ${p.data.code}<br/>Exports: ${cr(p.value[0])}<br/>Imports: ${cr(p.value[1])}` },
        xAxis: Object.assign(valAxis({ name: "→ exports ₹ Cr (log scale)", nameLocation: "end",
          nameTextStyle: { color: "#97A5BB", fontSize: 11, align: "right" } }),
          { type: "log", min: 1, axisLabel: { color: "#64748B", fontSize: 11, formatter: v => this.fmtLog(v) } }),
        yAxis: Object.assign(valAxis({ name: "imports ₹ Cr (log) ↑", nameTextStyle: { color: "#97A5BB", fontSize: 11 } }),
          { type: "log", min: 1, axisLabel: { color: "#64748B", fontSize: 11, formatter: v => this.fmtLog(v) } }),
        series: [{ type: "scatter", data: ptData, symbolSize: 9,
          itemStyle: { color: EXP_C, opacity: 0.75, borderColor: "rgba(10,22,40,0.9)", borderWidth: 1 } }]
      }));
      // national scatter with FY labels
      const ns = c.national_series;
      mountChart("stNatScatter", baseOpt({
        tooltip: { formatter: p => `${p.data.fy}<br/>Exports: ${cr(p.value[0])}<br/>Imports: ${cr(p.value[1])}` },
        grid: { left: 10, right: 30, top: 30, bottom: 10, containLabel: true },
        xAxis: Object.assign(valAxis({ name: "→ exports ₹ Cr", nameLocation: "end",
          nameTextStyle: { color: "#97A5BB", fontSize: 11, align: "right" } }),
          { min: v => Math.floor(v.min / 100000) * 100000, axisLabel: { color: "#64748B", fontSize: 11, formatter: v => U.lakh(v) } }),
        yAxis: Object.assign(valAxis({ name: "imports ₹ Cr", nameTextStyle: { color: "#97A5BB", fontSize: 11 } }),
          { min: v => Math.floor(v.min / 100000) * 100000, axisLabel: { color: "#64748B", fontSize: 11, formatter: v => U.lakh(v) } }),
        series: [{ type: "scatter", symbolSize: 13, data: ns.fy.map((f, i) => ({
            value: [ns.export[i], ns.import[i]], fy: f,
            itemStyle: { color: i === ns.fy.length - 1 ? IMP_C : EXP_C, opacity: 0.85 } })),
          label: { show: true, position: "top", formatter: p => p.data.fy, color: "#97A5BB", fontSize: 10 },
          itemStyle: { color: EXP_C } }]
      }));
    },
    render_anova() {
      if (this.inited.anova) return; this.inited.anova = true;
      const a = S.anova;
      document.getElementById("stAnovaCards").innerHTML =
        this.card("One-way ANOVA — F test", [
          ["F statistic", `<b>F(${a.df_between}, ${a.df_within}) = ${a.F}</b>`],
          ["p-value", `${a.p.toExponential(2)} ${a.p < 0.05 ? "· significant at 5%" : "· not significant"}`],
          ["Effect size", `η² = <b>${a.eta_squared}</b> — region explains ${(a.eta_squared * 100).toFixed(1)}% of the variance in ln(trade value)`],
          ["Groups", `${a.n_groups} regions · ${a.n_obs} partner countries (FY2024-25)`],
          ["Response", "ln(total bilateral trade, ₹ Cr) — log transform pre-registered"],
        ]);
      const box = a.boxplot;
      mountChart("stBox", baseOpt({
        tooltip: { trigger: "item",
          formatter: p => { const d = p.data; return `<b>${d.region}</b><br/>n = ${d.n}<br/>max ${cr(d.max)}<br/>Q3 ${cr(d.q3)}<br/>median ${cr(d.median)}<br/>Q1 ${cr(d.q1)}<br/>min ${cr(d.min)}`; } },
        grid: { left: 10, right: 16, top: 20, bottom: 8, containLabel: true },
        xAxis: catAxis(box.map(d => d.region), { fontSize: 10, rotate: 26, interval: 0 }),
        yAxis: Object.assign(valAxis(), { type: "log", min: 0.5,
          axisLabel: { color: "#64748B", fontSize: 11, formatter: v => this.fmtLog(v) } }),
        series: [{ type: "boxplot",
          data: box.map(d => ({ value: [d.min, d.q1, d.median, d.q3, d.max], region: d.region, n: d.n })),
          itemStyle: { color: "rgba(45,212,191,0.15)", borderColor: EXP_C, borderWidth: 1.5 },
          boxWidth: [16, 34] }]
      }));
      document.getElementById("stAnovaTable").innerHTML = `
        <table><thead><tr><th>Region</th><th class="num">Partners (n)</th><th class="num">Median trade (₹ Cr)</th><th class="num">Max (₹ Cr)</th></tr></thead><tbody>
        ${box.map(d => `<tr><td>${d.region}</td><td class="num">${d.n}</td><td class="num">${nfIN1.format(d.median)}</td><td class="num">${nfIN1.format(d.max)}</td></tr>`).join("")}
        </tbody></table>`;
    },
    render_chi() {
      if (this.inited.chi) return; this.inited.chi = true;
      const c = S.chi_square, t = c.table;
      const rows = t.rows, cols = t.cols;
      const data = [];
      rows.forEach((r, i) => cols.forEach((cl, j) => data.push([j, i, t.values[i][j]])));
      const maxV = Math.max(...data.map(d => d[2]));
      mountChart("stChiHeat", baseOpt({
        tooltip: { formatter: p => `<b>${rows[p.value[1]]}</b> × ${cols[p.value[0]]}<br/>observed: <b>${p.value[2]}</b> partners<br/>expected: ${c.expected.values[p.value[1]][p.value[0]]}` },
        grid: { left: 10, right: 90, top: 30, bottom: 60, containLabel: true },
        xAxis: catAxis(cols, { interval: 0, fontSize: 10.5 }),
        yAxis: catAxis(rows, { fontSize: 10.5 }),
        visualMap: { min: 0, max: maxV, calculable: false, orient: "vertical", right: 4, top: "middle",
          inRange: { color: ["#132A44", "#1E5E63", "#2DD4BF"] },
          textStyle: { color: "#64748B", fontSize: 10 } },
        series: [{ type: "heatmap", data: data, label: { show: true, color: "#E4EAF3", fontSize: 12 },
          itemStyle: { borderColor: "rgba(10,22,40,0.9)", borderWidth: 2, borderRadius: 3 } }]
      }));
      document.getElementById("stChiCards").innerHTML =
        this.card("Chi-square — independence of region and trade profile", [
          ["χ² statistic", `<b>χ²(${c.df}) = ${c.chi2}</b>`],
          ["p-value", `${c.p.toFixed(4)} · ${c.p < 0.05 ? "significant at 5%" : "not significant"}`],
          ["Effect size", `Cramér's V = <b>${c.cramers_v}</b> (moderate association)`],
          ["Profile rule", c.profile_rule],
          ["Assumption", `all expected counts ≥ 5 — satisfied for this table (n = ${c.n})`],
        ]);
      const e = c.expected;
      document.getElementById("stChiTable").innerHTML = `
        <table><thead><tr><th>Region</th>${e.cols.map(cl => `<th class="num">${cl}</th>`).join("")}</tr></thead><tbody>
        ${e.rows.map((r, i) => `<tr><td>${r}</td>${e.values[i].map(v => `<td class="num">${v.toFixed(1)}</td>`).join("")}</tr>`).join("")}
        </tbody></table>`;
    },
    render_kw() {
      if (this.inited.kw) return; this.inited.kw = true;
      const k = S.kruskal_wallis;
      document.getElementById("stKwCards").innerHTML =
        this.card("Kruskal-Wallis — non-parametric check", [
          ["H statistic", `<b>H(${k.df}) = ${k.H}</b>`],
          ["p-value", `${k.p.toExponential(2)} · ${k.p < 0.05 ? "significant at 5%" : "not significant"}`],
          ["Effect size", `ε² = H/(n−1) = <b>${k.epsilon_squared}</b>`],
          ["Why", "does not assume normal groups; confirms the ANOVA conclusion that regional trade distributions differ"],
        ]);
      const box = S.anova.boxplot;
      const SH = { "Latin America & Caribbean": "Latin America & Carib.", "East & Southeast Asia": "E & SE Asia",
                   "Europe (Non-EU)": "Europe (non-EU)", "CIS & Central Asia": "CIS & C. Asia", "Other / Unspecified": "Other/Unspec." };
      mountChart("stKwBar", topBarOpt(box.map(d => ({ name: SH[d.region] || d.region, value: d.median })),
        "#8FA6C9", v => cr(v), { label: { show: true, position: "right", color: "#97A5BB", fontSize: 10.5,
          formatter: p => U.lakh(p.value) + " Cr" } }));
    }
  };

  /* ============================================================
     FORECAST
     ============================================================ */
  const forecast = {
    dir: "export",
    init() {
      document.getElementById("fcDir").addEventListener("click", e => {
        const b = e.target.closest(".seg-btn"); if (!b) return;
        document.querySelectorAll("#fcDir .seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active"); this.dir = b.dataset.v; this.render();
      });
      document.getElementById("fcNotice").innerHTML =
        `<strong>How to read this page:</strong> solid line = published history; dashed segment = model predictions for FY2025-26 made <em>without</em> seeing that year; markers = each model's prediction vs the published actual; right-edge hollow markers = FY2026-27 projection (no actual exists — clearly labelled, never validated). ` +
        `<strong>Disclaimer:</strong> ${D.meta.disclaimer}`;
      this.render();
    },
    render() {
      const t = this.dir, N = F.national[t];
      const hist = F.national.history.map(h => t === "export" ? h.export : h.import);
      const histFys = F.national.history.map(h => h.fy).filter(f => f <= "FY2024-25");
      const histV = hist.slice(0, histFys.length);
      const fysAll = [...histFys, "FY2025-26", "FY2026-27"];
      const colors = { Persistence: "#8FA6C9", "Linear Regression": NEG_C, "Random Forest": POS_C };
      const mainColor = t === "export" ? EXP_C : IMP_C;
      // history solid (up to FY2024-25 = last hist point), then dashed bridge to FY2025-26 actual
      const solid = histV;
      const actual = N.final_fy2025_26.Persistence.actual;
      const bridge = histFys.map((_, i) => (i === histFys.length - 1 ? histV[i] : null)).concat([actual, null]);
      const predSeries = Object.keys(N.final_fy2025_26).map(m => ({
        name: m, type: "scatter", symbolSize: 12, symbol: m === "Persistence" ? "diamond" : "circle",
        itemStyle: { color: colors[m], borderColor: "#0A1628", borderWidth: 1.5 },
        data: [[7, N.final_fy2025_26[m].predicted]],
        tooltip: { formatter: p => `<b>${m}</b> — FY2025-26<br/>predicted ${cr(p.value[1])}<br/>actual ${cr(actual)}<br/>error ${N.final_fy2025_26[m].pct_error}%` }
      }));
      const projSeries = Object.keys(N.projection_fy2026_27).map(m => ({
        name: m + " (proj)", type: "scatter", symbolSize: 10, symbol: "emptycircle",
        itemStyle: { color: colors[m] },
        data: [[8, N.projection_fy2026_27[m]]],
        tooltip: { formatter: p => `<b>${m}</b> — FY2026-27 projection<br/>${cr(p.value[1])}<br/><span style="color:#97A5BB">no published actual — unvalidated</span>` }
      }));
      mountChart("fcMain", baseOpt({
        animationDuration: 1100,
        tooltip: { trigger: "item" },
        legend: { show: false },
        xAxis: catAxis(fysAll, { interval: 0 }),
        yAxis: valAxis(),
        series: [
          { name: "History", type: "line", data: solid, symbolSize: 7, z: 5,
            lineStyle: { width: 3, color: mainColor }, itemStyle: { color: mainColor },
            areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: t === "export" ? "rgba(45,212,191,0.14)" : "rgba(232,167,93,0.14)" },
                       { offset: 1, color: "rgba(0,0,0,0)" }] } },
            markLine: { silent: true, symbol: "none",
              lineStyle: { color: "rgba(232,167,93,0.6)", type: "dashed", width: 1.5 },
              label: { formatter: "FORECAST BEGINS", color: "#E8A75D", fontSize: 10, position: "insideEndTop" },
              data: [{ xAxis: "FY2025-26" }] } },
          { name: "Published actual", type: "line", data: bridge, symbol: "circle", symbolSize: 9,
            lineStyle: { width: 2.5, color: mainColor, type: [2, 4], opacity: 0.9 },
            itemStyle: { color: mainColor, borderColor: "#0A1628", borderWidth: 2 }, z: 6 },
          ...predSeries, ...projSeries
        ]
      }));
      document.getElementById("fcLegend").innerHTML =
        `<span class="chip" style="--c:${mainColor}">${t === "export" ? "Exports" : "Imports"} — solid history · dotted link to published actual</span>` +
        `<span class="chip" style="--c:#8FA6C9">Persistence</span><span class="chip" style="--c:${NEG_C}">Linear Regression</span><span class="chip" style="--c:${POS_C}">Random Forest</span>` +
        `<span class="hint">hollow markers = FY2026-27 projection (unvalidated)</span>`;
      document.getElementById("fcMainTitle").textContent =
        (t === "export" ? "Exports" : "Imports") + " — history, FY2025-26 predictions, FY2026-27 projection";
      // cards
      const wrap = document.getElementById("fcCards");
      wrap.innerHTML = "";
      Object.keys(N.final_fy2025_26).forEach((m, i) => {
        const v = N.final_fy2025_26[m];
        const card = kpiCard("fck" + i, m, colors[m]);
        card.innerHTML = `<div class="kpi-label">${m} — FY2025-26</div>
          <div class="kpi-value" id="fckv${i}">₹0 Cr</div>
          <div class="kpi-sub">actual ${cr(v.actual)} · error <b class="${v.pct_error <= 10 ? "up" : "down"}">${v.pct_error}%</b></div>`;
        wrap.appendChild(card);
      });
      Object.keys(N.final_fy2025_26).forEach((m, i) => {
        countUp(document.getElementById("fckv" + i), N.final_fy2025_26[m].predicted, U.cr, 850 + i * 110);
      });
      // chapter table
      const rows = F.chapters.per_chapter_fy2025_26;
      document.getElementById("fcChTable").innerHTML = `
        <table><thead><tr><th>HS</th><th>Chapter</th><th class="num">Actual (₹ Cr)</th>
        <th class="num">Persistence</th><th class="num">Linear Reg.</th><th class="num">Random Forest</th><th class="num">RF error</th></tr></thead><tbody>
        ${rows.map(r => {
          const rfPred = r["pred_Random Forest"], lrPred = r["pred_Linear Regression"], pPred = r["pred_Persistence"];
          const rfErr = rfPred != null && r.actual_fy2025_26 ? Math.abs(rfPred - r.actual_fy2025_26) / r.actual_fy2025_26 * 100 : null;
          return `<tr><td class="muted">${r.hs_code}</td><td>${r.name.length > 46 ? r.name.slice(0, 45) + "…" : r.name}</td>
          <td class="num">${nfIN1.format(r.actual_fy2025_26)}</td>
          <td class="num">${nfIN1.format(pPred)}</td>
          <td class="num">${nfIN1.format(lrPred)}</td>
          <td class="num">${nfIN1.format(rfPred)}</td>
          <td class="num">${rfErr === null ? "—" : rfErr.toFixed(1) + "%"}</td></tr>`;
        }).join("")}
        </tbody></table>`;
    }
  };

  /* ============================================================
     MODEL PERFORMANCE
     ============================================================ */
  const models = {
    target: "export",
    init() {
      document.getElementById("moTarget").addEventListener("click", e => {
        const b = e.target.closest(".seg-btn"); if (!b) return;
        document.querySelectorAll("#moTarget .seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active"); this.target = b.dataset.v; this.render(true);
      });
      document.getElementById("moScatterHint").textContent = "diagonal = perfect prediction";
      this.findings();
      this.render(false);
    },
    data() {
      if (this.target === "chapter") {
        const pb = F.chapters.pooled_backtest;
        return {
          metrics: pb,
          scatter: F.chapters.scatter,
          imp: F.chapters.feature_importance_rf,
          impHint: "pooled across top-12 chapters",
          byYear: null
        };
      }
      const N = F.national[this.target];
      const byYear = {
        fys: N.backtest.Persistence.points.map(p => p.fy),
        actual: N.backtest.Persistence.points.map(p => p.actual),
        series: {}
      };
      Object.keys(N.backtest).forEach(m => {
        byYear.series[m] = N.backtest[m].points.map(p => p.predicted);
      });
      return {
        metrics: { Persistence: N.backtest.Persistence.metrics,
                   "Linear Regression": N.backtest["Linear Regression"].metrics,
                   "Random Forest": N.backtest["Random Forest"].metrics },
        scatter: Object.fromEntries(Object.keys(N.backtest).map(m => [m, {
          actual: N.backtest[m].points.map(p => p.actual),
          predicted: N.backtest[m].points.map(p => p.predicted) }])),
        imp: N.feature_importance_rf, impHint: "national " + this.target + " · fit on data through FY2024-25",
        byYear
      };
    },
    render(animate) {
      const d = this.data();
      const wrap = document.getElementById("moKpis");
      wrap.innerHTML = "";
      const names = Object.keys(d.metrics);
      const best = names.reduce((a, b) => d.metrics[a].mae_rc <= d.metrics[b].mae_rc ? a : b);
      names.forEach((m, i) => {
        const mt = d.metrics[m];
        const isBest = m === best;
        const card = kpiCard("mok" + i, m + (isBest ? " · best MAE" : ""), isBest ? EXP_C : "#556483");
        card.style.borderColor = isBest ? "rgba(45,212,191,0.4)" : "var(--line)";
        card.innerHTML = `<div class="kpi-label">${m}${isBest ? " — lowest MAE" : ""}</div>
          <div class="kpi-value" id="mokv${i}">₹0 Cr</div>
          <div class="kpi-sub">RMSE <b>${mt.rmse_rc == null ? "—" : nfIN.format(Math.round(mt.rmse_rc))} Cr</b> · R² <b>${mt.r2 === null ? "—" : mt.r2}</b> · n = ${mt.n}</div>`;
        wrap.appendChild(card);
      });
      names.forEach((m, i) => countUp(document.getElementById("mokv" + i), d.metrics[m].mae_rc, U.cr, 850 + i * 110));
      // scatter: 3 models
      const colors = { Persistence: "#8FA6C9", "Linear Regression": NEG_C, "Random Forest": POS_C };
      const allVals = [];
      const scatterSeries = names.map(m => ({
        name: m, type: "scatter", symbolSize: 11,
        itemStyle: { color: colors[m], opacity: 0.9, borderColor: "#0A1628", borderWidth: 1 },
        data: d.scatter[m].actual.map((a, i) => [a, d.scatter[m].predicted[i]])
      }));
      const minmax = [Infinity, -Infinity];
      names.forEach(m => d.scatter[m].actual.forEach(a => { minmax[0] = Math.min(minmax[0], a); minmax[1] = Math.max(minmax[1], a); }));
      mountChart("moScatter", baseOpt({
        tooltip: { formatter: p => `<b>${p.seriesName}</b><br/>actual ${cr(p.value[0])}<br/>predicted ${cr(p.value[1])}` },
        legend: legend({ data: ["Persistence", "Linear Regression", "Random Forest"] }),
        xAxis: Object.assign(valAxis({ name: "→ actual ₹ Cr", nameLocation: "end",
          nameTextStyle: { color: "#97A5BB", fontSize: 11, align: "right" } }),
          { min: v => Math.floor(v.min / 100000) * 100000, axisLabel: { color: "#64748B", fontSize: 11, formatter: v => U.lakh(v) } }),
        yAxis: Object.assign(valAxis({ name: "predicted ₹ Cr", nameTextStyle: { color: "#97A5BB", fontSize: 11 } }),
          { min: v => Math.floor(v.min / 100000) * 100000, axisLabel: { color: "#64748B", fontSize: 11, formatter: v => U.lakh(v) } }),
        series: [...scatterSeries, {
          type: "line", name: "perfect", silent: true, data: [[minmax[0], minmax[0]], [minmax[1], minmax[1]]],
          lineStyle: { type: "dashed", color: "rgba(148,163,184,0.35)", width: 1 }, symbol: "none",
          tooltip: { show: false } }]
      }));
      // by year (national) or pooled summary (chapter)
      if (d.byYear) {
        const s = Object.keys(d.byYear.series).map(m => ({
          name: m, type: "bar", barWidth: "16%", data: d.byYear.series[m],
          itemStyle: { color: colors[m], opacity: 0.85, borderRadius: 2 }
        }));
        mountChart("moBack", baseOpt({
          tooltip: { trigger: "axis", valueFormatter: v => cr(v) },
          legend: legend(),
          xAxis: catAxis(d.byYear.fys, { interval: 0 }),
          yAxis: valAxis(),
          series: [{ name: "Actual", type: "line", data: d.byYear.actual, symbolSize: 8, z: 5,
            lineStyle: { width: 2.5, color: this.target === "export" ? EXP_C : IMP_C },
            itemStyle: { color: this.target === "export" ? EXP_C : IMP_C } }, ...s]
        }));
      } else {
        // chapter mode: pooled MAE comparison bars per model
        const names2 = Object.keys(d.metrics);
        mountChart("moBack", baseOpt({
          tooltip: { trigger: "axis", valueFormatter: v => cr(v) },
          legend: legend(),
          xAxis: catAxis(["MAE (₹ Cr)", "RMSE (₹ Cr)"], { interval: 0 }),
          yAxis: valAxis(),
          series: names2.map(m => ({
            name: m, type: "bar", barWidth: "16%",
            data: [d.metrics[m].mae_rc, d.metrics[m].rmse_rc],
            itemStyle: { color: colors[m], opacity: 0.85, borderRadius: 2 }
          }))
        }));
      }
      // feature importance
      mountChart("moImp", topBarOpt(Object.entries(d.imp).map(([k, v]) => ({
        name: k.replace("_lag1", " (t−1)"), value: v * 100 })), EXP_C, v => v.toFixed(1) + "%", {
        label: { show: true, position: "right", color: "#97A5BB", fontSize: 10.5, formatter: p => p.value.toFixed(1) + "%" }
      }));
      document.getElementById("moImpHint").textContent = d.impHint + " · importance shares sum to 100%";
    },
    findings() {
      const N = F.national, C = F.chapters;
      document.getElementById("moFindings").innerHTML = [
        `<strong>Persistence wins at the national level.</strong> Pooled export MAE ${nfIN.format(Math.round(N.export.backtest.Persistence.metrics.mae_rc))} Cr vs ${nfIN.format(Math.round(N.export.backtest["Random Forest"].metrics.mae_rc))} Cr for Random Forest — no complex model beat the naive baseline on annual totals.`,
        `<strong>Random Forest wins at chapter granularity</strong> (R² ${C.pooled_backtest["Random Forest"].r2} vs ${C.pooled_backtest.Persistence.r2} for Persistence over ${C.pooled_backtest.Persistence.n} pooled points) — lag structure carries more signal within a chapter than across the whole economy.`,
        `<strong>OLS is unstable on this sample.</strong> With four collinear lag features and ≤6 training points per fold, Linear Regression extrapolates wildly at chapter level (R² ${C.pooled_backtest["Linear Regression"].r2}). Shown as-is — this is why regularisation or baselines matter on tiny samples.`,
        `<strong>Negative pooled R² nationally means worse than the mean predictor</strong> across a strongly trending period — an honest limitation of level-prediction with n≈8 annual observations.`,
        `<strong>Out-of-sample check (FY2025-26, never used in any fit):</strong> Persistence within ${N.export.final_fy2025_26.Persistence.pct_error}% (exports) and ${N.import.final_fy2025_26.Persistence.pct_error}% (imports) of published actuals.`,
        `Models are compared only against each other and the published actuals — accuracy claims like "97% accurate" are never made.`
      ].map(x => `<li>${x}</li>`).join("");
    }
  };

  /* ============================================================
     DATA EXPLORER
     ============================================================ */
  const explorer = {
    ds: "chapters", fy: FY_LATEST, q: "",
    init() {
      const selFy = document.getElementById("exFy");
      selFy.innerHTML = [...FYS].reverse().map(f => `<option value="${f}" ${f === this.fy ? "selected" : ""}>${f}</option>`).join("");
      selFy.addEventListener("change", () => { this.fy = selFy.value; this.render(); });
      document.getElementById("exDs").addEventListener("click", e => {
        const b = e.target.closest(".seg-btn"); if (!b) return;
        document.querySelectorAll("#exDs .seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active"); this.ds = b.dataset.v;
        selFy.disabled = this.ds === "hs4";
        this.render();
      });
      document.getElementById("exSearch").addEventListener("input", e => { this.q = e.target.value.toLowerCase(); this.render(); });
      document.getElementById("exDownload").addEventListener("click", () => this.download());
      this.render();
    },
    rows() {
      if (this.ds === "chapters") {
        const flag = this.fy === "FY2023-24";
        return D.chapters.byFY[this.fy].export.map(e => {
          const i = D.chapters.byFY[this.fy].import.find(x => x.c === e.c);
          return { a: e.c, b: e.n, c: e.v, d: i ? i.v : 0, e: e.s, flag };
        });
      }
      if (this.ds === "countries") {
        const flag = this.fy === "FY2023-24";
        return D.countries.byFY[this.fy].export.map(e => {
          const i = D.countries.byFY[this.fy].import.find(x => x.c === e.c);
          return { a: e.c, b: D.countries.regionMap[e.c] || "—", c: e.v, d: i ? i.v : 0, e: e.s, flag };
        });
      }
      return D.chapters.hs4_fy2024_25.map(d => ({ a: d.c, b: d.n, c: d.e, d: d.i, e: null, flag: false }));
    },
    render() {
      const heads = {
        chapters: ["HS code", "Chapter", "Exports (₹ Cr)", "Imports (₹ Cr)", "Export share"],
        countries: ["Country", "Region", "Exports (₹ Cr)", "Imports (₹ Cr)", "Export share"],
        hs4: ["HS4 code", "Description", "Exports FY2024-25 (₹ Cr)", "Imports FY2024-25 (₹ Cr)", ""],
      }[this.ds];
      let rows = this.rows().filter(r => !this.q || String(r.a).toLowerCase().includes(this.q) || String(r.b).toLowerCase().includes(this.q));
      const total = rows.length;
      rows = rows.slice(0, 400);
      document.getElementById("exTitle").textContent = { chapters: "HS chapters — " + this.fy, countries: "Countries — " + this.fy, hs4: "HS 4-digit lines — FY2024-25" }[this.ds];
      document.getElementById("exCount").textContent = `${nfIN.format(rows.length)} of ${nfIN.format(total)} rows`;
      document.getElementById("exMeta").innerHTML =
        `Values exactly as retrieved from TradeStat (₹ Crore, Indian grouping). ${this.fy === "FY2023-24" ? "<b>Export item values for FY2023-24 carry the known source-side doubling — see Data Source.</b>" : "No imputation or adjustment is applied."}`;
      document.getElementById("exTable").innerHTML = `
        <table><thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(r => `<tr class="${r.flag ? "flag-row" : ""}"><td class="muted">${r.a}</td><td class="wrap">${r.b}</td>
          <td class="num">${r.c == null ? "—" : nfIN1.format(r.c)}</td>
          <td class="num">${r.d == null ? "—" : nfIN1.format(r.d)}</td>
          <td class="num">${r.e == null ? "—" : r.e.toFixed(2) + "%"}</td></tr>`).join("")}
        </tbody></table>`;
      this._rows = rows;
    },
    download() {
      const heads = { chapters: ["hs_code", "chapter", "export_rc", "import_rc", "export_share_pct"], countries: ["country", "region", "export_rc", "import_rc", "export_share_pct"], hs4: ["hs4_code", "description", "export_rc_fy2024-25", "import_rc_fy2024-25", ""] }[this.ds];
      const esc = v => "," + String(v).replaceAll('"', '""') + ",";
      const csv = [heads.join(",")].concat(this._rows.map(r => [r.a, `"${String(r.b).replaceAll('"', '""')}"`, r.c ?? "", r.d ?? "", r.e ?? ""].join(","))).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `india-trade-${this.ds}-${this.ds === "hs4" ? "fy2024-25" : this.fy}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
    }
  };

  /* ============================================================
     METHODOLOGY
     ============================================================ */
  const methodology = {
    init() {
      const steps = [
        ["Retrieval", `Session-cookie + CSRF-token form submission against the four official TradeStat EIDB report endpoints (commodity & country × export & import), years FY2018-19→FY2025-26, ₹ Crore option, 1.3–2.2 s polite delay, 34 requests, 0 failures, raw HTML preserved with SHA-256 hashes.`],
        ["Parsing", `Server-rendered result tables parsed cell-by-cell; fiscal-year columns canonicalised; the second value column of each year-selection taken as authoritative, the first column of the next selection used as an independent cross-check (5,305 pairs, 0 mismatches).`],
        ["Cleaning & audit", `Type-safe numeric conversion, key-uniqueness checks, HS-code validation, zero/negative/missing scan, item-sum vs official-total reconciliation (this step caught the FY2023-24 export doubling), all recorded in data_quality_report.json/.txt.`],
        ["Analysis", `Descriptive aggregates (shares, HHI, CAGR) computed from the parsed values; four inferential tests run with scipy; every test reports statistic, degrees of freedom where applicable, p-value and an effect size.`],
        ["Modelling", `Lag-1 feature construction from real prior-year values; three models; expanding-window one-step-ahead backtest (FY2021-22→FY2024-25) plus true out-of-sample FY2025-26 validation; MAE/RMSE in ₹ Cr and unit-free R²; Persistence always reported as the baseline.`],
        ["Dashboard", `Pre-aggregated, rounded datasets embedded offline (data.js, ~0.5 MB); Apache ECharts vendored locally; the site runs from python -m http.server with no network access — no CDN, no fonts, no APIs.`],
      ];
      document.getElementById("pipe").innerHTML = steps.map(s => `<li><b>${s[0]}</b><span>${s[1]}</span></li>`).join("");
      document.getElementById("methLimitations").innerHTML = [
        `<li>Annual data only: 8 fiscal-year observations. National-level statistics (correlation n=8, model fits on ≤8 points) are structurally low-power; conclusions are framed accordingly.</li>`,
        `<li>FY2023-24 export item values are inflated 2.0× on the source itself; item-level views for that year are flagged on-screen and excluded from cross-sectional tests.</li>`,
        `<li>FY2025-26 is complete (year ended 31 Mar 2026) but remains provisional; official revisions may change values.</li>`,
        `<li>Region mapping is analyst-added and coarse; it is used for aggregation only, never for causal claims.</li>`,
        `<li>Forecasts use only lag-1 features — no macro covariates (exchange rates, oil prices, policy events) — so predictions will miss structural shocks.</li>`,
        `<li>2-digit HS chapters aggregate very different products; the 4-digit drill-down covers FY2024-25 only.</li>`
      ].join("");
    }
  };

  /* ============================================================
     DATA SOURCE
     ============================================================ */
  const source = {
    init() {
      document.getElementById("srcTable").innerHTML = `
        <table><tbody>
        <tr><td style="width:220px" class="muted">Publisher</td><td>${D.meta.source}</td></tr>
        <tr><td class="muted">Endpoints used</td><td>${D.meta.urls.map(u => `<code>${u.replace("https://", "")}</code>`).join("<br>")}</td></tr>
        <tr><td class="muted">Retrieved (IST)</td><td>${D.meta.retrieved.replace("T", " ").slice(0, 16)} IST</td></tr>
        <tr><td class="muted">Report options</td><td>Year: 2018-2019 … 2025-2026 · Level: 2-digit HS (+4-digit FY2024-25) · Currency: <b>₹ Crore</b> (option 1)</td></tr>
        <tr><td class="muted">Coverage</td><td>${D.meta.fy_range} · 98 chapters × ${FYS.length} years × 2 directions · ~240 partners × ${FYS.length} years × 2 directions · unit throughout: ₹ Crore</td></tr>
        <tr><td class="muted">Integrity</td><td>Raw HTML + parsed CSV kept under data/raw/ with SHA-256 hashes in data/metadata/dataset_metadata.json; ${D.quality.n_raw_files} raw files hashed</td></tr>
        </tbody></table>`;
      const rq = Array.isArray(D.quality.retrieval_requests) ? D.quality.retrieval_requests : [];
      const summ = D.quality.retrieval_summary || {};
      const agg = {};
      rq.forEach(r => { const k = r.report; agg[k] = (agg[k] || 0) + 1; });
      const totalReq = rq.length || summ.ok || 0;
      document.getElementById("srcLogHint").textContent = `${totalReq} successful requests · ${summ.failed ?? 0} failures · polite delay 1.3–2.2 s`;
      document.getElementById("srcLog").innerHTML = `
        <table><thead><tr><th>Report family</th><th class="num">Requests</th></tr></thead><tbody>
        ${Object.entries(agg).map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join("")}
        <tr><td><b>Total</b></td><td class="num"><b>${totalReq}</b></td></tr>
        </tbody></table>`;
      const c = D.quality.checks;
      document.getElementById("srcQuality").innerHTML = `
        <table><thead><tr><th>Audit check</th><th>Result</th></tr></thead><tbody>
        <tr><td>Cross-selection consistency</td><td>${c.cross_year_selection_consistency.checked_pairs} pairs, <b>${c.cross_year_selection_consistency["mismatches_gt_0.5pct"]}</b> mismatches &gt;0.5%</td></tr>
        <tr><td>Duplicate keys</td><td>${c.duplicate_chapter_keys} chapter · ${c.duplicate_country_keys} country</td></tr>
        <tr><td>Invalid HS-2 codes</td><td>${JSON.stringify(c.invalid_hs2_codes)}</td></tr>
        <tr><td>Zero / negative / missing values</td><td>${c.zero_value_chapter_rows} / ${c.negative_value_chapter_rows} / ${c.missing_chapter_values}</td></tr>
        <tr><td>Unspecified-partner share (exports FY2024-25)</td><td>${c.unspecified_value_share_pct["export_fy2024-25"]}% of total</td></tr>
        <tr><td>FY2025-26 completeness</td><td>exports +${c.fy2025_26_completeness["export_growth_vs_fy2024-25_pct"]}% / imports +${c.fy2025_26_completeness["import_growth_vs_fy2024-25_pct"]}% vs FY2024-25 — full-year figure, provisional</td></tr>
        <tr><td><b>Item-sum vs total flags</b></td><td><b>${JSON.stringify(c.item_sum_ratio_flags)}</b> — see below</td></tr>
        </tbody></table>`;
      document.getElementById("srcFlag").innerHTML =
        `<strong>Verified source-side defect — FY2023-24 exports:</strong> on TradeStat itself, the sum of chapter (and country) export values for FY2023-24 equals <b>2.000000×</b> the official total row (₹72,37,904.5 Cr vs ₹36,18,952.3 Cr), confirmed independently across two year-selections. ` +
        `This dashboard reproduces the source faithfully: national totals always use the official total row, item-level views for that year display an on-screen warning, and cross-sectional statistics exclude that year. No value has been altered, imputed or removed.`;
    }
  };

  window.PAGES_B = { statistics, forecast, models, explorer, methodology, source };
})();
