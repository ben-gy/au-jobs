// Domain glossary + click-to-reveal tooltip wiring.
// Any element with `data-term="..."` becomes a dotted, clickable glossary link.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'unemployment-rate': {
    term: 'Unemployment rate',
    definition:
      'The number of unemployed people expressed as a percentage of the labour force (employed + unemployed). It does not include people who are not looking for work.',
  },
  'labour-force': {
    term: 'Labour force',
    definition:
      'Everyone who is either employed or actively looking for and available for work. People not in the labour force (retirees, full-time carers, many students) are excluded.',
  },
  smoothed: {
    term: 'Smoothed estimate',
    definition:
      'Small-area estimates are volatile, so Jobs and Skills Australia averages four consecutive quarters. This "smoothed" series is more reliable for spotting trends than any single quarter.',
  },
  lga: {
    term: 'Local Government Area (LGA)',
    definition:
      'The area administered by a local council (a city, shire, town or municipality). Australia has around 560 LGAs. Boundaries here follow the ABS statistical approximation.',
  },
  salm: {
    term: 'Small Area Labour Markets (SALM)',
    definition:
      'A quarterly Jobs and Skills Australia publication that models unemployment for small geographies (LGAs and SA2s) by combining Census, Centrelink and Labour Force Survey data.',
  },
  yoy: {
    term: 'Year-on-year change',
    definition:
      'The change in the unemployment rate compared with the same quarter one year earlier, measured in percentage points. Comparing the same quarter avoids seasonal distortion.',
  },
  'percentage-point': {
    term: 'Percentage point',
    definition:
      'The arithmetic difference between two percentages. Going from 4% to 6% is a rise of 2 percentage points (but a 50% relative increase).',
  },
  sa2: {
    term: 'Statistical Area Level 2 (SA2)',
    definition:
      'An ABS geography of medium-sized communities (roughly 3,000–25,000 people). SALM also publishes SA2 estimates; this site uses the LGA series.',
  },
  choropleth: {
    term: 'Choropleth map',
    definition:
      'A map where each region is shaded according to a data value — here, darker red means a higher unemployment rate.',
  },
  median: {
    term: 'Median',
    definition:
      'The middle value when all areas are ranked. Half of areas sit above it and half below. Less distorted by extreme outliers than the average.',
  },
};

let tooltipEl: HTMLDivElement | null = null;

function ensureTooltip(): HTMLDivElement {
  if (tooltipEl) return tooltipEl;
  const el = document.createElement('div');
  el.className = 'glossary-tooltip';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  document.body.appendChild(el);
  tooltipEl = el;
  return el;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.hidden = true;
}

function showTooltip(target: HTMLElement, key: string) {
  const entry = GLOSSARY[key];
  if (!entry) return;
  const tip = ensureTooltip();
  tip.innerHTML = `<strong>${entry.term}</strong><span>${entry.definition}</span>`;
  tip.hidden = false;
  const rect = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - tipRect.width - 12;
  if (left > maxLeft) left = maxLeft;
  if (left < window.scrollX + 8) left = window.scrollX + 8;
  let top = rect.bottom + window.scrollY + 6;
  // Flip above if it would overflow the viewport bottom.
  if (rect.bottom + tipRect.height + 12 > document.documentElement.clientHeight) {
    top = rect.top + window.scrollY - tipRect.height - 6;
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

// Build the inline markup for a glossary term reference.
export function glossaryLink(key: string, label?: string): string {
  const entry = GLOSSARY[key];
  const text = label ?? entry?.term ?? key;
  return `<span class="glossary-link" data-term="${key}" tabindex="0" role="button" aria-label="Definition of ${entry?.term ?? key}">${text}<span class="gloss-icon" aria-hidden="true">ⓘ</span></span>`;
}

// Global delegation — call once at startup.
export function initGlossary(root: HTMLElement = document.body) {
  root.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.glossary-link') as HTMLElement | null;
    if (target) {
      e.stopPropagation();
      const key = target.dataset.term!;
      if (!tooltipEl?.hidden && tooltipEl?.dataset.key === key) {
        hideTooltip();
      } else {
        showTooltip(target, key);
        if (tooltipEl) tooltipEl.dataset.key = key;
      }
      return;
    }
    if (tooltipEl && !tooltipEl.hidden && !(e.target as HTMLElement).closest('.glossary-tooltip')) {
      hideTooltip();
    }
  });
  root.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Escape') hideTooltip();
    if ((ke.key === 'Enter' || ke.key === ' ') && (ke.target as HTMLElement).classList?.contains('glossary-link')) {
      ke.preventDefault();
      showTooltip(ke.target as HTMLElement, (ke.target as HTMLElement).dataset.term!);
    }
  });
  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('resize', hideTooltip);
}
