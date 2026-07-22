// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Hand-rolled SVG chart builders. Each returns an SVG element (or markup string
// for the tiny inline sparkline) and wires its own hover tooltip where useful.

const SVGNS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

// ── Shared data tooltip (distinct from the glossary tooltip) ──
let chartTip: HTMLDivElement | null = null;
function tip(): HTMLDivElement {
  if (chartTip) return chartTip;
  const t = document.createElement('div');
  t.className = 'chart-tooltip';
  t.hidden = true;
  document.body.appendChild(t);
  chartTip = t;
  return t;
}
export function showChartTip(html: string, clientX: number, clientY: number) {
  const t = tip();
  t.innerHTML = html;
  t.hidden = false;
  const r = t.getBoundingClientRect();
  let left = clientX + 14;
  if (left + r.width > document.documentElement.clientWidth - 8) left = clientX - r.width - 14;
  let top = clientY + 14;
  if (top + r.height > document.documentElement.clientHeight - 8) top = clientY - r.height - 14;
  t.style.left = `${Math.max(8, left)}px`;
  t.style.top = `${Math.max(8, top)}px`;
}
export function hideChartTip() {
  if (chartTip) chartTip.hidden = true;
}

// ── Inline sparkline (returns an SVG markup string) ──
export function sparkline(
  series: (number | null)[],
  opts: { width?: number; height?: number; color?: string } = {},
): string {
  const w = opts.width ?? 88;
  const h = opts.height ?? 22;
  const color = opts.color ?? '#0f766e';
  const pts = series.map((v, i) => ({ v, i })).filter((p) => p.v != null) as { v: number; i: number }[];
  if (pts.length < 2) return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const n = series.length - 1;
  const x = (i: number) => (i / n) * (w - 2) + 1;
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 4);
  const d = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return `<svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${x(last.i).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="1.8" fill="${color}"/></svg>`;
}

// ── Multi-line time-series chart ──
export interface LineSeries {
  label: string;
  color: string;
  values: (number | null)[];
  width?: number;
  dashed?: boolean;
}
export function lineChart(
  labels: string[],
  series: LineSeries[],
  opts: { height?: number; yLabel?: string; formatLabel?: (i: number) => string } = {},
): SVGSVGElement {
  const W = 900;
  const H = opts.height ?? 360;
  const m = { top: 16, right: 16, bottom: 34, left: 44 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const n = labels.length - 1;

  const allVals = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const maxV = Math.max(1, Math.ceil((Math.max(...allVals) + 0.5)));
  const minV = 0;
  const x = (i: number) => m.left + (i / n) * iw;
  const y = (v: number) => m.top + ih - ((v - minV) / (maxV - minV)) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart line-chart', preserveAspectRatio: 'xMidYMid meet', role: 'img' });

  // Y gridlines + labels
  const ticks = 5;
  for (let t = 0; t <= ticks; t++) {
    const v = (maxV / ticks) * t;
    const yy = y(v);
    svg.appendChild(el('line', { x1: m.left, y1: yy, x2: W - m.right, y2: yy, class: 'grid' }));
    const lab = el('text', { x: m.left - 8, y: yy + 4, class: 'axis-label', 'text-anchor': 'end' });
    lab.textContent = `${v.toFixed(0)}%`;
    svg.appendChild(lab);
  }
  // X labels (a handful)
  const step = Math.ceil(labels.length / 8);
  for (let i = 0; i < labels.length; i += step) {
    const xx = x(i);
    const lab = el('text', { x: xx, y: H - 12, class: 'axis-label', 'text-anchor': 'middle' });
    lab.textContent = opts.formatLabel ? opts.formatLabel(i) : labels[i];
    svg.appendChild(lab);
  }

  for (const s of series) {
    let d = '';
    let started = false;
    s.values.forEach((v, i) => {
      if (v == null) {
        started = false;
        return;
      }
      d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      started = true;
    });
    const path = el('path', {
      d: d.trim(),
      fill: 'none',
      stroke: s.color,
      'stroke-width': s.width ?? 2,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    });
    if (s.dashed) path.setAttribute('stroke-dasharray', '4 4');
    svg.appendChild(path);
  }

  // Hover crosshair
  const focus = el('line', { class: 'crosshair', y1: m.top, y2: m.top + ih, x1: -10, x2: -10 });
  focus.setAttribute('visibility', 'hidden');
  svg.appendChild(focus);
  const overlay = el('rect', { x: m.left, y: m.top, width: iw, height: ih, fill: 'transparent' });
  svg.appendChild(overlay);
  overlay.addEventListener('mousemove', (ev) => {
    const rect = svg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * W;
    let i = Math.round(((px - m.left) / iw) * n);
    i = Math.max(0, Math.min(n, i));
    focus.setAttribute('x1', String(x(i)));
    focus.setAttribute('x2', String(x(i)));
    focus.setAttribute('visibility', 'visible');
    const rows = series
      .map((s) => {
        const v = s.values[i];
        return v == null ? '' : `<div class="tt-row"><span class="tt-swatch" style="background:${s.color}"></span>${s.label}: <strong>${v.toFixed(1)}%</strong></div>`;
      })
      .join('');
    showChartTip(`<div class="tt-title">${labels[i]}</div>${rows}`, ev.clientX, ev.clientY);
  });
  overlay.addEventListener('mouseleave', () => {
    focus.setAttribute('visibility', 'hidden');
    hideChartTip();
  });

  return svg;
}

// ── Horizontal bar chart ──
export interface BarItem {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
  tooltip?: string;
  onClick?: () => void;
}
export function barChartH(items: BarItem[], opts: { unit?: string; height?: number } = {}): HTMLElement {
  const unit = opts.unit ?? '';
  const max = Math.max(...items.map((i) => i.value), 0.0001);
  const wrap = document.createElement('div');
  wrap.className = 'hbars';
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'hbar-row' + (it.onClick ? ' clickable' : '');
    const pct = (it.value / max) * 100;
    row.innerHTML = `
      <div class="hbar-label" aria-label="${it.label}" data-tip="${it.label}">${it.label}${it.sublabel ? `<span class="hbar-sub">${it.sublabel}</span>` : ''}</div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${pct.toFixed(1)}%;background:${it.color}"></div></div>
      <div class="hbar-value">${it.value.toLocaleString('en-AU', { maximumFractionDigits: 1 })}${unit}</div>`;
    if (it.tooltip) {
      row.addEventListener('mousemove', (ev) => showChartTip(it.tooltip!, ev.clientX, ev.clientY));
      row.addEventListener('mouseleave', hideChartTip);
    }
    if (it.onClick) {
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.addEventListener('click', it.onClick);
      row.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') it.onClick!();
      });
    }
    wrap.appendChild(row);
  }
  return wrap;
}

// ── Vertical histogram ──
export function histogramChart(
  bins: { x0: number; x1: number; count: number }[],
  opts: { color?: (x0: number) => string; markerX?: number; markerLabel?: string } = {},
): SVGSVGElement {
  const W = 900;
  const H = 320;
  const m = { top: 16, right: 16, bottom: 40, left: 44 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const maxC = Math.max(...bins.map((b) => b.count), 1);
  const maxX = bins[bins.length - 1].x1;
  const bw = iw / bins.length;
  const x = (v: number) => m.left + (v / maxX) * iw;
  const y = (c: number) => m.top + ih - (c / maxC) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart histogram', preserveAspectRatio: 'xMidYMid meet', role: 'img' });
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const c = Math.round((maxC / ticks) * t);
    const yy = y(c);
    svg.appendChild(el('line', { x1: m.left, y1: yy, x2: W - m.right, y2: yy, class: 'grid' }));
    const lab = el('text', { x: m.left - 8, y: yy + 4, class: 'axis-label', 'text-anchor': 'end' });
    lab.textContent = String(c);
    svg.appendChild(lab);
  }
  bins.forEach((b, i) => {
    const bx = m.left + i * bw;
    const bh = m.top + ih - y(b.count);
    const rect = el('rect', {
      x: bx + 1,
      y: y(b.count),
      width: Math.max(1, bw - 2),
      height: Math.max(0, bh),
      fill: opts.color ? opts.color(b.x0) : '#0ea5e9',
      class: 'hist-bar',
      rx: 1,
    });
    rect.addEventListener('mousemove', (ev) =>
      showChartTip(`<div class="tt-title">${b.x0}–${b.x1}%</div><div class="tt-row">${b.count} area${b.count === 1 ? '' : 's'}</div>`, ev.clientX, ev.clientY),
    );
    rect.addEventListener('mouseleave', hideChartTip);
    svg.appendChild(rect);
    if (i % 2 === 0) {
      const lab = el('text', { x: bx, y: H - 22, class: 'axis-label', 'text-anchor': 'middle' });
      lab.textContent = String(b.x0);
      svg.appendChild(lab);
    }
  });
  const axisTitle = el('text', { x: m.left + iw / 2, y: H - 6, class: 'axis-title', 'text-anchor': 'middle' });
  axisTitle.textContent = 'Unemployment rate (%)';
  svg.appendChild(axisTitle);

  if (opts.markerX != null) {
    const mx = x(opts.markerX);
    svg.appendChild(el('line', { x1: mx, y1: m.top, x2: mx, y2: m.top + ih, class: 'hist-marker' }));
    const lab = el('text', { x: mx, y: m.top + 12, class: 'hist-marker-label', 'text-anchor': mx > W / 2 ? 'end' : 'start', dx: mx > W / 2 ? -6 : 6 });
    lab.textContent = opts.markerLabel ?? '';
    svg.appendChild(lab);
  }
  return svg;
}
