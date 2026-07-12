# Regional Unemployment (AU)

**Quarterly unemployment rates for every Australian local government area — 15 years of data, mapped, ranked and charted.**

🔗 **Live:** [https://au-jobs.benrichardson.dev](https://au-jobs.benrichardson.dev)

## What is this?

Regional Unemployment (AU) turns the official **Small Area Labour Markets (SALM)** dataset from Jobs and Skills Australia into an interactive explorer. For every one of ~544 local government areas (LGAs), it shows the smoothed unemployment rate, the number of people out of work, and the size of the labour force — every quarter from December 2010 to the latest release.

The raw SALM data ships as a dense spreadsheet updated four times a year. This site makes it usable: a choropleth map of the whole country, leaderboards of the best and worst areas, a searchable table of all 544 LGAs, 15-year trend lines by state, a distribution histogram, and a panel of automatically-detected insights (hotspots, fast risers, big improvers). National and state figures are aggregated from the LGA data, weighted by labour force.

Every domain term has an inline glossary tooltip, so you don't need to know what "smoothed" or "labour force" means before you start.

## Who is this for?

Job seekers and families weighing up a move, economists and journalists tracking regional labour markets, council and regional-development staff benchmarking their area, and property researchers who want an economic read on a region. Anyone who has ever wondered "how's the job market where I live — and is it getting better or worse?"

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| [Small Area Labour Markets (Smoothed)](https://www.dewr.gov.au/employment-research/small-area-labour-markets), Jobs and Skills Australia / DEWR | Unemployment level, unemployment rate, and labour force by LGA, quarterly | Quarterly |
| [ABS ASGS 2024 Local Government Areas](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs) | LGA boundary polygons (simplified GeoJSON) for the choropleth map | Annually |

## Features

- **Choropleth map** — every LGA shaded by its unemployment rate on an interactive Leaflet map, hover for detail, click for a full profile.
- **Leaderboard** — the highest and lowest areas, filterable by jurisdiction and minimum labour-force size.
- **Sortable table** — all 544 LGAs with rate, year-on-year change, unemployed persons, labour force, and a 15-year sparkline.
- **Trends** — national and state unemployment-rate lines over 15 years with a toggleable legend.
- **States** — per-jurisdiction summary cards, a ranked bar chart, and a state × quarter heatmap.
- **Distribution** — a histogram of LGA rates that exposes the long tail of entrenched joblessness.
- **Insights** — auto-detected hotspots, areas at double the national rate, fastest risers and improvers.
- **Drill-down panel** — per-LGA profile with rank, comparison to state/national, and a full time series; hash-linkable.

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Testing:** Vitest
- **Map:** Leaflet + real ABS GeoJSON boundaries
- **Charts:** hand-rolled SVG (no chart library)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline → JSON in `public/data/`

## Local Development

```bash
# Install dependencies
npm install

# Refresh the data (downloads SALM CSV + ABS boundaries, rebuilds JSON)
npm run data

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview
```

## How it works

A GitHub Actions pipeline (`pipeline/collect.mjs` + `pipeline/aggregate.mjs`) runs on a schedule: it scrapes the current SALM LGA CSV link from the DEWR resource page, downloads the CSV and a simplified LGA boundary GeoJSON from the ABS ArcGIS service, then parses and aggregates everything into three static files — `lgas.json`, `meta.json`, and `lga.geojson` — committed to `public/data/`. The frontend loads those at runtime; all analysis (rankings, insights, distribution) happens client-side from pure, unit-tested functions. There is no server.

## License

MIT
