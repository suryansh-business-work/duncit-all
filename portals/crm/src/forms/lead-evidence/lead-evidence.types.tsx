import type { useTranslation } from '@duncit/shell';
import type { LeadEvidenceFormValues } from './lead-evidence.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface LeadEvidenceFormProps {
  /** Shown as a dialog while true. */
  open: boolean;
  /** The item being decided and what it is worth ("Google Maps listing · 10 points"). */
  itemLabel: string;
  /** The decision already recorded, prefilled; a fresh item starts as Verified. */
  initialValues: LeadEvidenceFormValues;
  submitting?: boolean;
  /** Why the server refused the last save, one line per problem. */
  errors?: readonly string[];
  onSubmit: (values: LeadEvidenceFormValues) => void;
  onClose: () => void;
}

export type { LeadEvidenceFormValues };
