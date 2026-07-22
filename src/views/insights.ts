// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import { computeInsights, type Severity } from '../analysis';
import { formatQuarter } from '../format';
import { stateColor } from '../data';

const SEV_ICON: Record<Severity, string> = { alert: '⚠', warning: '▲', good: '✓', info: 'ℹ' };

export function createInsightsView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view insights-view';
  const { meta } = ctx.data;
  const nat = meta.national.rate[meta.national.rate.length - 1];

  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<h2>Automated insights</h2>
    <p class="panel-sub">Notable patterns detected across all ${meta.lgaCount} local government areas for ${formatQuarter(meta.latestQuarter)}. Insights ignore very small areas (labour force under 3,000) to avoid statistical noise. Click any area for its full profile.</p>`;
  root.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'insight-grid';
  root.appendChild(grid);

  const insights = computeInsights(ctx.data.lgas, nat, 3000);
  for (const ins of insights) {
    const card = document.createElement('div');
    card.className = `insight-card sev-${ins.severity}`;
    const items = ins.items
      .map(
        (it) =>
          `<li data-code="${it.code}"><span class="ins-rank"></span><span class="pill xs" style="background:${stateColor(it.state)}">${it.state}</span><span class="ins-name">${it.name}</span><span class="ins-val">${it.value}</span></li>`,
      )
      .join('');
    card.innerHTML = `
      <div class="insight-head"><span class="insight-icon">${SEV_ICON[ins.severity]}</span><h3>${ins.title}</h3></div>
      <p class="insight-detail">${ins.detail}</p>
      <ol class="insight-list">${items}</ol>`;
    card.querySelectorAll<HTMLLIElement>('li[data-code]').forEach((li) =>
      li.addEventListener('click', () => ctx.openDetail(li.dataset.code!)),
    );
    grid.appendChild(card);
  }

  return { root };
}
