import type { useTranslation } from '@duncit/shell';
import type { SavedCalculation } from '../../../lib/queries';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface SaveCalculationFormValues {
  title: string;
  description: string;
}

export interface SaveCalculationFormProps {
  /** The saved record being edited, or null for a new calculation. */
  editing: SavedCalculation | null;
  /** False while an assumption is invalid — nothing can be saved then. */
  canSave: boolean;
  /** The signed-in person's name, shown as who a new calculation is calculated by. */
  calculatedBy: string;
  /** Resolves true once saved; the form then clears for the next calculation. */
  onSubmit: (values: SaveCalculationFormValues) => Promise<boolean>;
  onCancelEdit: () => void;
}
