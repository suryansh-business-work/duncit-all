export type MetricSource = 'computed' | 'manual';

export interface MetricPoint {
  label: string;
  value: number;
}

export interface FounderMetric {
  key: string;
  category: string;
  label: string;
  unit: string;
  value: number;
  delta_pct: number | null;
  definition: string;
  formula: string;
  source: MetricSource;
  setting_keys: string[];
  series: MetricPoint[];
}

export interface FounderCategory {
  key: string;
  label: string;
  icon: string;
  metrics: FounderMetric[];
}

export interface FounderSettingKV {
  key: string;
  value: number;
}

export interface FounderDashboardData {
  founderDashboard: {
    from: string;
    to: string;
    top: FounderMetric[];
    categories: FounderCategory[];
    settings: FounderSettingKV[];
  };
}
