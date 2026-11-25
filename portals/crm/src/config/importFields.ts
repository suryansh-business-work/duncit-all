import {
  CRM_HOST_IMPORT_FIELDS,
  CRM_VENUE_IMPORT_FIELDS,
  crmImportAutoMatch,
  type CrmImportField,
} from '@duncit/utils';

/**
 * Canonical import fields per lead kind — mirrors the server VENUE/HOST columns.
 * The lists and the column matching live in @duncit/utils (crm-lead-lists),
 * shared with the Duncit CRM app's Excel import.
 */
export type ImportField = CrmImportField;

export const VENUE_IMPORT_FIELDS: ImportField[] = [...CRM_VENUE_IMPORT_FIELDS];

export const HOST_IMPORT_FIELDS: ImportField[] = [...CRM_HOST_IMPORT_FIELDS];

export const importFieldsFor = (entity: 'VENUE_LEAD' | 'HOST_LEAD') =>
  entity === 'VENUE_LEAD' ? VENUE_IMPORT_FIELDS : HOST_IMPORT_FIELDS;

/** Auto-match each field to the closest header by normalised name. */
export const autoMatch = (fields: ImportField[], headers: string[]): Record<string, string> =>
  crmImportAutoMatch(fields, headers);
