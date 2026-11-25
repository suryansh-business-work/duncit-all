import { emptyCrmContact, type CrmContactValues } from '@duncit/forms/schemas';

import type { LeadKind } from '@/features/leads/leadKinds';
import { KIND_EDITORS } from './kinds';

/**
 * Form values ⇄ API, for every lead kind. Pure: the editor screen, the save
 * and their tests all go through these three functions.
 */

export type LeadFormValues = Record<string, unknown> & {
  contacts: CrmContactValues[];
  next_follow_up_date: string | null;
};

type ServiceRow = { service: string; custom_name: string; description: string };
type LinkRow = { name: string; url: string };

const str = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

/** A new lead of this kind: the portal's own starting values (status New, priority Medium, one blank contact). */
export function leadDefaults(kind: LeadKind): LeadFormValues {
  const editor = KIND_EDITORS[kind];
  const values: LeadFormValues = {
    [editor.nameField]: '',
    super_category_id: '',
    website: '',
    contacts: [{ ...emptyCrmContact }],
    services_offered: [],
    lead_status: 'New',
    priority: 'Medium',
    assigned_user_id: '',
    assigned_to: '',
    next_follow_up_date: null,
    [editor.notesField]: '',
  };
  for (const field of editor.fields) values[field.name] = '';
  for (const date of editor.preservedDates) if (!(date in values)) values[date] = null;
  if (editor.venueTypes) {
    values.venue_types = [];
    values.venue_type_other = '';
  }
  if (kind === 'CREATOR_LEAD' || kind === 'COMMUNITY_LEAD') values.social_links = [];
  return values;
}

/** A saved lead → the form, every value in the shape the schema checks (numbers as text, never null). */
export function leadToForm(kind: LeadKind, lead: Record<string, unknown>): LeadFormValues {
  const values = leadDefaults(kind);
  for (const key of Object.keys(values)) {
    const saved = lead[key];
    if (saved === undefined) continue;
    if (Array.isArray(values[key]) || key.endsWith('_date')) values[key] = saved ?? values[key];
    else values[key] = str(saved);
  }
  const contacts = Array.isArray(lead.contacts)
    ? (lead.contacts as Partial<CrmContactValues>[])
    : [];
  values.contacts = contacts.length
    ? contacts.map((c) => ({
        name: str(c.name),
        role: str(c.role),
        mobile_number: str(c.mobile_number),
        whatsapp_number: str(c.whatsapp_number),
        email: str(c.email),
      }))
    : [{ ...emptyCrmContact }];
  values.services_offered = ((lead.services_offered as ServiceRow[] | null | undefined) ?? []).map(
    (s) => ({
      service: str(s.service),
      custom_name: str(s.custom_name),
      description: str(s.description),
    }),
  );
  if ('social_links' in values) {
    values.social_links = ((lead.social_links as LinkRow[] | null | undefined) ?? []).map((l) => ({
      name: str(l.name),
      url: str(l.url),
    }));
  }
  return values;
}

const toNumber = (value: unknown, integer: boolean): number | null => {
  const text = str(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return integer ? Math.trunc(parsed) : parsed;
};

/** Contacts with nothing in them are dropped, the rest trimmed — the portal's own cleaning. */
export const cleanContacts = (contacts: CrmContactValues[]): CrmContactValues[] =>
  contacts
    .filter((c) => c.name || c.mobile_number || c.email || c.whatsapp_number)
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim(),
      mobile_number: c.mobile_number.trim(),
      whatsapp_number: c.whatsapp_number.trim(),
      email: c.email.trim(),
    }));

/**
 * The form → the kind's create/update input: ONLY the fields the phone editor
 * shows, plus the dates the server rewrites on every save (sent back as
 * loaded), so nothing the portal manages is ever blanked from the phone.
 */
export function formToInput(kind: LeadKind, values: LeadFormValues): Record<string, unknown> {
  const editor = KIND_EDITORS[kind];
  const input: Record<string, unknown> = {
    [editor.nameField]: str(values[editor.nameField]).trim(),
    super_category_id: str(values.super_category_id).trim() || null,
    website: str(values.website).trim(),
    contacts: cleanContacts(values.contacts),
    lead_status: str(values.lead_status),
    priority: str(values.priority),
    assigned_user_id: str(values.assigned_user_id) || null,
    assigned_to: str(values.assigned_to).trim(),
    [editor.notesField]: str(values[editor.notesField]).trim(),
  };
  for (const field of editor.fields) {
    input[field.name] =
      field.type === 'int' || field.type === 'float'
        ? toNumber(values[field.name], field.type === 'int')
        : str(values[field.name]).trim();
  }
  for (const date of editor.preservedDates)
    input[date] = (values[date] as string | null | undefined) ?? null;
  if (editor.venueTypes) {
    const types = (values.venue_types as string[] | undefined) ?? [];
    input.venue_types = types;
    input.venue_type_other = types.includes('Other') ? str(values.venue_type_other).trim() : '';
  }
  return input;
}
