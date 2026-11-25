import type { Translate } from '@duncit/forms/schemas';

import type { ChoiceOption } from '@/components/ChoiceField';
import type { LeadKind } from '@/features/leads/leadKinds';
import { KIND_EDITORS } from '@/features/leads/editor/kinds';
import type { LeadFormValues } from '@/features/leads/editor/values';

/** The portal's own rules for this kind (@duncit/forms/schemas) — the app validates exactly what the portal does. */
export const makeLeadSchema = (kind: LeadKind, t: Translate) => KIND_EDITORS[kind].schema(t);

/** The lists the editor's pickers offer, already as options. */
export interface LeadEditorOptions {
  superCategories: ChoiceOption[];
  statuses: ChoiceOption[];
  priorities: ChoiceOption[];
  venueTypes: ChoiceOption[];
  users: ChoiceOption[];
}

export interface LeadFormProps {
  kind: LeadKind;
  /** Null id = a new lead. */
  leadId: string | null;
  initial: LeadFormValues;
  options: LeadEditorOptions;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  error?: string | null;
}

export type { LeadFormValues };
