// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext } from './context';
import { formatNumber, formatPct, formatSigned, formatQuarter } from './format';
import { lineChart } from './charts';
import { colorForRate, rankByRate, yoyChange, trendDirection } from './analysis';
import { glossaryLink } from './glossary';
import { stateColor, STATE_META } from './data';

export function fillDetail(body: HTMLElement, ctx: AppContext, code: string) {
  const lga = ctx.data.byCode.get(code);
  body.innerHTML = '';
  if (!lga) {
    body.innerHTML = `<p class="empty">Area not found.</p>`;
    return;
  }
  const { meta } = ctx.data;
  const stateName = STATE_META[lga.state]?.name ?? lga.state;
  const change = yoyChange(lga);
  const trend = trendDirection(change);
  const nationalRate = meta.national.rate[meta.national.rate.length - 1];
  const stateSummary = meta.stateSummaries.find((s) => s.code === lga.state);
  const stateRate = stateSummary?.rate ?? null;

  // National rank by rate (desc)
  const ranked = rankByRate(ctx.data.lgas, 'desc');
  const rankIdx = ranked.findIndex((l) => l.code === code);
  const rank = rankIdx >= 0 ? rankIdx + 1 : null;
  const inState = rankByRate(ctx.data.lgas.filter((l) => l.state === lga.state), 'desc');
  const stateRankIdx = inState.findIndex((l) => l.code === code);

  const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '▬';
  const trendClass = trend === 'up' ? 'bad' : trend === 'down' ? 'good' : 'flat';

  const header = document.createElement('div');
  header.innerHTML = `
    <div class="detail-title-row">
      <div>
        <h2 class="detail-name">${lga.name}</h2>
        <span class="pill" style="background:${stateColor(lga.state)}">${lga.state}</span>
        <span class="detail-statename">${stateName}</span>
      </div>
    </div>
    <div class="detail-hero">
      <div class="hero-rate" style="color:${colorForRate(lga.rate)}">${formatPct(lga.rate)}</div>
      <div class="hero-meta">
        <div class="hero-label">${glossaryLink('unemployment-rate', 'Unemployment rate')} · ${formatQuarter(meta.latestQuarter)}</div>
        <div class="hero-change ${trendClass}">${arrow} ${change == null ? 'n/a' : `${formatSigned(change)} pts`} ${glossaryLink('yoy', 'year-on-year')}</div>
      </div>
    </div>`;
  body.appendChild(header);

  // Rank cards
  const cards = document.createElement('div');
  cards.className = 'detail-cards';
  cards.innerHTML = `
    <div class="dcard"><div class="dcard-val">${rank ? `#${rank}` : '—'}</div><div class="dcard-lab">of ${ranked.length} nationally<br><span class="dim">(highest = #1)</span></div></div>
    <div class="dcard"><div class="dcard-val">${stateRankIdx >= 0 ? `#${stateRankIdx + 1}` : '—'}</div><div class="dcard-lab">of ${inState.length} in ${lga.state}</div></div>
    <div class="dcard"><div class="dcard-val">${formatNumber(lga.unemployed)}</div><div class="dcard-lab">unemployed persons</div></div>
    <div class="dcard"><div class="dcard-val">${formatNumber(lga.labourForce)}</div><div class="dcard-lab">${glossaryLink('labour-force', 'labour force')}</div></div>`;
  body.appendChild(cards);

  // Comparison bars: LGA vs state vs national
  const cmp = document.createElement('div');
  cmp.className = 'detail-section';
  const cmpMax = Math.max(lga.rate ?? 0, stateRate ?? 0, nationalRate ?? 0, 1) * 1.1;
  const bar = (label: string, val: number | null, color: string) =>
    `<div class="cmp-row"><span class="cmp-label">${label}</span><div class="cmp-track"><div class="cmp-fill" style="width:${val == null ? 0 : (val / cmpMax) * 100}%;background:${color}"></div></div><span class="cmp-val">${formatPct(val)}</span></div>`;
  cmp.innerHTML = `<h3 class="detail-h3">How it compares</h3>
    ${bar(lga.name, lga.rate, colorForRate(lga.rate))}
    ${bar(`${lga.state} average`, stateRate, '#64748b')}
    ${bar('Australia', nationalRate, '#0f2a43')}`;
  body.appendChild(cmp);

  // Rate over time line chart
  const trendSec = document.createElement('div');
  trendSec.className = 'detail-section';
  trendSec.innerHTML = `<h3 class="detail-h3">Unemployment rate over time</h3>`;
  const chart = lineChart(
    meta.quarters,
    [
      { label: 'Australia', color: '#94a3b8', values: meta.national.rate, width: 1.5, dashed: true },
      { label: lga.name, color: colorForRate(lga.rate), values: lga.rateSeries, width: 2.5 },
    ],
    { height: 240, formatLabel: (i) => meta.quarters[i].replace(/^[A-Za-z]+-/, "'") },
  );
  trendSec.appendChild(chart);
  body.appendChild(trendSec);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  const mapBtn = document.createElement('button');
  mapBtn.className = 'btn';
  mapBtn.textContent = 'Show on map';
  mapBtn.addEventListener('click', () => {
    ctx.store.set({ view: 'map' });
    ctx.focusMapOn?.(code);
  });
  actions.appendChild(mapBtn);
  body.appendChild(actions);
}
