import type { ShipToValues } from '@duncit/forms/schemas';

/** What the Fix address dialog holds — the shared courier ship-to contract. */
export type ShipToFormValues = ShipToValues;

export interface ShipToFormProps {
  open: boolean;
  /** The order's current ship-to — the form opens on it. */
  initial: ShipToFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: ShipToFormValues) => void;
}
