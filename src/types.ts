export interface LGA {
  code: string;
  name: string;
  state: string; // NSW, VIC, ...
  rate: number | null; // latest smoothed unemployment rate %
  prevYearRate: number | null; // rate 4 quarters earlier
  unemployed: number | null; // latest smoothed unemployed persons
  labourForce: number | null; // latest smoothed labour force
  rateSeries: (number | null)[];
  unemployedSeries: (number | null)[];
}

export interface StateSeries {
  code: string;
  name: string;
  rate: (number | null)[];
  unemployed: number[];
  labourForce: number[];
}

export interface StateSummary {
  code: string;
  name: string;
  rate: number | null;
  unemployed: number;
  labourForce: number;
  lgaCount: number;
  medianRate: number | null;
}

export interface Meta {
  generatedAt: string;
  quarters: string[];
  latestQuarter: string;
  prevYearQuarter: string | null;
  lgaCount: number;
  national: {
    unemployed: number[];
    labourForce: number[];
    rate: (number | null)[];
  };
  states: Record<string, StateSeries>;
  stateSummaries: StateSummary[];
  source: {
    salm: string;
    salmUrl: string;
    boundaries: string;
    boundariesUrl: string;
  };
}

export interface Dataset {
  meta: Meta;
  lgas: LGA[];
  byCode: Map<string, LGA>;
}

export type ViewId =
  | 'map'
  | 'leaderboard'
  | 'table'
  | 'trends'
  | 'states'
  | 'distribution'
  | 'insights';
