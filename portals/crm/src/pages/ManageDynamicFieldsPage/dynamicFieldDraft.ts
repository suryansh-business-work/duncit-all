import {
  DYNAMIC_FIELD_KIND_KEY,
  deriveDynamicFieldName,
  dynamicFieldDefaults,
  dynamicFieldValuesFromRow,
  makeDynamicFieldSchema,
  moveDynamicFieldRow,
  toDynamicFieldInput,
  type DynamicFieldInput as SharedDynamicFieldInput,
  type DynamicFieldValues,
} from '@duncit/forms/schemas';
import type { useTranslation } from '@duncit/shell';
import type { CrmDynamicField } from '../../api/crm.types';

/*
 * The field's rules, key derivation and input live in @duncit/forms/schemas
 * (dynamic-field), shared with the Duncit CRM app: both refuse the same field
 * with the same sentence and save the same input.
 */

type Translate = ReturnType<typeof useTranslation>['t'];

export type DraftState = DynamicFieldValues;

/** Each kind's name key — literal keys in the shared module, for the localization gate. */
export const KIND_LABEL_KEY = DYNAMIC_FIELD_KIND_KEY;

export const blankDraft: DraftState = dynamicFieldDefaults;

/** Derive the storage key from a human label: lowercase_with_underscores. */
export const deriveName = deriveDynamicFieldName;

export const draftFromRow = (row: CrmDynamicField): DraftState => dynamicFieldValuesFromRow(row);

export type DynamicFieldInput = SharedDynamicFieldInput;

export type DraftValidation = { ok: true; input: DynamicFieldInput } | { ok: false; error: string };

/** Validate a draft (the first problem, in the reader's language) and build the GraphQL input. */
export function buildDynamicFieldInput(draft: DraftState, sortOrder: number, t: Translate): DraftValidation {
  const result = makeDynamicFieldSchema(t).safeParse(draft);
  if (!result.success) return { ok: false, error: result.error.issues[0]?.message ?? '' };
  return { ok: true, input: toDynamicFieldInput(draft, sortOrder) };
}

/** Immutably move an array item from one index to another. */
export const moveItem = moveDynamicFieldRow;
