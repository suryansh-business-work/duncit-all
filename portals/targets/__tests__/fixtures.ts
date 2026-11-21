import { DEFAULT_GROWTH_INPUTS, computeGrowth, type GrowthInputs } from '../src/lib/growth-calculator';
import type { SavedCalculation } from '../src/lib/queries';

let seq = 0;

/**
 * A saved calculation exactly as the API returns it — every field of the
 * GrowthCalculationFields fragment, __typename included, so Apollo's cache
 * can read it back through the fragment. Outputs come from the formulas, so a
 * fixture can never carry figures its inputs would not produce.
 */
export function savedCalculation(
  over: Partial<Omit<SavedCalculation, 'inputs'>> & { inputs?: Partial<GrowthInputs> } = {}
): SavedCalculation {
  const { inputs: inputOverrides, ...rest } = over;
  const inputs = { ...DEFAULT_GROWTH_INPUTS, ...inputOverrides };
  const out = computeGrowth(inputs);
  seq += 1;
  return {
    __typename: 'GrowthCalculation',
    id: `calc-${seq}`,
    title: 'Ten cities',
    description: '',
    inputs: { __typename: 'GrowthInputs', ...inputs },
    per_pod: { __typename: 'GrowthPerPod', ...out.per_pod },
    per_city: { __typename: 'GrowthPerCity', ...out.per_city },
    totals: { __typename: 'GrowthTotals', ...out.totals },
    formula_version: 1,
    revision: 0,
    calculated_by: {
      __typename: 'GrowthActor',
      user_id: 'u-asha',
      name: 'Asha Planner',
      email: 'asha@example.com',
      roles: ['TARGETS_MANAGER'],
    },
    last_edited_by: null,
    last_edited_at: null,
    duplicated_from: null,
    created_at: '2026-11-20T10:30:00.000Z',
    updated_at: '2026-11-20T10:30:00.000Z',
    can_edit: true,
    ...rest,
  } as SavedCalculation;
}
