import { z } from 'zod';

import type { Translate } from './translate';

/**
 * A CRM dynamic field — CRM › Settings › Dynamic Fields: a custom field shown
 * on the lead forms of the kinds it applies to. Shared by the CRM portal and
 * the Duncit CRM app, so both refuse the same field with the same sentence and
 * save the same input. The storage key is made from the label for a new field
 * and never changes afterwards (existing lead values are stored under it).
 */

export const DYNAMIC_FIELD_KINDS = ['text', 'textarea', 'number', 'boolean', 'date', 'select'] as const;
export type DynamicFieldKind = (typeof DYNAMIC_FIELD_KINDS)[number];

/** Each kind's name — literal keys, so the localization gate sees each one. */
export const DYNAMIC_FIELD_KIND_KEY: Readonly<Record<DynamicFieldKind, string>> = {
  text: 'crm.managedynamicfieldspage.kindText',
  textarea: 'crm.managedynamicfieldspage.kindTextarea',
  number: 'crm.managedynamicfieldspage.kindNumber',
  boolean: 'crm.managedynamicfieldspage.kindBoolean',
  date: 'crm.managedynamicfieldspage.kindDate',
  select: 'crm.managedynamicfieldspage.kindSelect',
};

/** The lead kinds a field can apply to, in the form's order, with their switch labels. */
export const DYNAMIC_FIELD_APPLIES = [
  { flag: 'applies_to_venue', labelKey: 'crm.managedynamicfieldspage.appliesToVenueLeads', chipKey: 'crm.common.venue' },
  { flag: 'applies_to_host', labelKey: 'crm.managedynamicfieldspage.appliesToHostLeads', chipKey: 'crm.common.host' },
  { flag: 'applies_to_ecomm', labelKey: 'crm.managedynamicfieldspage.appliesToEcommLeads', chipKey: 'crm.common.ecomm' },
  { flag: 'applies_to_creator', labelKey: 'crm.managedynamicfieldspage.appliesToCreatorLeads', chipKey: 'crm.common.creator' },
  { flag: 'applies_to_community', labelKey: 'crm.managedynamicfieldspage.appliesToCommunityLeads', chipKey: 'crm.common.community' },
] as const;

const KEY_CHARACTERS = new Set('abcdefghijklmnopqrstuvwxyz0123456789_');

/** The storage key made from a label: lowercase_with_underscores ("Budget Band" → "budget_band"). */
export function deriveDynamicFieldName(label: string): string {
  let name = '';
  let replacing = false;
  for (const character of label.trim().toLowerCase()) {
    if (KEY_CHARACTERS.has(character)) {
      name += character;
      replacing = false;
    } else if (!replacing) {
      name += '_';
      replacing = true;
    }
  }
  let start = 0;
  let end = name.length;
  while (start < end && name[start] === '_') start += 1;
  while (end > start && name[end - 1] === '_') end -= 1;
  return name.slice(start, end);
}

const optionShape = z.object({ value: z.string(), label: z.string() });
export type DynamicFieldOption = z.infer<typeof optionShape>;

/** A select's options as saved: trimmed, blanks dropped, a missing label taken from the value. */
const cleanOptions = (options: readonly DynamicFieldOption[]): DynamicFieldOption[] =>
  options.map((option) => ({ value: option.value.trim(), label: (option.label || option.value).trim() })).filter((option) => option.value);

/**
 * The field's rules, in the order the portal reports them: a label, at least
 * one lead kind, a label a key can be made from (new fields only), and at
 * least one option for a Select.
 */
export const makeDynamicFieldSchema = (t: Translate) =>
  z
    .object({
      /** Set while editing a saved field (its key is then kept as it is). */
      id: z.string().optional(),
      name: z.string(),
      label: z.string(),
      kind: z.enum(DYNAMIC_FIELD_KINDS),
      multi: z.boolean(),
      options: z.array(optionShape),
      placeholder: z.string(),
      default_value: z.string(),
      hint: z.string(),
      applies_to_venue: z.boolean(),
      applies_to_host: z.boolean(),
      applies_to_ecomm: z.boolean(),
      applies_to_creator: z.boolean(),
      applies_to_community: z.boolean(),
      required: z.boolean(),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const refuse = (path: string, key: string) => ctx.addIssue({ code: 'custom', path: [path], message: t(key) });
      const label = values.label.trim();
      if (!label) refuse('label', 'crm.managedynamicfieldspage.labelRequired');
      if (!DYNAMIC_FIELD_APPLIES.some(({ flag }) => values[flag])) refuse('applies_to_venue', 'crm.managedynamicfieldspage.appliesRequired');
      if (label && !values.id && !deriveDynamicFieldName(label)) refuse('label', 'crm.managedynamicfieldspage.labelNeedsLetters');
      if (values.kind === 'select' && cleanOptions(values.options).length === 0) refuse('options', 'crm.managedynamicfieldspage.optionRequired');
    });

export type DynamicFieldValues = z.infer<ReturnType<typeof makeDynamicFieldSchema>>;

/** A new field: text, on venue and host lead forms, optional, active. */
export const dynamicFieldDefaults: DynamicFieldValues = {
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
  applies_to_ecomm: false,
  applies_to_creator: false,
  applies_to_community: false,
  required: false,
  is_active: true,
};

/** A saved field as the API returns it (older rows may lack the later flags). */
export interface DynamicFieldRow {
  id: string;
  name: string;
  label: string;
  kind: DynamicFieldKind;
  multi?: boolean | null;
  options: readonly DynamicFieldOption[];
  placeholder?: string | null;
  default_value?: string | null;
  hint?: string | null;
  applies_to_venue: boolean;
  applies_to_host: boolean;
  applies_to_ecomm: boolean;
  applies_to_creator?: boolean | null;
  applies_to_community?: boolean | null;
  required: boolean;
  is_active: boolean;
}

/** A saved field as editable values. */
export const dynamicFieldValuesFromRow = (row: DynamicFieldRow): DynamicFieldValues => ({
  id: row.id,
  name: row.name,
  label: row.label,
  kind: row.kind,
  multi: Boolean(row.multi),
  options: row.options.map((option) => ({ value: option.value, label: option.label })),
  placeholder: row.placeholder ?? '',
  default_value: row.default_value ?? '',
  hint: row.hint ?? '',
  applies_to_venue: row.applies_to_venue,
  applies_to_host: row.applies_to_host,
  applies_to_ecomm: row.applies_to_ecomm,
  applies_to_creator: Boolean(row.applies_to_creator),
  applies_to_community: Boolean(row.applies_to_community),
  required: row.required,
  is_active: row.is_active,
});

/** The `CrmDynamicFieldInput` a create or update sends. */
export interface DynamicFieldInput {
  name: string;
  label: string;
  kind: DynamicFieldKind;
  options: DynamicFieldOption[];
  multi: boolean;
  placeholder: string;
  default_value: string;
  hint: string;
  applies_to_venue: boolean;
  applies_to_host: boolean;
  applies_to_ecomm: boolean;
  applies_to_creator: boolean;
  applies_to_community: boolean;
  required: boolean;
  sort_order: number;
  is_active: boolean;
}

/** Valid values as the mutation input: a new field's key from its label, options and multi only for a Select. */
export const toDynamicFieldInput = (values: DynamicFieldValues, sortOrder: number): DynamicFieldInput => ({
  name: values.id ? values.name : deriveDynamicFieldName(values.label),
  label: values.label.trim(),
  kind: values.kind,
  options: values.kind === 'select' ? cleanOptions(values.options) : [],
  multi: values.kind === 'select' ? values.multi : false,
  placeholder: values.placeholder.trim(),
  default_value: values.default_value.trim(),
  hint: values.hint.trim(),
  applies_to_venue: values.applies_to_venue,
  applies_to_host: values.applies_to_host,
  applies_to_ecomm: values.applies_to_ecomm,
  applies_to_creator: values.applies_to_creator,
  applies_to_community: values.applies_to_community,
  required: values.required,
  sort_order: sortOrder,
  is_active: values.is_active,
});

/** The list with one row moved (the up / down reorder); an equal or out-of-range move changes nothing. */
export function moveDynamicFieldRow<R>(rows: readonly R[], from: number, to: number): R[] {
  const next = rows.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
