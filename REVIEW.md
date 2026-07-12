# Regional Unemployment (AU) — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-jobs/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-jobs.benrichardson.dev *(live after DNS + cert below)*

## What it is

An interactive explorer for the official **Small Area Labour Markets** dataset — the smoothed unemployment rate, unemployed persons, and labour force for all ~544 Australian local government areas, every quarter from December 2010 to March 2026. Seven views: a Leaflet choropleth map, leaderboard, sortable table, 15-year trend lines, state comparison + heatmap, distribution histogram, and auto-detected insights, plus a hash-linkable drill-down panel and a full glossary.

## DNS setup

Already provisioned via Cloudflare API during the build:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `au-jobs` | `ben-gy.github.io` | DNS only (grey cloud) |

If the TLS cert isn't live yet, trigger issuance:
```bash
gh api repos/ben-gy/au-jobs/pages -X PUT -f cname=""
sleep 3
gh api repos/ben-gy/au-jobs/pages -X PUT -f cname="au-jobs.benrichardson.dev"
```
