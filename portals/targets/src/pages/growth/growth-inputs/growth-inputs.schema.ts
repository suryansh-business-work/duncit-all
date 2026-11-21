import { z } from 'zod';
import {
  GROWTH_INPUT_BOUNDS,
  GROWTH_INPUT_KEYS,
  growthInputProblem,
  type GrowthInputKey,
  type GrowthInputProblem,
  type GrowthInputs,
} from '../../../lib/growth-calculator';
import { formatInput } from '../../../lib/growth-format';
import type { GrowthInputsFormValues, Translate } from './growth-inputs.types';

/** What is wrong with one typed assumption — by the server's own rule — or null when it is usable. */
export function inputProblem(key: GrowthInputKey, raw: string): GrowthInputProblem | null {
  const text = raw.trim();
  return text ? growthInputProblem(key, Number(text)) : 'number';
}

function problemMessage(t: Translate, key: GrowthInputKey, problem: GrowthInputProblem): string {
  const bound = GROWTH_INPUT_BOUNDS[key];
  if (problem === 'whole') return t('targets.growth.errors.whole');
  if (problem === 'decimals') return t('targets.growth.errors.decimals');
  if (problem === 'range') {
    return t('targets.growth.errors.range', { vars: { min: formatInput(bound.min), max: formatInput(bound.max) } });
  }
  return t('targets.growth.errors.number');
}

const field = (t: Translate, key: GrowthInputKey) =>
  z
    .string()
    .superRefine((raw, ctx) => {
      const problem = inputProblem(key, raw);
      if (problem) ctx.addIssue({ code: 'custom', message: problemMessage(t, key, problem) });
    })
    .transform((raw) => Number(raw.trim()));

/** The nine assumptions, checked against the same bounds the server enforces. */
export const growthInputsSchema = (t: Translate) =>
  z.object({
    pax_per_pod: field(t, 'pax_per_pod'),
    price_per_pax: field(t, 'price_per_pax'),
    profit_margin_pct: field(t, 'profit_margin_pct'),
    hosts_per_venue: field(t, 'hosts_per_venue'),
    pods_per_host_per_month: field(t, 'pods_per_host_per_month'),
    venues_per_city: field(t, 'venues_per_city'),
    target_cities: field(t, 'target_cities'),
    host_conversion_pct: field(t, 'host_conversion_pct'),
    venue_conversion_pct: field(t, 'venue_conversion_pct'),
  }) satisfies z.ZodType<GrowthInputs, GrowthInputsFormValues>;

/** A plan as the text the boxes show. */
export function toFormValues(inputs: GrowthInputs): GrowthInputsFormValues {
  return Object.fromEntries(GROWTH_INPUT_KEYS.map((key) => [key, String(inputs[key])])) as GrowthInputsFormValues;
}
