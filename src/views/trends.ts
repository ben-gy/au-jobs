import type { AppContext, View } from '../context';
import { lineChart } from '../charts';
import { STATE_META } from '../data';
import { formatPct, formatQuarter } from '../format';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

export function createTrendsView(ctx: AppContext): View {
  const enabled = new Set<string>(['NAT', ...STATES]);
  const root = document.createElement('div');
  root.className = 'view trends-view';

  const head = document.createElement('div');
  head.className = 'panel-head';
  const { meta } = ctx.data;
  head.innerHTML = `<h2>Unemployment rate over time</h2>
    <p class="panel-sub">Smoothed unemployment rate for Australia and each state/territory, ${formatQuarter(meta.quarters[0])} to ${formatQuarter(meta.latestQuarter)}. Rates are labour-force weighted from all LGAs. Toggle series in the legend; hover for values.</p>`;
  root.appendChild(head);

  const panel = document.createElement('div');
  panel.className = 'panel';
  root.appendChild(panel);

  const legend = document.createElement('div');
  legend.className = 'legend chart-legend';
  const chartHost = document.createElement('div');
  chartHost.className = 'chart-host';
  panel.appendChild(legend);
  panel.appendChild(chartHost);

  function renderLegend() {
    const items = [{ code: 'NAT', name: 'Australia', color: '#0f2a43' }, ...STATES.map((s) => ({ code: s, name: STATE_META[s].name, color: STATE_META[s].color }))];
    legend.innerHTML = items
      .map(
        (it) =>
          `<button class="legend-item ${enabled.has(it.code) ? '' : 'off'}" data-code="${it.code}"><span class="legend-swatch" style="background:${it.color}"></span>${it.code === 'NAT' ? 'Australia' : it.code}</button>`,
      )
      .join('');
    legend.querySelectorAll<HTMLButtonElement>('.legend-item').forEach((b) =>
      b.addEventListener('click', () => {
        const c = b.dataset.code!;
        if (enabled.has(c)) enabled.delete(c);
        else enabled.add(c);
        render();
      }),
    );
  }

  function render() {
    renderLegend();
    const series = [];
    if (enabled.has('NAT')) {
      series.push({ label: 'Australia', color: '#0f2a43', values: meta.national.rate, width: 3 });
    }
    for (const s of STATES) {
      if (enabled.has(s) && meta.states[s]) {
        series.push({ label: STATE_META[s].name, color: STATE_META[s].color, values: meta.states[s].rate, width: 1.8 });
      }
    }
    chartHost.innerHTML = '';
    if (!series.length) {
      chartHost.innerHTML = `<p class="empty">Select at least one series from the legend.</p>`;
      return;
    }
    chartHost.appendChild(
      lineChart(meta.quarters, series, { height: 420, formatLabel: (i) => meta.quarters[i].replace(/^[A-Za-z]+-/, "'") }),
    );

    // Latest snapshot chips
    const chips = document.createElement('div');
    chips.className = 'trend-chips';
    const nat = meta.national.rate[meta.national.rate.length - 1];
    chips.innerHTML = `<div class="tchip"><span class="tchip-dot" style="background:#0f2a43"></span>Australia <strong>${formatPct(nat)}</strong></div>` +
      STATES.filter((s) => meta.states[s])
        .map((s) => {
          const r = meta.states[s].rate[meta.states[s].rate.length - 1];
          return `<div class="tchip"><span class="tchip-dot" style="background:${STATE_META[s].color}"></span>${s} <strong>${formatPct(r)}</strong></div>`;
        })
        .join('');
    chartHost.appendChild(chips);
  }

  render();
  return { root, update: render };
}
