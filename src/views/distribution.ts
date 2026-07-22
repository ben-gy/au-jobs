// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import { histogramChart } from '../charts';
import { histogram, colorForRate, median, mean } from '../analysis';
import { formatPct } from '../format';
import { STATE_META } from '../data';
import { glossaryLink } from '../glossary';

const STATE_ORDER = ['ALL', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

export function createDistributionView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view distribution-view';
  const { meta } = ctx.data;

  const head = document.createElement('div');
  head.className = 'panel-head';
  root.appendChild(head);

  const controls = document.createElement('div');
  controls.className = 'controls';
  root.appendChild(controls);

  const statRow = document.createElement('div');
  statRow.className = 'stat-row';
  root.appendChild(statRow);

  const panel = document.createElement('div');
  panel.className = 'panel';
  root.appendChild(panel);

  function render() {
    const f = ctx.store.filters;
    const scope = f.stateFilter === 'ALL' ? 'Australia' : STATE_META[f.stateFilter]?.name ?? f.stateFilter;
    head.innerHTML = `<h2>Distribution of unemployment rates · ${scope}</h2>
      <p class="panel-sub">How many local government areas fall into each ${glossaryLink('unemployment-rate', 'unemployment-rate')} band. A long right tail means pockets of entrenched joblessness even when the ${glossaryLink('median', 'median')} looks healthy.</p>`;

    controls.innerHTML = `<div class="control-group"><label>Jurisdiction</label><div class="segmented">${STATE_ORDER.map(
      (s) => `<button class="seg ${f.stateFilter === s ? 'active' : ''}" data-state="${s}">${s === 'ALL' ? 'All' : s}</button>`,
    ).join('')}</div></div>`;
    controls.querySelectorAll<HTMLButtonElement>('[data-state]').forEach((b) =>
      b.addEventListener('click', () => ctx.store.set({ stateFilter: b.dataset.state! })),
    );

    let lgas = ctx.data.lgas;
    if (f.stateFilter !== 'ALL') lgas = lgas.filter((l) => l.state === f.stateFilter);
    const rates = lgas.map((l) => l.rate).filter((r): r is number => r != null);
    const bins = histogram(rates, 1, 18);
    const med = median(rates);
    const avg = mean(rates);
    const min = rates.length ? Math.min(...rates) : null;
    const max = rates.length ? Math.max(...rates) : null;
    const nat = meta.national.rate[meta.national.rate.length - 1];

    statRow.innerHTML = [
      { l: 'Areas', v: String(rates.length) },
      { l: 'Median', v: formatPct(med) },
      { l: 'Average', v: formatPct(avg) },
      { l: 'Lowest', v: formatPct(min) },
      { l: 'Highest', v: formatPct(max) },
      { l: 'National', v: formatPct(nat) },
    ]
      .map((s) => `<div class="stat-tile"><div class="stat-tile-val">${s.v}</div><div class="stat-tile-lab">${s.l}</div></div>`)
      .join('');

    panel.innerHTML = '';
    if (!rates.length) {
      panel.innerHTML = `<p class="empty">No data for this jurisdiction.</p>`;
      return;
    }
    panel.appendChild(
      histogramChart(bins, {
        color: (x0) => colorForRate(x0 + 0.5),
        markerX: nat ?? undefined,
        markerLabel: `National ${formatPct(nat)}`,
      }),
    );
  }

  render();
  return { root, update: render };
}
