// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Dataset, ViewId } from './types';
import type { Store } from './store';

export interface AppContext {
  data: Dataset;
  store: Store;
  openDetail: (code: string) => void;
  goToView: (v: ViewId) => void;
  // Set by the map view so other views/detail can recentre the map on an LGA.
  focusMapOn?: (code: string) => void;
}

export interface View {
  root: HTMLElement;
  update?: () => void; // filters changed while this view is active
  onShow?: () => void; // became the active view
}
