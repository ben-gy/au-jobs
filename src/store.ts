import type { ViewId } from './types';

export interface Filters {
  view: ViewId;
  search: string;
  stateFilter: string; // 'ALL' or state code
  minLabourForce: number;
  selectedCode: string | null;
}

const LS_KEY = 'au-jobs:prefs:v1';
const PERSIST_KEYS: (keyof Filters)[] = ['view', 'stateFilter', 'minLabourForce'];
const VIEWS: ViewId[] = ['map', 'leaderboard', 'table', 'trends', 'states', 'distribution', 'insights'];

type Listener = (f: Filters) => void;

export class Store {
  filters: Filters;
  private listeners = new Set<Listener>();

  constructor() {
    this.filters = {
      view: 'map',
      search: '',
      stateFilter: 'ALL',
      minLabourForce: 0,
      selectedCode: null,
    };
    this.loadPrefs();
    this.readHash();
  }

  private loadPrefs() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Filters>;
        for (const k of PERSIST_KEYS) {
          if (saved[k] != null) (this.filters as unknown as Record<string, unknown>)[k] = saved[k];
        }
      }
    } catch {
      /* ignore corrupt prefs */
    }
  }

  private savePrefs() {
    try {
      const out: Partial<Filters> = {};
      for (const k of PERSIST_KEYS) (out as unknown as Record<string, unknown>)[k] = this.filters[k];
      localStorage.setItem(LS_KEY, JSON.stringify(out));
    } catch {
      /* storage may be unavailable */
    }
  }

  readHash() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const v = params.get('view');
    if (v && (VIEWS as string[]).includes(v)) this.filters.view = v as ViewId;
    const lga = params.get('lga');
    this.filters.selectedCode = lga || null;
    const st = params.get('state');
    if (st) this.filters.stateFilter = st;
  }

  writeHash() {
    const params = new URLSearchParams();
    params.set('view', this.filters.view);
    if (this.filters.selectedCode) params.set('lga', this.filters.selectedCode);
    if (this.filters.stateFilter !== 'ALL') params.set('state', this.filters.stateFilter);
    const next = `#${params.toString()}`;
    if (location.hash !== next) history.replaceState(null, '', next);
  }

  set(patch: Partial<Filters>, opts: { silent?: boolean } = {}) {
    Object.assign(this.filters, patch);
    this.savePrefs();
    this.writeHash();
    if (!opts.silent) this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.filters);
  }
}
