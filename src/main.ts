import './styles.css';
import type { AppContext, View } from './context';
import type { Dataset, ViewId } from './types';
import { loadDataset } from './data';
import { Store } from './store';
import { initGlossary } from './glossary';
import { openAbout } from './about';
import { fillDetail } from './detail';
import { formatPct, formatNumber, formatQuarter, formatSigned, relativeTime, debounce } from './format';
import { createMapView } from './views/map';
import { createLeaderboardView } from './views/leaderboard';
import { createTableView } from './views/table';
import { createTrendsView } from './views/trends';
import { createStatesView } from './views/states';
import { createDistributionView } from './views/distribution';
import { createInsightsView } from './views/insights';

const TABS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'map', label: 'Map', icon: '🗺' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'table', label: 'Table', icon: '▤' },
  { id: 'trends', label: 'Trends', icon: '📈' },
  { id: 'states', label: 'States', icon: '⬛' },
  { id: 'distribution', label: 'Distribution', icon: '📊' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];

const app = document.getElementById('app')!;

async function boot() {
  renderLoading();
  let data: Dataset;
  try {
    data = await loadDataset();
  } catch (err) {
    renderError(err instanceof Error ? err.message : String(err));
    return;
  }
  renderApp(data);
}

function renderLoading() {
  app.innerHTML = `<div class="boot"><div class="boot-spinner"></div><p>Loading labour market data…</p></div>`;
}

function renderError(msg: string) {
  app.innerHTML = `<div class="boot"><p class="boot-error">Couldn't load the data.</p><p class="dim">${msg}</p><button class="btn" onclick="location.reload()">Retry</button></div>`;
}

function renderApp(data: Dataset) {
  const store = new Store();
  const { meta } = data;
  const nat = meta.national.rate[meta.national.rate.length - 1];
  const natPrev = meta.national.rate[meta.national.rate.length - 5];
  const natChange = nat != null && natPrev != null ? Math.round((nat - natPrev) * 10) / 10 : null;

  app.innerHTML = `
    <header class="site-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <div class="brand-title">Regional Unemployment <span class="cc">(AU)</span></div>
          <div class="brand-sub">Small Area Labour Markets · every LGA</div>
        </div>
      </div>
      <div class="header-search">
        <input type="search" id="global-search" placeholder="Search a council or LGA…" autocomplete="off" aria-label="Search local government areas" />
        <div id="search-results" class="search-results" hidden></div>
      </div>
      <button class="btn ghost" id="about-btn" aria-label="About this site">? About</button>
    </header>

    <div class="summary-strip">
      <div class="sum-item primary"><div class="sum-val" style="color:var(--accent-primary)">${formatPct(nat)}</div><div class="sum-lab">National rate · ${formatQuarter(meta.latestQuarter)}</div></div>
      <div class="sum-item"><div class="sum-val ${natChange != null && natChange > 0 ? 'neg' : natChange != null && natChange < 0 ? 'pos' : ''}">${natChange == null ? '—' : formatSigned(natChange) + ' pts'}</div><div class="sum-lab">Year-on-year change</div></div>
      <div class="sum-item"><div class="sum-val">${formatNumber(meta.national.unemployed[meta.national.unemployed.length - 1])}</div><div class="sum-lab">People unemployed</div></div>
      <div class="sum-item"><div class="sum-val">${meta.lgaCount}</div><div class="sum-lab">Local government areas</div></div>
      <div class="sum-item"><div class="sum-val">${meta.quarters.length}</div><div class="sum-lab">Quarters of history</div></div>
    </div>

    <nav class="tabs" role="tablist">
      ${TABS.map((t) => `<button class="tab" role="tab" data-view="${t.id}"><span class="tab-icon" aria-hidden="true">${t.icon}</span>${t.label}</button>`).join('')}
    </nav>

    <main class="main-content"><div id="view-host"></div></main>

    <footer class="site-footer">
      <div class="foot-inner">
        <div>Data: <a href="${meta.source.salmUrl}" target="_blank" rel="noopener">Small Area Labour Markets</a>, Jobs and Skills Australia · boundaries © ABS. Updated ${relativeTime(meta.generatedAt)}.</div>
        <div>Built by <a href="https://benrichardson.dev/" target="_blank" rel="noopener">benrichardson.dev</a> · <a href="https://hub.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a></div>
      </div>
    </footer>

    <div class="detail-backdrop" hidden></div>
    <aside class="detail-panel" hidden aria-label="Area detail">
      <button class="detail-close" aria-label="Close detail">×</button>
      <div class="detail-body"></div>
    </aside>`;

  const viewHost = app.querySelector<HTMLDivElement>('#view-host')!;
  const detailPanel = app.querySelector<HTMLElement>('.detail-panel')!;
  const detailBackdrop = app.querySelector<HTMLElement>('.detail-backdrop')!;
  const detailBody = app.querySelector<HTMLElement>('.detail-body')!;

  const ctx: AppContext = {
    data,
    store,
    openDetail: (code) => {
      store.set({ selectedCode: code }, { silent: true });
      store.writeHash();
      fillDetail(detailBody, ctx, code);
      detailPanel.hidden = false;
      detailBackdrop.hidden = false;
      requestAnimationFrame(() => {
        detailPanel.classList.add('open');
        detailBackdrop.classList.add('open');
      });
    },
    goToView: (v) => store.set({ view: v }),
  };

  function closeDetail() {
    detailPanel.classList.remove('open');
    detailBackdrop.classList.remove('open');
    store.set({ selectedCode: null }, { silent: true });
    store.writeHash();
    setTimeout(() => {
      detailPanel.hidden = true;
      detailBackdrop.hidden = true;
    }, 250);
  }
  app.querySelector('.detail-close')!.addEventListener('click', closeDetail);
  detailBackdrop.addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !detailPanel.hidden) closeDetail();
  });

  // Lazy view instances
  const views: Partial<Record<ViewId, View>> = {};
  const factories: Record<ViewId, () => View> = {
    map: () => createMapView(ctx),
    leaderboard: () => createLeaderboardView(ctx),
    table: () => createTableView(ctx),
    trends: () => createTrendsView(ctx),
    states: () => createStatesView(ctx),
    distribution: () => createDistributionView(ctx),
    insights: () => createInsightsView(ctx),
  };

  let currentId: ViewId | null = null;
  function showView(id: ViewId) {
    if (!views[id]) views[id] = factories[id]();
    const view = views[id]!;
    if (currentId !== id) {
      viewHost.innerHTML = '';
      viewHost.appendChild(view.root);
      currentId = id;
      view.onShow?.();
    } else {
      view.update?.();
    }
    app.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.view === id),
    );
  }

  app.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) =>
    t.addEventListener('click', () => store.set({ view: t.dataset.view as ViewId })),
  );
  app.querySelector('#about-btn')!.addEventListener('click', () => openAbout(data));

  // Global search → autocomplete dropdown
  const searchInput = app.querySelector<HTMLInputElement>('#global-search')!;
  const searchResults = app.querySelector<HTMLDivElement>('#search-results')!;
  function renderSearch(q: string) {
    const term = q.trim().toLowerCase();
    if (!term) {
      searchResults.hidden = true;
      return;
    }
    const matches = data.lgas
      .filter((l) => l.name.toLowerCase().includes(term))
      .slice(0, 8);
    if (!matches.length) {
      searchResults.innerHTML = `<div class="sr-empty">No matching areas</div>`;
      searchResults.hidden = false;
      return;
    }
    searchResults.innerHTML = matches
      .map(
        (l) =>
          `<button class="sr-item" data-code="${l.code}"><span>${l.name}</span><span class="sr-meta">${l.state} · ${formatPct(l.rate)}</span></button>`,
      )
      .join('');
    searchResults.hidden = false;
    searchResults.querySelectorAll<HTMLButtonElement>('.sr-item').forEach((b) =>
      b.addEventListener('click', () => {
        ctx.openDetail(b.dataset.code!);
        searchInput.value = '';
        searchResults.hidden = true;
      }),
    );
  }
  searchInput.addEventListener('input', debounce((e: Event) => renderSearch((e.target as HTMLInputElement).value), 200));
  searchInput.addEventListener('focus', () => renderSearch(searchInput.value));
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.header-search')) searchResults.hidden = true;
  });

  // React to store changes
  store.subscribe((f) => showView(f.view));
  window.addEventListener('hashchange', () => {
    store.readHash();
    showView(store.filters.view);
    if (store.filters.selectedCode && detailPanel.hidden) ctx.openDetail(store.filters.selectedCode);
  });

  initGlossary(document.body);
  showView(store.filters.view);
  if (store.filters.selectedCode) ctx.openDetail(store.filters.selectedCode);
}

boot();
