import { describe, expect, it } from 'vitest';
import {
  formatNumber,
  formatPct,
  formatSigned,
  formatQuarter,
  shortQuarter,
  relativeTime,
  slugify,
  lastValue,
} from '../src/format';

describe('formatNumber', () => {
  it('formats thousands with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  it('handles zero', () => expect(formatNumber(0)).toBe('0'));
  it('handles negatives', () => expect(formatNumber(-1234)).toBe('-1,234'));
  it('respects decimals', () => expect(formatNumber(1234.56, 1)).toBe('1,234.6'));
  it('returns em dash for null/undefined/NaN', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(NaN)).toBe('—');
  });
});

describe('formatPct / formatSigned', () => {
  it('formats a percentage', () => expect(formatPct(4.25)).toBe('4.3%'));
  it('handles null', () => expect(formatPct(null)).toBe('—'));
  it('adds a plus sign to positives', () => expect(formatSigned(1.2)).toBe('+1.2'));
  it('keeps minus for negatives', () => expect(formatSigned(-0.7)).toBe('-0.7'));
  it('does not sign zero as positive', () => expect(formatSigned(0)).toBe('0.0'));
});

describe('formatQuarter / shortQuarter', () => {
  it('expands a recent quarter', () => expect(formatQuarter('Mar-26')).toBe('March 2026'));
  it('expands a 2010s quarter', () => expect(formatQuarter('Dec-10')).toBe('December 2010'));
  it('maps end-month to quarter number', () => {
    expect(shortQuarter('Mar-26')).toBe('Q1 2026');
    expect(shortQuarter('Dec-25')).toBe('Q4 2025');
  });
  it('passes through unknown formats', () => expect(formatQuarter('weird')).toBe('weird'));
});

describe('relativeTime', () => {
  const now = new Date('2026-07-12T12:00:00Z').getTime();
  it('reports minutes', () => {
    expect(relativeTime(new Date(now - 5 * 60000).toISOString(), now)).toBe('5m ago');
  });
  it('reports hours', () => {
    expect(relativeTime(new Date(now - 3 * 3600_000).toISOString(), now)).toBe('3h ago');
  });
  it('reports days', () => {
    expect(relativeTime(new Date(now - 2 * 86400_000).toISOString(), now)).toBe('2d ago');
  });
  it('handles just now', () => {
    expect(relativeTime(new Date(now).toISOString(), now)).toBe('just now');
  });
});

describe('slugify', () => {
  it('kebab-cases names', () => expect(slugify('Sunshine Coast')).toBe('sunshine-coast'));
  it('strips punctuation and edges', () => expect(slugify("Colac Otway (S)")).toBe('colac-otway-s'));
});

describe('lastValue', () => {
  it('returns the last non-null value', () => expect(lastValue([1, 2, null])).toBe(2));
  it('skips trailing nulls', () => expect(lastValue([5, null, null])).toBe(5));
  it('returns null for empty/all-null', () => {
    expect(lastValue([])).toBeNull();
    expect(lastValue([null, null])).toBeNull();
  });
});
