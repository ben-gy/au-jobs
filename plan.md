# Site Plan: Regional Unemployment (AU)

## Overview
- **Name:** Regional Unemployment (AU)
- **Repo name:** au-jobs
- **Tagline:** Quarterly unemployment rates for every Australian local government area — 15 years of data, mapped and ranked.

## Target Audience
Job seekers, relocating families, economists, journalists, council/regional-development staff, and property researchers who want to know how the labour market is performing in a specific area — and how it compares to the state and nation.

## Value Proposition
The official SALM data lives in dense spreadsheets updated quarterly. This turns it into an interactive map + leaderboard + trend explorer where anyone can find their LGA's unemployment rate, see whether it's rising or falling, and compare 544 areas at a glance — something you can't do easily anywhere else.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| SALM Smoothed LGA (Jobs & Skills Australia / DEWR) | https://www.dewr.gov.au/employment-research/resources/salm-smoothed-lga-datafiles-asgs-2025 | Smoothed unemployment level, unemployment rate %, labour force by LGA, quarterly Dec-2010→Mar-2026 | Quarterly | No |
| ABS ASGS 2024 LGA boundaries | https://geo.abs.gov.au/arcgis/rest/services/ASGS2024/LGA/MapServer/0/query | Simplified LGA polygon geometry + codes + state | Annual | No |

## Key Features
1. **Choropleth map** — every LGA shaded by unemployment rate, click for detail (Leaflet + real ABS GeoJSON).
2. **Leaderboard** — LGAs ranked highest/lowest by rate, filter by state, labour-force weighted.
3. **Sortable table** — all 544 LGAs: rate, YoY change, unemployed persons, labour force, sparkline trend.
4. **Trends** — national + state unemployment-rate lines over 15 years, overlay any LGA.
5. **State comparison** — bar chart + state×quarter heatmap matrix.
6. **Distribution** — histogram of LGA rates showing spread and outliers.
7. **Insights** — auto-detected hotspots, fastest risers/improvers, hidden pockets of high unemployment.
8. **Drill-down panel** — per-LGA time series, rank, comparison to state/national medians, hash-linkable.

## Style Direction
**Tone:** civic / data-dense but approachable.
**Colour palette:** clean light theme, navy + teal civic accents, sequential amber→red ramp for the unemployment choropleth (higher = warmer). Trustworthy, official, readable.
**UI density:** balanced — dense tables and charts but generous whitespace in headers/cards.
**Theme:** light (civic/economic audience).
**Reference sites:** ABS data explorer, fuelaustralia.org (clean utility).

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite.
- **Data strategy:** pipeline (GitHub Actions, quarterly cron) → JSON in public/data/.
- **Key libraries:** Leaflet (map). Hand-rolled SVG for all charts.

## Layout
Fixed header (title, search, About/?). Left: view tabs. Main: active view fills width (max 1600px). Slide-in drill-down panel from right. Sticky footer with attribution + source + last-updated.

## Pages/Views
Single-page app, tab-switched views: Map, Leaderboard, Table, Trends, States, Distribution, Insights. Drill-down panel overlays any view.

## Visualization Strategy
- **Map (choropleth)** — where is unemployment high/low geographically; the headline view.
- **Leaderboard (ranked bars)** — who's worst/best right now; most newsworthy.
- **Table** — precise lookup + multi-metric sort/filter.
- **Trends (multi-line)** — how the rate has moved over 15 years nationally, by state, and per LGA.
- **State comparison (bars + heatmap matrix)** — state-level differences and their evolution over time.
- **Distribution (histogram)** — the spread of rates across LGAs and where the outliers sit.
- **Insights (cards)** — auto-surfaced anomalies: hotspots >2× national, fastest YoY risers, biggest improvers.
