import { EMAIL, PHONE_INTL_PLUS, SOCIAL_HANDLE, isHostname } from '@duncit/regex';
import type { Translate } from '@duncit/shell';
import type { MarketingLeadImportMapping, MarketingLeadPipeline } from '../queries';

/**
 * Which column of the file holds which field. The header row is read for a
 * first guess ("Email", "Phone number", "IG handle"…) and the person corrects
 * it with a select per field; the rows are checked here the way the server
 * will check them, so the skipped ones show before anything is sent.
 */
export const IMPORT_FIELDS = ['name', 'company', 'email', 'phone', 'website', 'instagram_handle', 'city', 'tags'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Column index per field; null when the file has no such column. */
export type MappingState = Record<ImportField, number | null>;

export const FIELD_LABEL: Record<ImportField, string> = {
  name: 'marketing.leads.fieldName',
  company: 'marketing.leads.fieldCompany',
  email: 'marketing.leads.fieldEmail',
  phone: 'marketing.leads.fieldPhone',
  website: 'marketing.leads.fieldWebsite',
  instagram_handle: 'marketing.leads.fieldHandle',
  city: 'marketing.leads.fieldCity',
  tags: 'marketing.leads.fieldTags',
};

/** What a header is likely to say for each field, first match wins. */
const HEADER_HINTS: ReadonlyArray<[ImportField, RegExp]> = [
  ['instagram_handle', /insta|handle|ig\b/i],
  ['email', /mail/i],
  ['phone', /phone|mobile|whatsapp|contact no|number/i],
  ['website', /web|site|url/i],
  ['company', /company|business|organi[sz]ation|brand|venue/i],
  ['city', /city|town|location/i],
  ['tags', /tag|label/i],
  ['name', /name/i],
];

export const emptyMapping = (): MappingState => ({
  name: null,
  company: null,
  email: null,
  phone: null,
  website: null,
  instagram_handle: null,
  city: null,
  tags: null,
});

/** A first mapping read off the header: each field takes the first column whose header fits it and is still free. */
export function guessMapping(header: readonly string[]): MappingState {
  const mapping = emptyMapping();
  const taken = new Set<number>();
  for (const [field, hint] of HEADER_HINTS) {
    const index = header.findIndex((label, column) => !taken.has(column) && hint.test(label));
    if (index === -1) continue;
    mapping[field] = index;
    taken.add(index);
  }
  return mapping;
}

/** The mapping as the server takes it: only the fields that have a column. */
export function toServerMapping(state: MappingState, pipeline: MarketingLeadPipeline): MarketingLeadImportMapping {
  const mapping: MarketingLeadImportMapping = { name: state.name ?? -1, pipeline };
  for (const field of IMPORT_FIELDS) {
    const column = state[field];
    if (field !== 'name' && column !== null) mapping[field] = column;
  }
  return mapping;
}

/** Cells holding several values are split on commas or semicolons, as the server splits them. */
const LIST_SPLIT = /[;,]/;

const cell = (row: readonly string[], column: number | null): string => (column === null ? '' : (row[column] ?? '').trim());

const cells = (row: readonly string[], column: number | null): string[] =>
  cell(row, column)
    .split(LIST_SPLIT)
    .map((value) => value.trim())
    .filter(Boolean);

const isWebsite = (value: string): boolean => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return isHostname(url.hostname);
  } catch {
    return false;
  }
};

const isHandle = (value: string): boolean => SOCIAL_HANDLE.test(value.replace(/^@/, ''));

/** Why a row will be skipped, in the person's language, or '' when it will not. Mirrors the server's rowProblem. */
export function rowProblem(row: readonly string[], state: MappingState, t: Translate): string {
  if (!cell(row, state.name)) return t('marketing.leads.badName');
  const badEmail = cells(row, state.email).find((email) => !EMAIL.test(email));
  if (badEmail) return t('marketing.leads.badEmail', { vars: { value: badEmail } });
  const badPhone = cells(row, state.phone).find((phone) => !PHONE_INTL_PLUS.test(phone.replaceAll(/[\s()-]/g, '')));
  if (badPhone) return t('marketing.leads.badPhone', { vars: { value: badPhone } });
  const website = cell(row, state.website);
  if (website && !isWebsite(website)) return t('marketing.leads.badWebsite', { vars: { value: website } });
  const handle = cell(row, state.instagram_handle);
  if (handle && !isHandle(handle)) return t('marketing.leads.badHandle', { vars: { value: handle } });
  return '';
}

export interface RowCheck {
  /** 1-based, as the person counts rows in the file. */
  row: number;
  problem: string;
}

/** Every row that will be skipped, by number, with why. */
export const badRows = (rows: readonly string[][], state: MappingState, t: Translate): RowCheck[] =>
  rows
    .map((row, index) => ({ row: index + 1, problem: rowProblem(row, state, t) }))
    .filter((check) => check.problem !== '');
