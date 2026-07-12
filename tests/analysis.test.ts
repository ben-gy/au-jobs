import { describe, expect, it } from 'vitest';
import {
  bucketForRate,
  colorForRate,
  mean,
  median,
  yoyChange,
  trendDirection,
  rankByRate,
  withRate,
  histogram,
  computeInsights,
  NO_DATA_COLOR,
} from '../src/analysis';
import type { LGA } from '../src/types';

function lga(partial: Partial<LGA>): LGA {
  return {
    code: '10000',
    name: 'Test',
    state: 'NSW',
    rate: 5,
    prevYearRate: 5,
    unemployed: 100,
    labourForce: 2000,
    rateSeries: [],
    unemployedSeries: [],
    ...partial,
  };
}

describe('bucketForRate / colorForRate', () => {
  it('buckets a low rate', () => expect(bucketForRate(2)?.label).toBe('< 2.5%'));
  it('buckets a boundary value into the upper bucket', () => expect(bucketForRate(2.5)?.label).toBe('2.5–3.5%'));
  it('buckets an extreme rate into the top bucket', () => expect(bucketForRate(25)?.label).toBe('10%+'));
  it('returns no-data colour for null', () => {
    expect(bucketForRate(null)).toBeNull();
    expect(colorForRate(null)).toBe(NO_DATA_COLOR);
  });
  it('gives distinct colours across bands', () => {
    expect(colorForRate(2)).not.toBe(colorForRate(12));
  });
});

describe('mean / median', () => {
  it('computes a mean', () => expect(mean([2, 4, 6])).toBe(4));
  it('computes an odd-length median', () => expect(median([3, 1, 2])).toBe(2));
  it('computes an even-length median', () => expect(median([1, 2, 3, 4])).toBe(2.5));
  it('returns null for empty', () => {
    expect(mean([])).toBeNull();
    expect(median([])).toBeNull();
  });
});

describe('yoyChange / trendDirection', () => {
  it('computes the change in points', () => {
    expect(yoyChange({ rate: 6.2, prevYearRate: 5.0 })).toBe(1.2);
  });
  it('returns null when a value is missing', () => {
    expect(yoyChange({ rate: null, prevYearRate: 5 })).toBeNull();
  });
  it('classifies rising / falling / flat', () => {
    expect(trendDirection(1.5)).toBe('up');
    expect(trendDirection(-1.5)).toBe('down');
    expect(trendDirection(0.1)).toBe('flat');
    expect(trendDirection(null)).toBe('flat');
  });
});

describe('withRate / rankByRate', () => {
  const data = [
    lga({ code: 'a', rate: 8, labourForce: 5000 }),
    lga({ code: 'b', rate: 3, labourForce: 500 }),
    lga({ code: 'c', rate: null, labourForce: 9000 }),
    lga({ code: 'd', rate: 12, labourForce: 100 }),
  ];
  it('drops null-rate rows', () => expect(withRate(data).map((l) => l.code)).toEqual(['a', 'b', 'd']));
  it('applies a labour-force floor', () => {
    expect(withRate(data, 1000).map((l) => l.code)).toEqual(['a']);
  });
  it('ranks descending by rate', () => {
    expect(rankByRate(data, 'desc').map((l) => l.code)).toEqual(['d', 'a', 'b']);
  });
  it('ranks ascending by rate', () => {
    expect(rankByRate(data, 'asc').map((l) => l.code)).toEqual(['b', 'a', 'd']);
  });
});

describe('histogram', () => {
  it('bins values by width', () => {
    const bins = histogram([0.5, 1.2, 1.8, 9.9], 1, 10);
    expect(bins).toHaveLength(10);
    expect(bins[0].count).toBe(1); // 0.5
    expect(bins[1].count).toBe(2); // 1.2, 1.8
    expect(bins[9].count).toBe(1); // 9.9
  });
  it('clamps out-of-range values into the last bin', () => {
    const bins = histogram([50], 1, 5);
    expect(bins[bins.length - 1].count).toBe(1);
  });
  it('ignores nulls', () => {
    const bins = histogram([null as unknown as number, 2], 1, 5);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(1);
  });
});

describe('computeInsights', () => {
  const data = [
    lga({ code: 'hi', name: 'Hotspot', rate: 14, prevYearRate: 9, unemployed: 900, labourForce: 6000 }),
    lga({ code: 'lo', name: 'Tight', rate: 1.8, prevYearRate: 2.2, unemployed: 60, labourForce: 8000 }),
    lga({ code: 'big', name: 'Big City', rate: 5, prevYearRate: 5, unemployed: 40000, labourForce: 800000 }),
    lga({ code: 'tiny', name: 'Tiny', rate: 30, prevYearRate: 10, unemployed: 20, labourForce: 100 }),
  ];
  const insights = computeInsights(data, 4.2, 3000);

  it('produces multiple insight cards', () => expect(insights.length).toBeGreaterThanOrEqual(4));
  it('excludes tiny areas below the labour-force floor from hotspots', () => {
    const hot = insights.find((i) => i.id === 'hotspots')!;
    expect(hot.items.some((it) => it.code === 'tiny')).toBe(false);
    expect(hot.items[0].code).toBe('hi');
  });
  it('flags areas at least double the national rate', () => {
    const dbl = insights.find((i) => i.id === 'double-national');
    expect(dbl?.items[0].code).toBe('hi');
  });
  it('ranks the biggest absolute pockets by people, not rate', () => {
    const most = insights.find((i) => i.id === 'most-people')!;
    expect(most.items[0].code).toBe('big');
  });
  it('identifies fastest risers and improvers', () => {
    expect(insights.find((i) => i.id === 'rising')?.items[0].code).toBe('hi');
    expect(insights.find((i) => i.id === 'improving')?.items[0].code).toBe('lo');
  });
});
