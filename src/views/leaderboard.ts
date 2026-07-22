// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import { barChartH } from '../charts';
import { colorForRate, rankByRate } from '../analysis';
import { formatNumber, formatPct } from '../format';
import { STATE_META } from '../data';

const STATE_ORDER = ['ALL', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const LF_OPTIONS = [
  { v: 0, label: 'All areas' },
  { v: 2000, label: '2,000+' },
  { v: 5000, label: '5,000+' },
  { v: 20000, label: '20,000+' },
  { v: 50000, label: '50,000+' },
];

export function createLeaderboardView(ctx: AppContext): View {
  let dir: 'desc' | 'asc' = 'desc';
  const root = document.createElement('div');
  root.className = 'view leaderboard-view';

  const controls = document.createElement('div');
  controls.className = 'controls';
  root.appendChild(controls);

  const chartWrap = document.createElement('div');
  chartWrap.className = 'panel';
  root.appendChild(chartWrap);

  function renderControls() {
    const f = ctx.store.filters;
    controls.innerHTML = `
      <div class="control-group">
        <label>Jurisdiction</label>
        <div class="segmented" role="tablist">
          ${STATE_ORDER.map(
            (s) =>
              `<button class="seg ${f.stateFilter === s ? 'active' : ''}" data-state="${s}">${s === 'ALL' ? 'All' : s}</button>`,
          ).join('')}
        </div>
      </div>
      <div class="control-group">
        <label>Rank</label>
        <div class="segmented">
          <button class="seg ${dir === 'desc' ? 'active' : ''}" data-dir="desc">Highest</button>
          <button class="seg ${dir === 'asc' ? 'active' : ''}" data-dir="asc">Lowest</button>
        </div>
      </div>
      <div class="control-group">
        <label>Min. labour force</label>
        <select class="select" data-role="lf">
          ${LF_OPTIONS.map((o) => `<option value="${o.v}" ${f.minLabourForce === o.v ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>`;
    controls.querySelectorAll<HTMLButtonElement>('[data-state]').forEach((b) =>
      b.addEventListener('click', () => ctx.store.set({ stateFilter: b.dataset.state! })),
    );
    controls.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((b) =>
      b.addEventListener('click', () => {
        dir = b.dataset.dir as 'desc' | 'asc';
        render();
      }),
    );
    controls.querySelector<HTMLSelectElement>('[data-role=lf]')!.addEventListener('change', (e) =>
      ctx.store.set({ minLabourForce: Number((e.target as HTMLSelectElement).value) }),
    );
  }

  function render() {
    renderControls();
    const f = ctx.store.filters;
    let lgas = ctx.data.lgas;
    if (f.stateFilter !== 'ALL') lgas = lgas.filter((l) => l.state === f.stateFilter);
    const ranked = rankByRate(lgas, dir, f.minLabourForce).slice(0, 30);

    chartWrap.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'panel-head';
    const scope = f.stateFilter === 'ALL' ? 'Australia' : STATE_META[f.stateFilter]?.name ?? f.stateFilter;
    title.innerHTML = `<h2>${dir === 'desc' ? 'Highest' : 'Lowest'} unemployment · ${scope}</h2>
      <p class="panel-sub">Top 30 local government areas by smoothed unemployment rate${f.minLabourForce ? `, labour force ≥ ${formatNumber(f.minLabourForce)}` : ''}. Click a bar for detail.</p>`;
    chartWrap.appendChild(title);

    if (!ranked.length) {
      chartWrap.insertAdjacentHTML('beforeend', `<p class="empty">No areas match these filters.</p>`);
      return;
    }

    const bars = barChartH(
      ranked.map((l) => ({
        label: l.name,
        sublabel: l.state,
        value: l.rate!,
        color: colorForRate(l.rate),
        tooltip: `<div class="tt-title">${l.name} (${l.state})</div><div class="tt-row">Rate: <strong>${formatPct(l.rate)}</strong></div><div class="tt-row">${formatNumber(l.unemployed)} unemployed · ${formatNumber(l.labourForce)} labour force</div>`,
        onClick: () => ctx.openDetail(l.code),
      })),
      { unit: '%' },
    );
    chartWrap.appendChild(bars);
  }

  render();
  return { root, update: render };
}
