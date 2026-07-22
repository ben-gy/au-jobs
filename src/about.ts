// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Dataset } from './types';
import { formatQuarter, relativeTime } from './format';
import { glossaryLink } from './glossary';

export function openAbout(data: Dataset) {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const { meta } = data;
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="About this site">
      <button class="modal-close" aria-label="Close">×</button>
      <h2>About Regional Unemployment (AU)</h2>
      <p>This site maps the <strong>smoothed unemployment rate</strong> for every Australian ${glossaryLink('lga', 'local government area')} — around ${meta.lgaCount} councils — using the official ${glossaryLink('salm', 'Small Area Labour Markets')} series from Jobs and Skills Australia.</p>

      <h3>What the data shows</h3>
      <p>For each LGA you get the ${glossaryLink('smoothed', 'smoothed')} ${glossaryLink('unemployment-rate', 'unemployment rate')}, the number of unemployed people, and the size of the ${glossaryLink('labour-force', 'labour force')}, every quarter from ${formatQuarter(meta.quarters[0])} to ${formatQuarter(meta.latestQuarter)}. State and national figures are aggregated from the LGA data, weighted by labour force.</p>

      <h3>Why "smoothed"?</h3>
      <p>Small-area estimates bounce around a lot quarter to quarter. Jobs and Skills Australia publishes a four-quarter moving average — the smoothed series used here — which is far more reliable for spotting genuine trends. A single quarter's figure should never be read in isolation.</p>

      <h3>How to read it</h3>
      <ul>
        <li><strong>Map</strong> — a ${glossaryLink('choropleth', 'choropleth')}: darker red means higher unemployment.</li>
        <li><strong>Leaderboard</strong> — the highest and lowest areas, filterable by state and labour-force size.</li>
        <li><strong>Insights</strong> — automatically detected hotspots, fast risers and improvers.</li>
        <li><strong>Year-on-year</strong> change compares against the same quarter a year earlier to avoid seasonal noise.</li>
      </ul>

      <h3>Caveats</h3>
      <ul>
        <li>ABS LGA boundaries are statistical approximations and don't exactly match legal council boundaries.</li>
        <li>Estimates for very small or remote areas are suppressed by the source when the labour force is too small to model reliably — these show as "no data".</li>
        <li>The unemployment rate excludes people who aren't looking for work, so it understates the number of people without a job.</li>
      </ul>

      <h3>Sources</h3>
      <ul>
        <li><a href="${meta.source.salmUrl}" target="_blank" rel="noopener">${meta.source.salm}</a></li>
        <li><a href="${meta.source.boundariesUrl}" target="_blank" rel="noopener">${meta.source.boundaries}</a></li>
      </ul>
      <p class="modal-foot">Data generated ${relativeTime(meta.generatedAt)} · latest quarter ${formatQuarter(meta.latestQuarter)}. Updated automatically as new SALM releases are published.</p>
    </div>`;

  const close = () => backdrop.remove();
  backdrop.querySelector('.modal-close')!.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', esc);
    }
  });
  document.body.appendChild(backdrop);
}
