import type { CrmTone } from './crm-quality-labels';
import { crmServiceLabel } from './crm-dashboard';

/**
 * What a CRM lead's detail page prints for its values — shared by the CRM
 * portal's lead pages and the Duncit CRM app's lead tabs, so both show the
 * same dash, the same list, the same link and the same status colour.
 */

/** The placeholder every empty detail value shows. */
export const CRM_DASH = '—';

/** A list as one line ("Mon, Tue"), or the dash when there is nothing in it. */
export const crmJoinList = (values?: readonly string[] | null): string =>
  values?.length ? values.join(', ') : CRM_DASH;

/** A venue's capacity: "20 – 80", one end when only one is set, or the dash. */
export function crmFormatCapacity(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return CRM_DASH;
  if (min != null && max != null) return `${min} – ${max}`;
  return String(min ?? max);
}

/** A count in the reader's grouping (12,400), or the dash when it is not known. */
export const crmFormatCount = (value?: number | null): string =>
  value === null || value === undefined ? CRM_DASH : value.toLocaleString();

/**
 * The link to open, or null when the value is not a web address. A bare
 * "instagram.com/x" becomes https://; any other scheme (javascript:, data:)
 * is never handed to the browser.
 */
export function crmSafeHref(href: string): string | null {
  const value = href.trim();
  for (const candidate of [value, `https://${value}`]) {
    try {
      const { protocol } = new URL(candidate);
      return protocol === 'https:' || protocol === 'http:' ? candidate : null;
    } catch {
      // Not parseable as-is; try it as a bare host next.
    }
  }
  return null;
}

/** The pipeline stage chip's tone, as the lead pages colour it. */
export const CRM_LEAD_STATUS_TONE: Readonly<Record<string, CrmTone>> = {
  New: 'info',
  Contacted: 'info',
  Qualified: 'info',
  'Follow-up': 'warning',
  Negotiation: 'warning',
  Won: 'success',
  Lost: 'error',
};

/** The priority chip's tone. */
export const CRM_LEAD_PRIORITY_TONE: Readonly<Record<string, CrmTone>> = {
  Low: 'default',
  Medium: 'info',
  High: 'error',
};

/** A tone from one of the maps above, `default` for a value they do not know. */
export const crmToneOf = (map: Readonly<Record<string, CrmTone>>, value: string | null | undefined): CrmTone =>
  (value && map[value]) || 'default';

/** How many social channels a lead has: its Instagram plus every extra link. */
export const crmSocialCount = (lead: {
  instagram_link?: string | null;
  social_links?: readonly unknown[] | null;
}): number => (lead.social_links?.length ?? 0) + (lead.instagram_link ? 1 : 0);

/** The first two services by name ("Catering, DJ"), the stat tile's hint; empty when none are tagged. */
export const crmServicesHint = (
  services: readonly { service?: string | null; custom_name?: string | null }[],
): string => services.slice(0, 2).map(crmServiceLabel).join(', ');

/** The digits a wa.me chat link takes, from the WhatsApp number or else the mobile. */
export const crmWhatsappDigits = (whatsapp?: string | null, mobile?: string | null): string =>
  Array.from(whatsapp || mobile || '')
    .filter((char) => char >= '0' && char <= '9')
    .join('');

/** A Google Maps search for the address — the lead's own map link wins when it has one. */
export function crmMapsUrl(address: string, mapLink?: string | null): string | null {
  const query = address.trim();
  if (!query) return null;
  return mapLink || `https://www.google.com/maps?q=${encodeURIComponent(query)}`;
}

/** A dynamic field as the lead pages print it (the parts of CrmDynamicField they read). */
export interface CrmDynamicFieldLike {
  kind: string;
  options: readonly { value: string; label: string }[];
}

/** The words a dynamic value is printed with; `formatDate` is the surface's admin date format. */
export interface CrmDynamicValueWords {
  yes: string;
  no: string;
  formatDate: (iso: string) => string;
}

/** A lead's dynamic values map (JSON on the lead); a broken or empty string is an empty map. */
export function crmParseDynamicValues(json: string | null | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Dynamic values come from JSON, so a printable value is a scalar; objects
 * are JSON-stringified rather than becoming `[object Object]`.
 */
const toText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

/** One dynamic value as text: Yes / No, the admin date, the picked options' labels, or the value itself. */
export function crmDynamicValueText(field: CrmDynamicFieldLike, raw: unknown, words: CrmDynamicValueWords): string {
  if (raw === null || raw === undefined || raw === '') return CRM_DASH;
  if (field.kind === 'boolean') return raw ? words.yes : words.no;
  if (field.kind === 'date') {
    const shown = words.formatDate(toText(raw));
    if (shown) return shown;
  }
  if (field.kind === 'select') {
    const labelFor = (value: unknown) => field.options.find((option) => option.value === value)?.label ?? toText(value);
    if (Array.isArray(raw)) return raw.length ? raw.map(labelFor).join(', ') : CRM_DASH;
    return labelFor(raw);
  }
  return toText(raw);
}
