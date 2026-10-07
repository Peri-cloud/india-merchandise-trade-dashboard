# Analysis and Prediction of India's Merchandise Trade

FDSA course project — interactive analytical dashboard built on **real data** retrieved
from TradeStat EIDB (Export Import Data Bank), Department of Commerce,
Ministry of Commerce & Industry, Government of India.
Retrieved 2026-10-06 · FY2018-19 → FY2025-26 (8 full fiscal years) · all values in ₹ Crore.

## Run it (offline, no internet needed)

```bash
cd india-trade-dashboard
python -m http.server 8080
# open http://localhost:8080
```

Double-clicking `index.html` also works — the dashboard is verified over both
`http://` and `file://`. ECharts 5.5.1 is vendored locally; all data is embedded
in `data/data.js`; zero external requests.

## What's inside

| Page | Content |
|---|---|
| Overview | KPIs, exports/imports trend, trade balance, provenance note |
| Trade Trends | Annual lines, diverging balance bars, sector mix, growth |
| Commodity Analysis | Top-10 animated rankings, HS2/HS4 drill-down by chapter |
| Country & Region | Partner rankings, regional composition, per-country drill-down |
| Statistics | Pearson/Spearman · ANOVA · Chi-square · Kruskal-Wallis tabs |
| Forecast | One-year-ahead predictions, FORECAST BEGINS marker, honest validation |
| Model Performance | Persistence vs Linear Regression vs Random Forest, time-aware backtest |
| Data Explorer | Browse/filter/download the underlying tables as CSV |
| Methodology | Retrieval protocol, audit, model protocol, limitations |
| Data Source | Provenance, SHA-256 metadata, data-quality report |

## Data integrity notes (read before presenting)

- Every number comes from the official TradeStat EIDB tables — nothing is simulated.
- **FY2023-24 defect:** partner/chapter *item-level* export values for FY2023-24 sum to
  2.000000× the official total on TradeStat itself. Values are shown exactly as published,
  affected views carry on-screen warning banners and flagged rows, and cross-sectional
  statistics exclude that year. National totals always use the official total row.
- FY2025-26 (year ended 31 Mar 2026) is the latest complete year and remains provisional.
- Forecasts are statistical exercises based on historical patterns — **not** official
  Government of India projections.

Full details: `FINAL_EXECUTION_REPORT.md` and `data_quality_report.txt`.
