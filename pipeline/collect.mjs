// Collect raw source data for Regional Unemployment (AU).
// - SALM Smoothed LGA datafile (CSV) from Jobs & Skills Australia / DEWR.
//   The download URL is quarter-specific, so we scrape the resource page for
//   the current CSV link to stay correct across quarterly releases.
// - ABS ASGS 2024 LGA boundaries as simplified GeoJSON (server-side generalised).
//
// Writes raw files to pipeline/tmp/ for aggregate.mjs to consume.
// Pure Node 20+ (global fetch), no dependencies.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, 'tmp');

const SALM_RESOURCE_PAGE =
  'https://www.dewr.gov.au/employment-research/resources/salm-smoothed-lga-datafiles-asgs-2025';
const SALM_ORIGIN = 'https://www.dewr.gov.au';

const ABS_LGA_GEOJSON =
  'https://geo.abs.gov.au/arcgis/rest/services/ASGS2024/LGA/MapServer/0/query' +
  '?where=1%3D1&outFields=LGA_CODE_2024,LGA_NAME_2024,STATE_NAME_2021' +
  '&returnGeometry=true&maxAllowableOffset=0.008&geometryPrecision=4&f=geojson&resultRecordCount=4000';

// Browser-like headers: some gov servers tarpit or hang on non-browser
// User-Agents, which makes undici's fetch time out where curl succeeds.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
};

async function fetchText(url, { retries = 4, timeoutMs = 60000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      console.warn(`  attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastErr;
}

async function resolveSalmCsvUrl() {
  console.log('Resolving latest SALM LGA CSV link...');
  const html = await fetchText(SALM_RESOURCE_PAGE);
  // Match the download link that ends in /csv, e.g.
  // /download/17069/salm-smoothed-lga-datafiles-asgs-2025-march-quarter-2026/43119/.../csv
  const match = html.match(/href="(\/download\/[^"]*?\/csv)"/i);
  if (!match) throw new Error('Could not find SALM CSV download link on resource page');
  const url = SALM_ORIGIN + match[1].replace(/&amp;/g, '&');
  console.log(`  -> ${url}`);
  return url;
}

async function main() {
  await mkdir(TMP, { recursive: true });

  const csvUrl = await resolveSalmCsvUrl();
  console.log('Downloading SALM LGA CSV...');
  const csv = await fetchText(csvUrl);
  await writeFile(join(TMP, 'salm-lga.csv'), csv);
  console.log(`  saved salm-lga.csv (${(csv.length / 1024).toFixed(0)} KB)`);

  console.log('Downloading ABS LGA GeoJSON...');
  const geojson = await fetchText(ABS_LGA_GEOJSON);
  // Validate it parses and looks like a FeatureCollection.
  const parsed = JSON.parse(geojson);
  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('ABS response was not a FeatureCollection');
  }
  await writeFile(join(TMP, 'lga.geojson'), geojson);
  console.log(`  saved lga.geojson (${parsed.features.length} features, ${(geojson.length / 1024).toFixed(0)} KB)`);

  console.log('Collect complete.');
}

main().catch((err) => {
  console.error('Collect failed:', err);
  process.exit(1);
});
