// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppContext, View } from '../context';
import type { LGA } from '../types';
import { colorForRate, yoyChange } from '../analysis';
import { formatNumber, formatPct, formatSigned } from '../format';
import { sparkline } from '../charts';
import { stateColor } from '../data';

type SortKey = 'name' | 'state' | 'rate' | 'yoy' | 'unemployed' | 'labourForce';

export function createTableView(ctx: AppContext): View {
  let sortKey: SortKey = 'rate';
  let sortDir: 'asc' | 'desc' = 'desc';

  const root = document.createElement('div');
  root.className = 'view table-view';
  const head = document.createElement('div');
  head.className = 'panel-head';
  root.appendChild(head);
  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  root.appendChild(scroll);

  function sortVal(l: LGA): number | string | null {
    switch (sortKey) {
      case 'name': return l.name;
      case 'state': return l.state;
      case 'rate': return l.rate;
      case 'yoy': return yoyChange(l);
      case 'unemployed': return l.unemployed;
      case 'labourForce': return l.labourForce;
    }
  }

  function filtered(): LGA[] {
    const f = ctx.store.filters;
    const q = f.search.trim().toLowerCase();
    let rows = ctx.data.lgas;
    if (f.stateFilter !== 'ALL') rows = rows.filter((l) => l.state === f.stateFilter);
    if (q) rows = rows.filter((l) => l.name.toLowerCase().includes(q) || l.state.toLowerCase().includes(q));
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = sortVal(a);
      const vb = sortVal(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }

  const COLS: { key: SortKey; label: string; align?: string }[] = [
    { key: 'name', label: 'Local government area' },
    { key: 'state', label: 'State' },
    { key: 'rate', label: 'Rate', align: 'right' },
    { key: 'yoy', label: 'YoY', align: 'right' },
    { key: 'unemployed', label: 'Unemployed', align: 'right' },
    { key: 'labourForce', label: 'Labour force', align: 'right' },
  ];

  function render() {
    const rows = filtered();
    head.innerHTML = `<h2>All local government areas</h2><p class="panel-sub">${formatNumber(rows.length)} area${rows.length === 1 ? '' : 's'} shown. Click any row for a full profile. Sort by clicking a column header.</p>`;

    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${COLS.map(
      (c) =>
        `<th data-key="${c.key}" class="${c.align === 'right' ? 'ta-right' : ''} ${sortKey === c.key ? 'sorted ' + sortDir : ''}">${c.label}<span class="sort-caret">${sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span></th>`,
    ).join('')}<th class="ta-center">15-yr trend</th></tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const frag = document.createDocumentFragment();
    for (const l of rows) {
      const change = yoyChange(l);
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.innerHTML = `
        <td class="cell-name">${l.name}</td>
        <td><span class="pill sm" style="background:${stateColor(l.state)}">${l.state}</span></td>
        <td class="ta-right mono"><span class="rate-chip" style="background:${colorForRate(l.rate)}">${formatPct(l.rate)}</span></td>
        <td class="ta-right mono ${change == null ? '' : change > 0 ? 'neg' : change < 0 ? 'pos' : ''}">${change == null ? '—' : formatSigned(change)}</td>
        <td class="ta-right mono">${formatNumber(l.unemployed)}</td>
        <td class="ta-right mono">${formatNumber(l.labourForce)}</td>
        <td class="ta-center">${sparkline(l.rateSeries, { color: colorForRate(l.rate) })}</td>`;
      tr.addEventListener('click', () => ctx.openDetail(l.code));
      tr.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') ctx.openDetail(l.code);
      });
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
    table.appendChild(tbody);

    thead.querySelectorAll<HTMLTableCellElement>('th[data-key]').forEach((th) =>
      th.addEventListener('click', () => {
        const key = th.dataset.key as SortKey;
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else {
          sortKey = key;
          sortDir = key === 'name' || key === 'state' ? 'asc' : 'desc';
        }
        render();
      }),
    );

    scroll.innerHTML = '';
    scroll.appendChild(table);
  }

  render();
  return { root, update: render };
}
