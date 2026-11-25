/**
 * The CRM lead email composer's rules — shared by the CRM portal's compose
 * window and the Duncit CRM app's, so a template binds, fills and sends the
 * same on both: which templates a lead kind may use, every {{ slug }} in a
 * template, the value each one starts with, the plain-text body as HTML and
 * the provider picked by default.
 */

/** The lead kinds that can be emailed (CrmEntityType). */
export type CrmComposeEntity = 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD' | 'CREATOR_LEAD' | 'COMMUNITY_LEAD';

/** A template's target per lead kind; creator and community leads have none of their own yet, so they get the static ones. */
export const CRM_TEMPLATE_TARGET: Readonly<Record<CrmComposeEntity, string>> = {
  VENUE_LEAD: 'VENUE',
  HOST_LEAD: 'HOST',
  ECOMM_LEAD: 'ECOMM',
  CREATOR_LEAD: 'STATIC',
  COMMUNITY_LEAD: 'STATIC',
};

/** The active templates a lead of this kind may be sent: its own target's and the static ones. */
export const crmTemplatesFor = <T extends { is_active: boolean; target: string }>(
  templates: readonly T[],
  entity: CrmComposeEntity,
): T[] => templates.filter((tpl) => tpl.is_active && (tpl.target === 'STATIC' || tpl.target === CRM_TEMPLATE_TARGET[entity]));

const isSlugChar = (char: string): boolean =>
  (char >= 'a' && char <= 'z') ||
  (char >= 'A' && char <= 'Z') ||
  (char >= '0' && char <= '9') ||
  char === '_' ||
  char === '.';

const isSpace = (char: string): boolean => char !== '' && char.trim() === '';

interface Placeholder {
  start: number;
  end: number;
  key: string;
}

/** A `{{ slug }}` starting at `open` (the first brace), or null when the text there is not one. */
function placeholderAt(text: string, open: number): Placeholder | null {
  let at = open + 2;
  while (isSpace(text.charAt(at))) at += 1;
  const keyStart = at;
  while (isSlugChar(text.charAt(at))) at += 1;
  if (at === keyStart) return null;
  const key = text.slice(keyStart, at);
  while (isSpace(text.charAt(at))) at += 1;
  return text.startsWith('}}', at) ? { start: open, end: at + 2, key } : null;
}

/** Every `{{ slug }}` in the text, in order (a slug is letters, digits, `_` and `.`). */
function scanPlaceholders(text: string): Placeholder[] {
  const found: Placeholder[] = [];
  let from = 0;
  let open = text.indexOf('{{', from);
  while (open >= 0) {
    const match = placeholderAt(text, open);
    if (match) found.push(match);
    from = match ? match.end : open + 1;
    open = text.indexOf('{{', from);
  }
  return found;
}

/** The text with each placeholder replaced by what `fill` returns for its slug. */
function replacePlaceholders(text: string, fill: (key: string) => string): string {
  let out = '';
  let last = 0;
  for (const match of scanPlaceholders(text)) {
    out += text.slice(last, match.start) + fill(match.key);
    last = match.end;
  }
  return out + text.slice(last);
}

/** Every distinct slug the text uses, first use first. */
export const crmTemplatePlaceholders = (text: string): string[] => [
  ...new Set(scanPlaceholders(text).map((match) => match.key)),
];

/** The text with every placeholder filled from `values`; a slug without a value becomes empty. */
export const crmInterpolateTemplate = (text: string, values: Readonly<Record<string, string>>): string =>
  replacePlaceholders(text, (key) => values[key] ?? '');

/** Removes any placeholder that survived rendering, so no raw slug is ever sent. */
export const crmStripPlaceholders = (text: string): string => replacePlaceholders(text, () => '');

/** A placeholder's starting value: the lead's value, else the template's sample, else the lead's name or email by the slug. */
export function crmSeedTemplateValue(
  slug: string,
  sample: string | null | undefined,
  leadValues: Readonly<Record<string, string>>,
  name: string,
  email: string,
): string {
  const fromLead = leadValues[slug];
  if (fromLead) return fromLead;
  if (sample) return sample;
  const lower = slug.toLowerCase();
  if (lower.includes('email')) return email;
  if (lower.includes('name')) return name;
  return '';
}

const escapeHtml = (text: string): string =>
  text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');

/** A plain-text message as the HTML body the server sends: escaped, each line break a `<br/>`. */
export const crmTextToHtml = (text: string): string => escapeHtml(text).split('\r\n').join('<br/>').split('\n').join('<br/>');

/**
 * The provider to select: the default (else the first) when nothing usable is
 * selected — none picked yet, or the picked one is no longer active. Null when
 * the selection should stay as it is or there is nothing to pick.
 */
export function crmProviderToSelect(
  options: readonly { id: string; is_default: boolean }[],
  current: string,
): string | null {
  const fallback = options.find((option) => option.is_default) ?? options[0];
  if (!fallback) return null;
  if (current && options.some((option) => option.id === current)) return null;
  return fallback.id;
}

type Text = string | null | undefined;

/** The parts of a lead the template values read: its primary contact and the shared fields. */
interface TemplateLead {
  super_category?: { name: string } | null;
  city?: Text;
  area?: Text;
  website?: Text;
  lead_status?: Text;
  priority?: Text;
  contacts: readonly { name?: Text; email?: Text; mobile_number?: Text }[];
}

const blank = (value: Text): string => value ?? '';

function sharedValues(lead: TemplateLead): Record<string, string> {
  const contact = lead.contacts[0];
  return {
    super_category: blank(lead.super_category?.name),
    city: blank(lead.city),
    area: blank(lead.area),
    contact_name: blank(contact?.name),
    contact_email: blank(contact?.email),
    contact_mobile: blank(contact?.mobile_number),
    website: blank(lead.website),
    lead_status: blank(lead.lead_status),
    priority: blank(lead.priority),
  };
}

/** Slug → value map from a venue lead, filled into its email templates (blank when a field is empty). */
export const crmVenueTemplateValues = (
  lead: TemplateLead & { venue_name?: Text; space_type?: Text; full_address?: Text },
): Record<string, string> => ({
  ...sharedValues(lead),
  venue_name: blank(lead.venue_name),
  space_type: blank(lead.space_type),
  full_address: blank(lead.full_address),
});

/** Slug → value map from a host lead, filled into its email templates (blank when a field is empty). */
export const crmHostTemplateValues = (
  lead: TemplateLead & { host_name?: Text; organization_name?: Text; host_type?: Text },
): Record<string, string> => ({
  ...sharedValues(lead),
  host_name: blank(lead.host_name),
  organization_name: blank(lead.organization_name),
  host_type: blank(lead.host_type),
});
