import type { IKra } from './teamStructure.model';

export const MAX_KRAS = 10;
export const MAX_KPIS_PER_KRA = 10;
/** Weights are percentages, so they are compared with a little slack for float input like 33.3 + 33.3 + 33.4. */
const EPSILON = 0.01;

const sum = (weights: readonly number[]): number => weights.reduce((total, w) => total + w, 0);
const isWeight = (w: number): boolean => Number.isFinite(w) && w >= 0 && w <= 100;

/**
 * Why a seat's KRAs cannot be saved, or null when they can.
 *
 * KRA weights must make up the whole seat (100%), and the KPI weights inside a
 * KRA must make up that KRA — otherwise a score computed from them would not
 * mean anything. A seat with no KRAs is fine: it simply has no scorecard yet.
 */
export function kraProblem(kras: readonly IKra[]): string | null {
  if (kras.length === 0) return null;
  if (kras.length > MAX_KRAS) return `A seat cannot have more than ${MAX_KRAS} KRAs`;
  for (const kra of kras) {
    if (!kra.title.trim()) return 'Every KRA needs a title';
    if (!isWeight(kra.weight)) return `${kra.title}: weight must be between 0 and 100`;
    if (kra.kpis.length > MAX_KPIS_PER_KRA) return `${kra.title}: a KRA cannot have more than ${MAX_KPIS_PER_KRA} KPIs`;
    for (const kpi of kra.kpis) {
      if (!kpi.name.trim()) return `${kra.title}: every KPI needs a name`;
      if (!isWeight(kpi.weight)) return `${kpi.name}: weight must be between 0 and 100`;
      if (kpi.target != null && !Number.isFinite(kpi.target)) return `${kpi.name}: target must be a number`;
    }
    if (kra.kpis.length > 0 && Math.abs(sum(kra.kpis.map((k) => k.weight)) - 100) > EPSILON) {
      return `${kra.title}: KPI weights must add up to 100%`;
    }
  }
  if (Math.abs(sum(kras.map((k) => k.weight)) - 100) > EPSILON) return 'KRA weights must add up to 100%';
  return null;
}
