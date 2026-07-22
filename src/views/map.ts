// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AppContext, View } from '../context';
import { loadGeoJson } from '../data';
import { colorForRate, RATE_BUCKETS, NO_DATA_COLOR } from '../analysis';
import { formatPct, formatNumber } from '../format';

const STATE_BY_PREFIX: Record<string, string> = {
  '1': 'NSW', '2': 'VIC', '3': 'QLD', '4': 'SA', '5': 'WA', '6': 'TAS', '7': 'NT', '8': 'ACT', '9': 'OT',
};

export function createMapView(ctx: AppContext): View {
  const root = document.createElement('div');
  root.className = 'view map-view';
  root.innerHTML = `
    <div class="map-head">
      <div>
        <h2>Unemployment map</h2>
        <p class="panel-sub">Every local government area shaded by its smoothed unemployment rate. Hover to inspect, click for the full profile.</p>
      </div>
    </div>
    <div class="map-shell">
      <div id="lga-map" class="map-canvas" role="application" aria-label="Choropleth map of Australian unemployment rates"></div>
      <div class="map-legend">
        <div class="map-legend-title">Unemployment rate</div>
        ${RATE_BUCKETS.map((b) => `<div class="ml-row"><span class="ml-swatch" style="background:${b.color}"></span>${b.label}</div>`).join('')}
        <div class="ml-row"><span class="ml-swatch" style="background:${NO_DATA_COLOR}"></span>No data</div>
      </div>
      <div class="map-status" hidden></div>
    </div>`;

  const mapEl = root.querySelector<HTMLDivElement>('#lga-map')!;
  const statusEl = root.querySelector<HTMLDivElement>('.map-status')!;

  let map: L.Map | null = null;
  let geoLayer: L.GeoJSON | null = null;
  const layerByCode = new Map<string, L.Path>();
  let loaded = false;
  let loading = false;

  function setStatus(msg: string | null) {
    if (!msg) {
      statusEl.hidden = true;
      return;
    }
    statusEl.hidden = false;
    statusEl.innerHTML = msg;
  }

  function styleFor(code: string): L.PathOptions {
    const lga = ctx.data.byCode.get(code);
    const f = ctx.store.filters;
    const st = STATE_BY_PREFIX[code[0]] ?? 'OT';
    const dim = f.stateFilter !== 'ALL' && st !== f.stateFilter;
    return {
      fillColor: colorForRate(lga?.rate ?? null),
      weight: 0.5,
      opacity: 1,
      color: '#ffffff',
      fillOpacity: dim ? 0.15 : 0.85,
    };
  }

  async function ensureMap() {
    if (map || loading) return;
    loading = true;
    setStatus('Loading map…');
    map = L.map(mapEl, { minZoom: 3, maxZoom: 11, zoomControl: true, attributionControl: true }).setView([-28.2, 133.8], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    try {
      const geo = await loadGeoJson();
      geoLayer = L.geoJSON(geo, {
        style: (feature) => styleFor(String(feature?.properties?.lga_code_2024 ?? '')),
        onEachFeature: (feature, layer) => {
          const code = String(feature.properties?.lga_code_2024 ?? '');
          const name = String(feature.properties?.lga_name_2024 ?? 'Unknown');
          layerByCode.set(code, layer as L.Path);
          const lga = ctx.data.byCode.get(code);
          const path = layer as L.Path;
          layer.on({
            mouseover: () => {
              path.setStyle({ weight: 2, color: '#0f2a43', fillOpacity: 0.95 });
              path.bringToFront();
            },
            mouseout: () => geoLayer!.resetStyle(path),
            click: () => {
              if (ctx.data.byCode.has(code)) ctx.openDetail(code);
            },
          });
          layer.bindTooltip(
            `<strong>${name}</strong><br>${lga && lga.rate != null ? `${formatPct(lga.rate)} · ${formatNumber(lga.unemployed)} unemployed` : 'No current estimate'}`,
            { sticky: true, direction: 'top', className: 'map-tt' },
          );
        },
      }).addTo(map);
      loaded = true;
      setStatus(null);
    } catch (err) {
      setStatus(`Could not load map boundaries. <button class="btn sm" data-retry>Retry</button>`);
      statusEl.querySelector('[data-retry]')?.addEventListener('click', () => {
        loading = false;
        map?.remove();
        map = null;
        void ensureMap();
      });
    } finally {
      loading = false;
    }
  }

  function restyle() {
    if (!geoLayer) return;
    geoLayer.eachLayer((layer) => {
      const feat = (layer as L.GeoJSON).feature as GeoJSON.Feature | undefined;
      const code = String(feat?.properties?.lga_code_2024 ?? '');
      (layer as L.Path).setStyle(styleFor(code));
    });
  }

  ctx.focusMapOn = (code: string) => {
    void ensureMap().then(() => {
      const layer = layerByCode.get(code) as (L.Path & { getBounds?: () => L.LatLngBounds; openTooltip?: () => void }) | undefined;
      if (layer && map && layer.getBounds) {
        map.fitBounds(layer.getBounds(), { maxZoom: 9, padding: [40, 40] });
        layer.openTooltip?.();
      }
    });
  };

  return {
    root,
    onShow: () => {
      void ensureMap().then(() => {
        setTimeout(() => map?.invalidateSize(), 60);
        if (loaded && ctx.store.filters.selectedCode) ctx.focusMapOn?.(ctx.store.filters.selectedCode);
      });
    },
    update: restyle,
  };
}
