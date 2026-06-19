import { FounderSettingModel } from './founder.model';
import { computeMetrics, type MetricValue } from './founder.compute';
import {
  FOUNDER_CATEGORIES,
  FOUNDER_TOP_KEYS,
  METRIC_BY_KEY,
  type MetricDef,
} from './founder.metrics';

export interface MetricSnapshot {
  key: string;
  category: string;
  label: string;
  unit: string;
  value: number;
  delta_pct: number | null;
  definition: string;
  formula: string;
  source: 'computed' | 'manual';
  series: { label: string; value: number }[];
  setting_keys: string[];
}

const CASH_IN_BANK_DEF: MetricDef & { category: string } = {
  key: 'cash_in_bank',
  category: 'expenses',
  label: 'Cash in Bank',
  unit: 'currency',
  definition: 'Current cash balance (entered in settings).',
  formula: 'cash_in_bank',
  computed: false,
  settingKeys: ['cash_in_bank'],
};

async function loadSettings(): Promise<Record<string, number>> {
  const docs = await FounderSettingModel.find({}).lean();
  const map: Record<string, number> = {};
  docs.forEach((d) => { map[d.key] = d.value ?? 0; });
  return map;
}

function snapshot(
  def: MetricDef & { category: string },
  computed: Record<string, MetricValue>,
  settings: Record<string, number>
): MetricSnapshot {
  const c = computed[def.key];
  const isComputed = !!c;
  return {
    key: def.key,
    category: def.category,
    label: def.label,
    unit: def.unit,
    value: isComputed ? c.value : settings[def.key] ?? 0,
    delta_pct: isComputed ? c.delta_pct ?? null : null,
    definition: def.definition,
    formula: def.formula,
    source: isComputed ? 'computed' : 'manual',
    series: isComputed ? c.series ?? [] : [],
    setting_keys: def.settingKeys ?? [],
  };
}

export const founderService = {
  async dashboard(fromArg?: string | null, toArg?: string | null) {
    const to = toArg ? new Date(toArg) : new Date();
    const from = fromArg
      ? new Date(fromArg)
      : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
    const settings = await loadSettings();
    const computed = await computeMetrics(from, to, settings);

    const categories = FOUNDER_CATEGORIES.map((cat) => ({
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      metrics: cat.metrics.map((def) => snapshot({ ...def, category: cat.key }, computed, settings)),
    }));

    const top = FOUNDER_TOP_KEYS.map((key) => {
      const def = key === 'cash_in_bank' ? CASH_IN_BANK_DEF : METRIC_BY_KEY[key];
      return def ? snapshot(def, computed, settings) : null;
    }).filter((s): s is MetricSnapshot => s !== null);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      top,
      categories,
      settings: Object.entries(settings).map(([key, value]) => ({ key, value })),
    };
  },

  async saveSetting(key: string, value: number) {
    const clean = Number.isFinite(value) ? value : 0;
    await FounderSettingModel.updateOne(
      { key: key.trim() },
      { $set: { value: clean } },
      { upsert: true }
    );
    return { key: key.trim(), value: clean };
  },
};
