import type { AppContext, View } from '../context';
import { barChartH, showChartTip, hideChartTip } from '../charts';
import { RATE_BUCKETS, colorForRate } from '../analysis';
import { STATE_META } from '../data';
import { formatNumber, formatPct, shortQuarter } from '../format';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

export function createStatesView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view states-view';
  const { meta } = ctx.data;

  // ── Summary cards ──
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<h2>States &amp; territories</h2><p class="panel-sub">Labour-force-weighted unemployment rate by jurisdiction for ${meta.latestQuarter.replace(/-/, " ’")}. Click a jurisdiction to filter the leaderboard.</p>`;
  root.appendChild(head);

  const cards = document.createElement('div');
  cards.className = 'state-cards';
  for (const s of meta.stateSummaries) {
    const card = document.createElement('button');
    card.className = 'state-card';
    card.innerHTML = `
      <div class="sc-top"><span class="pill" style="background:${STATE_META[s.code]?.color ?? '#777'}">${s.code}</span><span class="sc-rate" style="color:${colorForRate(s.rate)}">${formatPct(s.rate)}</span></div>
      <div class="sc-name">${s.name}</div>
      <div class="sc-stats"><span>${formatNumber(s.unemployed)} unemployed</span><span>${s.lgaCount} LGAs · median ${formatPct(s.medianRate)}</span></div>`;
    card.addEventListener('click', () => ctx.store.set({ view: 'leaderboard', stateFilter: s.code }));
    cards.appendChild(card);
  }
  root.appendChild(cards);

  // ── Bars: latest rate ──
  const barPanel = document.createElement('div');
  barPanel.className = 'panel';
  barPanel.innerHTML = `<div class="panel-head"><h3>Current unemployment rate by jurisdiction</h3></div>`;
  const sorted = [...meta.stateSummaries].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  barPanel.appendChild(
    barChartH(
      sorted.map((s) => ({
        label: s.name,
        sublabel: s.code,
        value: s.rate ?? 0,
        color: colorForRate(s.rate),
        tooltip: `<div class="tt-title">${s.name}</div><div class="tt-row">Rate: <strong>${formatPct(s.rate)}</strong></div><div class="tt-row">Median LGA: ${formatPct(s.medianRate)}</div>`,
        onClick: () => ctx.store.set({ view: 'leaderboard', stateFilter: s.code }),
      })),
      { unit: '%' },
    ),
  );
  root.appendChild(barPanel);

  // ── Heatmap matrix: state × quarter ──
  const heat = document.createElement('div');
  heat.className = 'panel';
  heat.innerHTML = `<div class="panel-head"><h3>Unemployment rate over time — heatmap</h3><p class="panel-sub">Each cell is one quarter. Warmer = higher unemployment. Hover for the exact rate.</p></div>`;

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = RATE_BUCKETS.map(
    (b) => `<span class="legend-item static"><span class="legend-swatch" style="background:${b.color}"></span>${b.label}</span>`,
  ).join('');
  heat.appendChild(legend);

  const grid = document.createElement('div');
  grid.className = 'heatmap-scroll';
  const q = meta.quarters;
  const table = document.createElement('table');
  table.className = 'heatmap';
  // header row: label every 4th quarter (annual)
  let thead = '<thead><tr><th class="hm-corner"></th>';
  q.forEach((qq, i) => {
    thead += `<th class="hm-col ${i % 4 === 0 ? 'labelled' : ''}">${i % 4 === 0 ? shortQuarter(qq).replace('20', "'") : ''}</th>`;
  });
  thead += '</tr></thead>';
  table.innerHTML = thead;
  const tb = document.createElement('tbody');
  for (const s of STATES) {
    if (!meta.states[s]) continue;
    const series = meta.states[s].rate;
    const tr = document.createElement('tr');
    let html = `<td class="hm-rowlabel"><span class="pill sm" style="background:${STATE_META[s].color}">${s}</span></td>`;
    series.forEach((r, i) => {
      html += `<td class="hm-cell" style="background:${colorForRate(r)}" data-r="${r ?? ''}" data-q="${q[i]}" data-s="${s}"></td>`;
    });
    tr.innerHTML = html;
    tb.appendChild(tr);
  }
  table.appendChild(tb);
  grid.appendChild(table);
  heat.appendChild(grid);
  root.appendChild(heat);

  tb.addEventListener('mousemove', (e) => {
    const cell = (e.target as HTMLElement).closest('.hm-cell') as HTMLElement | null;
    if (!cell) return hideChartTip();
    const r = cell.dataset.r;
    showChartTip(
      `<div class="tt-title">${STATE_META[cell.dataset.s!].name}</div><div class="tt-row">${shortQuarter(cell.dataset.q!)}: <strong>${r ? formatPct(Number(r)) : 'n/a'}</strong></div>`,
      e.clientX,
      e.clientY,
    );
  });
  tb.addEventListener('mouseleave', hideChartTip);

  return { root };
}
