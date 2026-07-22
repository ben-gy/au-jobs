// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Pure analytical helpers — rankings, distribution, colour scale, auto-insights.
// No DOM, no side effects: fully unit-tested.

import type { LGA } from './types';

// ── Choropleth / legend colour ramp (sequential, low→high unemployment) ──
export interface RateBucket {
  min: number; // inclusive
  max: number; // exclusive (Infinity for last)
  color: string;
  label: string;
}

export const RATE_BUCKETS: RateBucket[] = [
  { min: 0, max: 2.5, color: '#1a9850', label: '< 2.5%' },
  { min: 2.5, max: 3.5, color: '#66bd63', label: '2.5–3.5%' },
  { min: 3.5, max: 4.5, color: '#d9ef8b', label: '3.5–4.5%' },
  { min: 4.5, max: 5.5, color: '#fee08b', label: '4.5–5.5%' },
  { min: 5.5, max: 7, color: '#fdae61', label: '5.5–7%' },
  { min: 7, max: 10, color: '#f46d43', label: '7–10%' },
  { min: 10, max: Infinity, color: '#d73027', label: '10%+' },
];

export const NO_DATA_COLOR = '#e2e8f0';

export function bucketForRate(rate: number | null | undefined): RateBucket | null {
  if (rate == null || !Number.isFinite(rate)) return null;
  return RATE_BUCKETS.find((b) => rate >= b.min && rate < b.max) ?? RATE_BUCKETS[RATE_BUCKETS.length - 1];
}

export function colorForRate(rate: number | null | undefined): string {
  return bucketForRate(rate)?.color ?? NO_DATA_COLOR;
}

// ── Basic statistics ──
export function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function yoyChange(lga: Pick<LGA, 'rate' | 'prevYearRate'>): number | null {
  if (lga.rate == null || lga.prevYearRate == null) return null;
  return Math.round((lga.rate - lga.prevYearRate) * 10) / 10;
}

export type Trend = 'up' | 'down' | 'flat';
export function trendDirection(change: number | null, threshold = 0.2): Trend {
  if (change == null) return 'flat';
  if (change > threshold) return 'up';
  if (change < -threshold) return 'down';
  return 'flat';
}

// ── Ranking ──
export function withRate(lgas: LGA[], minLabourForce = 0): LGA[] {
  return lgas.filter((l) => l.rate != null && (l.labourForce ?? 0) >= minLabourForce);
}

export function rankByRate(lgas: LGA[], dir: 'desc' | 'asc' = 'desc', minLabourForce = 0): LGA[] {
  const arr = withRate(lgas, minLabourForce);
  arr.sort((a, b) => (dir === 'desc' ? b.rate! - a.rate! : a.rate! - b.rate!));
  return arr;
}

// ── Distribution histogram ──
export interface HistBin {
  x0: number;
  x1: number;
  count: number;
}
export function histogram(values: number[], binWidth = 1, maxEdge = 16): HistBin[] {
  const bins: HistBin[] = [];
  for (let x = 0; x < maxEdge; x += binWidth) {
    bins.push({ x0: x, x1: x + binWidth, count: 0 });
  }
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    let idx = Math.floor(v / binWidth);
    if (idx >= bins.length) idx = bins.length - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

// ── Auto-insights ──
export type Severity = 'alert' | 'warning' | 'good' | 'info';
export interface InsightItem {
  code: string;
  name: string;
  state: string;
  value: string; // formatted
}
export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  items: InsightItem[];
}

function toItem(l: LGA, value: string): InsightItem {
  return { code: l.code, name: l.name, state: l.state, value };
}

// nationalRate: current national smoothed rate. minLF filters out tiny volatile LGAs.
export function computeInsights(lgas: LGA[], nationalRate: number | null, minLF = 3000): Insight[] {
  const insights: Insight[] = [];
  const eligible = withRate(lgas, minLF);

  // 1. Hotspots — highest rates among sizeable labour markets.
  const hottest = [...eligible].sort((a, b) => b.rate! - a.rate!).slice(0, 6);
  if (hottest.length) {
    insights.push({
      id: 'hotspots',
      severity: 'alert',
      title: 'Unemployment hotspots',
      detail: `Local government areas with the highest smoothed unemployment rate (labour force ≥ ${minLF.toLocaleString('en-AU')}).`,
      items: hottest.map((l) => toItem(l, `${l.rate!.toFixed(1)}%`)),
    });
  }

  // 2. Double the national rate.
  if (nationalRate != null) {
    const doubled = eligible.filter((l) => l.rate! >= nationalRate * 2).sort((a, b) => b.rate! - a.rate!);
    if (doubled.length) {
      insights.push({
        id: 'double-national',
        severity: 'alert',
        title: `Rate at least double the national average`,
        detail: `${doubled.length} area${doubled.length === 1 ? '' : 's'} have unemployment of ${(nationalRate * 2).toFixed(1)}% or more — twice the national rate of ${nationalRate.toFixed(1)}%.`,
        items: doubled.slice(0, 8).map((l) => toItem(l, `${l.rate!.toFixed(1)}%`)),
      });
    }
  }

  // 3. Fastest rising year-on-year.
  const withYoy = eligible
    .map((l) => ({ l, c: yoyChange(l) }))
    .filter((x): x is { l: LGA; c: number } => x.c != null);
  const rising = [...withYoy].sort((a, b) => b.c - a.c).slice(0, 6).filter((x) => x.c > 0);
  if (rising.length) {
    insights.push({
      id: 'rising',
      severity: 'warning',
      title: 'Rising fastest (year-on-year)',
      detail: 'Largest increase in unemployment rate versus the same quarter a year ago.',
      items: rising.map((x) => toItem(x.l, `+${x.c.toFixed(1)} pts`)),
    });
  }

  // 4. Biggest improvers.
  const improving = [...withYoy].sort((a, b) => a.c - b.c).slice(0, 6).filter((x) => x.c < 0);
  if (improving.length) {
    insights.push({
      id: 'improving',
      severity: 'good',
      title: 'Improving fastest (year-on-year)',
      detail: 'Largest fall in unemployment rate versus the same quarter a year ago.',
      items: improving.map((x) => toItem(x.l, `${x.c.toFixed(1)} pts`)),
    });
  }

  // 5. Tightest labour markets — lowest rates.
  const tightest = [...eligible].sort((a, b) => a.rate! - b.rate!).slice(0, 6);
  if (tightest.length) {
    insights.push({
      id: 'tightest',
      severity: 'good',
      title: 'Tightest labour markets',
      detail: `Lowest smoothed unemployment rate (labour force ≥ ${minLF.toLocaleString('en-AU')}).`,
      items: tightest.map((l) => toItem(l, `${l.rate!.toFixed(1)}%`)),
    });
  }

  // 6. Largest pockets of unemployment (most unemployed persons).
  const mostPeople = lgas
    .filter((l) => l.unemployed != null)
    .sort((a, b) => b.unemployed! - a.unemployed!)
    .slice(0, 6);
  if (mostPeople.length) {
    insights.push({
      id: 'most-people',
      severity: 'info',
      title: 'Most people out of work',
      detail: 'Areas with the greatest number of unemployed persons — where the absolute scale of the challenge is largest.',
      items: mostPeople.map((l) => toItem(l, `${l.unemployed!.toLocaleString('en-AU')}`)),
    });
  }

  return insights;
}
