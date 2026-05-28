import type { CrmDynamicField, CrmDynamicFieldKind, CrmDynamicFieldOption } from '../../api/crm.types';

export interface DraftState {
  id?: string;
  name: string;
  label: string;
  kind: CrmDynamicFieldKind;
  multi: boolean;
  options: CrmDynamicFieldOption[];
  placeholder: string;
  default_value: string;
  hint: string;
  applies_to_venue: boolean;
  applies_to_host: boolean;
  required: boolean;
  is_active: boolean;
}

export const KIND_LABELS: Record<CrmDynamicFieldKind, string> = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  boolean: 'Yes / No',
  date: 'Date',
  select: 'Select',
};

export const blankDraft: DraftState = {
  name: '',
  label: '',
  kind: 'text',
  multi: false,
  options: [],
  placeholder: '',
  default_value: '',
  hint: '',
  applies_to_venue: true,
  applies_to_host: true,
  required: false,
  is_active: true,
};

/** Derive the storage key from a human label: lowercase_with_underscores. */
export function deriveName(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

export function draftFromRow(row: CrmDynamicField): DraftState {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    kind: row.kind,
    multi: !!row.multi,
    options: row.options.map((o) => ({ value: o.value, label: o.label })),
    placeholder: row.placeholder ?? '',
    default_value: row.default_value ?? '',
    hint: row.hint ?? '',
    applies_to_venue: row.applies_to_venue,
    applies_to_host: row.applies_to_host,
    required: row.required,
    is_active: row.is_active,
  };
}

export interface DynamicFieldInput {
  name: string;
  label: string;
  kind: CrmDynamicFieldKind;
  options: CrmDynamicFieldOption[];
  multi: boolean;
  placeholder: string;
  default_value: string;
  hint: string;
  applies_to_venue: boolean;
  applies_to_host: boolean;
  required: boolean;
  sort_order: number;
  is_active: boolean;
}

export type DraftValidation = { ok: true; input: DynamicFieldInput } | { ok: false; error: string };

/** Validate a draft and build the GraphQL input. Pure — unit tested. */
export function buildDynamicFieldInput(draft: DraftState, sortOrder: number): DraftValidation {
  const label = draft.label.trim();
  if (!label) return { ok: false, error: 'Label is required' };
  if (!draft.applies_to_venue && !draft.applies_to_host) {
    return { ok: false, error: 'Pick at least one of: applies to Venue / Host.' };
  }
  const name = draft.id ? draft.name : deriveName(draft.label);
  if (!name) return { ok: false, error: 'Label must contain letters or numbers.' };

  const options =
    draft.kind === 'select'
      ? draft.options
          .map((o) => ({ value: o.value.trim(), label: (o.label || o.value).trim() }))
          .filter((o) => o.value)
      : [];
  if (draft.kind === 'select' && options.length === 0) {
    return { ok: false, error: 'Add at least one option for a Select field.' };
  }

  return {
    ok: true,
    input: {
      name,
      label,
      kind: draft.kind,
      options,
      multi: draft.kind === 'select' ? draft.multi : false,
      placeholder: draft.placeholder.trim(),
      default_value: draft.default_value.trim(),
      hint: draft.hint.trim(),
      applies_to_venue: draft.applies_to_venue,
      applies_to_host: draft.applies_to_host,
      required: draft.required,
      sort_order: sortOrder,
      is_active: draft.is_active,
    },
  };
}

/** Immutably move an array item from one index to another. Pure — unit tested. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
