import type { useTranslation } from '@duncit/shell';
import type { GrowthInputKey, GrowthInputs } from '../../../lib/growth-calculator';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** What the planner has typed: kept as text so a half-typed "12." is never lost. */
export type GrowthInputsFormValues = Record<GrowthInputKey, string>;

export interface GrowthInputsFormProps {
  /** The plan the form shows. A new object loads it again (Reset to defaults, Edit). */
  seed: GrowthInputs;
  /** Every change: the checked inputs, or null while any box is invalid. Must be stable. */
  onChange: (inputs: GrowthInputs | null) => void;
  onReset: () => void;
}

export type { GrowthInputs };
