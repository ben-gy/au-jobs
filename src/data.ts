import type { Dataset, LGA, Meta } from './types';

const BASE = import.meta.env.BASE_URL || '/';

export async function loadDataset(signal?: AbortSignal): Promise<Dataset> {
  const [meta, lgas] = await Promise.all([
    fetchJson<Meta>(`${BASE}data/meta.json`, signal),
    fetchJson<LGA[]>(`${BASE}data/lgas.json`, signal),
  ]);
  const byCode = new Map(lgas.map((l) => [l.code, l]));
  return { meta, lgas, byCode };
}

export async function loadGeoJson(signal?: AbortSignal): Promise<GeoJSON.FeatureCollection> {
  return fetchJson<GeoJSON.FeatureCollection>(`${BASE}data/lga.geojson`, signal);
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export const STATE_META: Record<string, { name: string; color: string }> = {
  NSW: { name: 'New South Wales', color: '#1f6fb2' },
  VIC: { name: 'Victoria', color: '#3b3b9a' },
  QLD: { name: 'Queensland', color: '#8f2d56' },
  SA: { name: 'South Australia', color: '#c1440e' },
  WA: { name: 'Western Australia', color: '#d4a017' },
  TAS: { name: 'Tasmania', color: '#2a7f5f' },
  NT: { name: 'Northern Territory', color: '#b5651d' },
  ACT: { name: 'Australian Capital Territory', color: '#5b6770' },
  OT: { name: 'Other Territories', color: '#777777' },
};

export function stateColor(code: string): string {
  return STATE_META[code]?.color ?? '#777';
}
