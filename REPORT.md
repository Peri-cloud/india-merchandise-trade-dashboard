# FINAL EXECUTION REPORT
## Analysis and Prediction of India's Merchandise Trade (FDSA Project)

**Deliverable:** `india-trade-dashboard/` — a fully offline, interactive analytical dashboard.
**Run it:** `cd india-trade-dashboard && python -m http.server 8080` → open `http://localhost:8080`
(also works by double-clicking `index.html` — verified over both `http://` and `file://`).

---

## 1. Data retrieval (real, live, verifiable)

| Item | Result |
|---|---|
| Source | TradeStat EIDB, Dept. of Commerce, Ministry of Commerce & Industry, Govt. of India |
| Endpoints | commodity_wise_export / commodity_wise_import / country_wise_export / country_wise_import |
| Method | Session cookie + CSRF (`_token`) form POST, server-rendered table parsing |
| Report options | 2-digit HS (all years) + 4-digit HS (FY2024-25), currency = **₹ Crore** (option 1) |
| Year coverage | FY2018-19 → FY2025-26 (all 8 years available on the site and downloaded) |
| Requests | **34 planned, 34 succeeded, 0 failures** (polite delay 1.3–2.2 s, retries ×3) |
| Raw evidence | 34 raw HTML + parsed CSV files under `data/raw/`, SHA-256 hashed in `data/metadata/dataset_metadata.json` |

**Volume retrieved:** 98 HS chapters × 8 FYs × 2 directions · ~240 partners × 8 FYs × 2 directions · 1,227 + 1,218 four-digit lines.

## 2. Key figures from the official total rows (₹ Crore)

| FY | Exports | Imports | Balance |
|---|---|---|---|
| FY2018-19 | 23,07,726 | 35,94,675 | −12,86,948 |
| FY2020-21 | 21,59,043 | 29,15,958 | −7,56,914 |
| FY2022-23 | 36,21,550 | 57,49,801 | −21,28,251 |
| FY2024-25 | 37,03,412 | 60,98,210 | −23,94,798 |
| FY2025-26 | 39,01,153 | 68,56,808 | −29,55,655 |

CAGR FY2018-19→FY2025-26: exports 7.79%, imports 9.66%. FY2025-26 is complete (year ended 31 Mar 2026) but provisional.

## 3. Data quality audit (caught a real source-side defect)

- **Cross-selection consistency:** 5,305 pairs checked, **0 mismatches** (>0.5%).
- **Commodity vs country report totals:** identical (0.0 rel. diff) for all 8 years, both directions.
- **Duplicates:** 0 · **Invalid HS codes:** 0 · **Zero/negative/missing values:** 0 / 0 / 0.
- **⚠ FLAG:** FY2023-24 **export** item values sum to **2.000000×** the official total on TradeStat itself (verified independently across two year-selections, both commodity and country reports). Handling: values shown exactly as published; on-screen warning banners on affected views; YoY-vs-FY2023-24 suppressed with "n/a*"; cross-sectional statistics exclude that year; national totals always use the official total row. No value was altered, imputed or removed.

## 4. Statistical tests (all on real retrieved data)

| Test | Result |
|---|---|
| Pearson (national exports vs imports, n=8) | r = 0.9803, p = 1.9e-05 · Spearman ρ = 1.0 |
| Sensitivity (excl. FY2025-26, n=7) | r = 0.9863, ρ = 1.0 |
| Pearson/Spearman (98 chapters, FY2024-25) | r = 0.8989 (p=3.6e-36) · ρ = 0.6347 (p=2.3e-12) |
| One-way ANOVA (ln trade by region, n=225) | F(9,215) = 11.906, p = 3.6e-15, **η² = 0.3326** |
| Chi-square (region × trade profile, n=225) | χ²(7) = 18.074, p = 0.0116, **Cramér's V = 0.2834**, all E≥5 |
| Kruskal-Wallis (same groups) | H(9) = 72.099, p = 5.9e-12, **ε² = 0.3219** |

## 5. Forecasting models (time-aware; time series never shuffled)

Features (lag-1 only): `export_lag1, import_lag1, balance_lag1, export_share_lag1`.
Protocol: expanding-window one-step-ahead backtest FY2021-22→FY2024-25 (pooled metrics) + true out-of-sample FY2025-26 validation (models refit on data through FY2024-25 only) + FY2026-27 projection (unvalidated, labelled).

**National exports — pooled backtest (n=4):**

| Model | MAE (₹ Cr) | RMSE (₹ Cr) | R² |
|---|---|---|---|
| **Persistence (best)** | **3,87,391** | **5,49,641** | −5.267 |
| Linear Regression | 18,49,630 | 22,87,262 | −107.52 |
| Random Forest | 9,66,291 | 10,15,235 | −20.38 |

**National imports — pooled backtest (n=4):** Persistence MAE 8,79,954 (best) · RF 16,80,131 · LR 46,40,796.

**Top-12 chapters — pooled backtest (n=36):**

| Model | MAE (₹ Cr) | RMSE (₹ Cr) | R² |
|---|---|---|---|
| Persistence | 1,50,037 | 2,32,216 | 0.2237 |
| Linear Regression | 48,99,442 | 1,85,38,907 | −4946.80 |
| **Random Forest (best)** | **1,33,234** | **2,16,562** | **0.3248** |

**Out-of-sample FY2025-26 (exports):** Persistence +5.07% error · RF +9.59% · LR +10.35%.
**Out-of-sample FY2025-26 (imports):** Persistence +11.06% · RF +18.92% · LR +21.64%.
RF feature importance (chapter level): export_lag1 0.3399, import_lag1 0.3012, balance_lag1 0.2245, export_share_lag1 0.1344.

**Honest conclusions:** Persistence is the strongest model for national annual totals; Random Forest is the only model that beats Persistence at chapter granularity; OLS with 4 collinear features on ≤6 training points extrapolates wildly (shown as-is, with explanation). No "X% accurate" claims are made anywhere.

## 6. Dashboard test checklist (executed in headless Chromium)

- [x] 10/10 pages load with zero console errors (Overview, Trends, Commodities, Country & Region, Statistics×4 tabs, Forecast, Model Performance×3 targets, Data Explorer×3 datasets, Methodology, Data Source)
- [x] All filters live: direction toggles, FY selectors, dataset tabs, search boxes, series segment
- [x] Top-10 rank-reorder animation on year/direction switch (same chart instance, 850 ms cubic-out)
- [x] Forecast line: solid history → dotted link → published actual; FORECAST BEGINS marker; dashed predictions; hollow FY2026-27 projections
- [x] KPI count-up (overview, trends, forecast cards, model metrics on switch)
- [x] Sidebar active indicator slides; hash router; keyboard ←/→ navigation; focus-visible styles; skip-link; aria-current
- [x] Click-throughs: bar → chapter drill-down (trend + 4-digit lines), partner → per-country export/import history
- [x] Data Explorer: browse/filter/download CSV (client-side Blob)
- [x] Responsive verified at 1366×768, 1920×1080, 1024, 390 px (mobile top-bar layout)
- [x] **Offline:** runs over `file://` with no network; `python -m http.server` verified; ECharts vendored locally (no CDN); data embedded in `data/data.js` (~0.5 MB)
- [x] `prefers-reduced-motion` respected (all animations disabled)
- [x] ₹ Crore + Indian digit grouping everywhere (`₹39,01,153 Cr`); axes in compact Lakh-Cr with a stated legend; R² unit-free

## 7. Files

```
india-trade-dashboard/
├── index.html                  10-page shell (semantic, accessible)
├── css/styles.css              dark-navy design system
├── js/app.js                   router + nav indicator + reveals
├── js/pages-a.js               helpers + Overview/Trends/Commodities/Countries
├── js/pages-b.js               Statistics/Forecast/Models/Explorer/Methodology/Source
├── data/data.js                embedded dataset (window.DASH, pre-aggregated)
├── assets/echarts.min.js       Apache ECharts 5.5.1, vendored for offline use
├── data_quality_report.json/.txt   full audit
└── totals.csv                  official totals FY2017-18→FY2025-26

Project tree (outside the package):
scripts/    probe, downloader, ETL, statistics, forecast, dashboard-data builder
data/raw/   34 raw HTML + CSV evidences (SHA-256 in data/metadata/)
data/processed/  tidy CSVs + statistics.json + forecast.json + quality report
data/metadata/   retrieval manifest + dataset metadata (hashes)
```

## 8. Disclaimers

Forecasts are statistical exercises based on historical trade patterns — **not** official forecasts of the Government of India. Region mapping is analyst-added (UN M49-inspired) for aggregation only. All statistics are descriptive/inferential summaries of retrieved values; nothing on the dashboard implies causation.
