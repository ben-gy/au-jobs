// Aggregate raw SALM + ABS data into the JSON the frontend consumes.
// Reads pipeline/tmp/{salm-lga.csv,lga.geojson}; writes public/data/{lgas.json,meta.json,lga.geojson}.
// Pure Node, no dependencies.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, 'tmp');
const OUT = join(__dirname, '..', 'public', 'data');

const STATE_BY_PREFIX = {
  '1': { code: 'NSW', name: 'New South Wales' },
  '2': { code: 'VIC', name: 'Victoria' },
  '3': { code: 'QLD', name: 'Queensland' },
  '4': { code: 'SA', name: 'South Australia' },
  '5': { code: 'WA', name: 'Western Australia' },
  '6': { code: 'TAS', name: 'Tasmania' },
  '7': { code: 'NT', name: 'Northern Territory' },
  '8': { code: 'ACT', name: 'Australian Capital Territory' },
  '9': { code: 'OT', name: 'Other Territories' },
};

// Parse a single CSV line respecting double-quoted fields (which may contain commas).
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// "1,671" -> 1671 ; "5.2" -> 5.2 ; "-" / "" -> null
function parseNum(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/,/g, '');
  if (s === '' || s === '-' || s === 'n.a.' || s === 'na') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function stateForCode(code) {
  return STATE_BY_PREFIX[String(code)[0]] || { code: 'OT', name: 'Other Territories' };
}

const STATE_NAME_BY_CODE = Object.fromEntries(
  Object.values(STATE_BY_PREFIX).map((s) => [s.code, s.name]),
);

async function main() {
  console.log('Reading raw files...');
  const csvText = await readFile(join(TMP, 'salm-lga.csv'), 'utf8');
  const geojson = JSON.parse(await readFile(join(TMP, 'lga.geojson'), 'utf8'));

  const lines = csvText.split(/\r?\n/);
  // Find header row (starts with "Data Item").
  const headerIdx = lines.findIndex((l) => /^"?Data Item"?,/.test(l));
  if (headerIdx === -1) throw new Error('Could not locate header row in SALM CSV');
  const header = parseCsvLine(lines[headerIdx]);
  // Columns: 0 Data Item, 1 LGA name, 2 LGA code, 3.. quarters
  const quarters = header.slice(3).map((q) => q.trim()).filter(Boolean);
  const qCount = quarters.length;
  console.log(`Quarters: ${quarters[0]} .. ${quarters[qCount - 1]} (${qCount})`);

  // Accumulate per-LGA series keyed by code.
  const lgaMap = new Map();
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cols = parseCsvLine(line);
    const item = cols[0].trim();
    const name = cols[1].trim();
    const code = cols[2].trim();
    if (!code || !name) continue;
    const series = [];
    for (let q = 0; q < qCount; q++) series.push(parseNum(cols[3 + q]));

    let rec = lgaMap.get(code);
    if (!rec) {
      const st = stateForCode(code);
      rec = { code, name, state: st.code, stateName: st.name };
      lgaMap.set(code, rec);
    }
    if (/unemployment rate/i.test(item)) rec.rateSeries = series;
    else if (/labour force/i.test(item)) rec.labourForceSeries = series;
    else if (/unemployment/i.test(item)) rec.unemployedSeries = series;
  }

  const lgas = [];
  const lastIdx = qCount - 1;
  const yoyIdx = qCount - 5; // 4 quarters earlier
  for (const rec of lgaMap.values()) {
    const rateSeries = rec.rateSeries || new Array(qCount).fill(null);
    const unemployedSeries = rec.unemployedSeries || new Array(qCount).fill(null);
    const labourForceSeries = rec.labourForceSeries || new Array(qCount).fill(null);
    const rate = rateSeries[lastIdx];
    // Skip LGAs with no current data at all (e.g. permanently suppressed).
    if (rate == null && unemployedSeries[lastIdx] == null) continue;
    lgas.push({
      code: rec.code,
      name: rec.name,
      state: rec.state,
      rate,
      prevYearRate: yoyIdx >= 0 ? rateSeries[yoyIdx] : null,
      unemployed: unemployedSeries[lastIdx],
      labourForce: labourForceSeries[lastIdx],
      // full series (rounded) for sparklines / trends / detail panel
      rateSeries: rateSeries.map((v) => (v == null ? null : Math.round(v * 10) / 10)),
      unemployedSeries,
      // keep for aggregation only; stripped before writing lgas.json
      _labourForceSeries: labourForceSeries,
    });
  }
  lgas.sort((a, b) => a.name.localeCompare(b.name));
  console.log(`LGAs with data: ${lgas.length}`);

  // National + state aggregates: rate = sum(unemployed) / sum(labourForce) per quarter.
  const national = { unemployed: [], labourForce: [], rate: [] };
  const stateAgg = new Map(); // code -> { name, unemployed[], labourForce[] }
  for (let q = 0; q < qCount; q++) {
    let natU = 0;
    let natL = 0;
    for (const lga of lgas) {
      const u = lga.unemployedSeries[q];
      const l = lga._labourForceSeries[q];
      if (u != null && l != null) {
        natU += u;
        natL += l;
        let sa = stateAgg.get(lga.state);
        if (!sa) {
          sa = { name: STATE_NAME_BY_CODE[lga.state] || lga.state, unemployed: new Array(qCount).fill(0), labourForce: new Array(qCount).fill(0) };
          stateAgg.set(lga.state, sa);
        }
        sa.unemployed[q] += u;
        sa.labourForce[q] += l;
      }
    }
    national.unemployed.push(natU);
    national.labourForce.push(natL);
    national.rate.push(natL > 0 ? Math.round((natU / natL) * 1000) / 10 : null);
  }

  const states = {};
  const STATE_ORDER = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT', 'OT'];
  for (const [code, sa] of stateAgg) {
    const rate = sa.labourForce.map((l, q) =>
      l > 0 ? Math.round((sa.unemployed[q] / l) * 1000) / 10 : null,
    );
    states[code] = {
      code,
      name: sa.name,
      rate,
      unemployed: sa.unemployed,
      labourForce: sa.labourForce,
    };
  }

  // Per-state latest summary + LGA counts + median LGA rate.
  const stateSummaries = STATE_ORDER.filter((c) => states[c]).map((code) => {
    const s = states[code];
    const inState = lgas.filter((l) => l.state === code && l.rate != null).map((l) => l.rate);
    inState.sort((a, b) => a - b);
    const median = inState.length ? inState[Math.floor(inState.length / 2)] : null;
    return {
      code,
      name: s.name,
      rate: s.rate[lastIdx],
      unemployed: s.unemployed[lastIdx],
      labourForce: s.labourForce[lastIdx],
      lgaCount: lgas.filter((l) => l.state === code).length,
      medianRate: median,
    };
  });

  // Strip aggregation-only field before writing.
  for (const l of lgas) delete l._labourForceSeries;

  const generatedAt = new Date().toISOString();
  const meta = {
    generatedAt,
    quarters,
    latestQuarter: quarters[lastIdx],
    prevYearQuarter: yoyIdx >= 0 ? quarters[yoyIdx] : null,
    lgaCount: lgas.length,
    national,
    states,
    stateSummaries,
    source: {
      salm: 'Small Area Labour Markets (Smoothed), Jobs and Skills Australia / DEWR',
      salmUrl: 'https://www.dewr.gov.au/employment-research/small-area-labour-markets',
      boundaries: 'ABS ASGS 2024 Local Government Areas',
      boundariesUrl:
        'https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs',
    },
  };

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'lgas.json'), JSON.stringify(lgas));
  await writeFile(join(OUT, 'meta.json'), JSON.stringify(meta));
  await writeFile(join(OUT, 'lga.geojson'), JSON.stringify(geojson));

  const matched = new Set(geojson.features.map((f) => String(f.properties.lga_code_2024)));
  const mapCoverage = lgas.filter((l) => matched.has(l.code)).length;
  console.log(`Wrote lgas.json (${lgas.length} LGAs), meta.json, lga.geojson`);
  console.log(`Map coverage: ${mapCoverage}/${lgas.length} LGAs matched to a boundary`);
  console.log(`National unemployment rate (${meta.latestQuarter}): ${national.rate[lastIdx]}%`);
  console.log('Aggregate complete.');
}

main().catch((err) => {
  console.error('Aggregate failed:', err);
  process.exit(1);
});
