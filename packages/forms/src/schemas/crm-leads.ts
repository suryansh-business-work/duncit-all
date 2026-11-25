import { z } from 'zod';
import { CONTACT_KEY_MIN_DIGITS, phoneKey } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * The CRM lead forms' rules — venue, host, ecomm, creator and community — so
 * the CRM portal and the Duncit CRM Android app refuse exactly the same input
 * with the same messages (CLAUDE.md: CRM app ↔ CRM portal parity).
 *
 * Moved here unchanged from portals/crm/src/forms (the portal re-exports them
 * under their old names). The venue, host and ecomm schemas still carry their
 * English messages as they always have; contacts, social links and the
 * creator/community schemas take the surface's translator.
 */

/** Whole-number-or-blank string field (e.g. capacity, community size). */
export const numeric = (label: string) => z.string().trim().regex(/^\d*$/, `${label} must be a whole number`);

/** Lenient phone string (digits, +, -, spaces; up to 20 chars). */
export const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{0,20}$/, 'Enter a valid number');

/** Optional email — empty allowed, otherwise must be a valid email. */
const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email');

/** A single contact row. Every field is optional, the primary row included. */
export const contactSchema = z.object({
  name: z.string().trim().max(80, 'Name is too long'),
  role: z.string().trim().max(80, 'Role is too long'),
  mobile_number: phone,
  whatsapp_number: phone,
  email: optionalEmail,
});

export type CrmContactValues = z.infer<typeof contactSchema>;

/** A blank contact row — what "Add contact" appends. */
export const emptyCrmContact: CrmContactValues = { name: '', role: '', mobile_number: '', whatsapp_number: '', email: '' };

/** A phone by its last ten digits, as the server's duplicate check compares it; '' below seven digits. */
const phoneRepeatKey = (value: string): string => {
  const key = phoneKey(value);
  return key.length >= CONTACT_KEY_MIN_DIGITS ? key : '';
};

/** Each contact field one lead may not repeat, how it is compared, and the message. */
const REPEAT_KEYS: ReadonlyArray<readonly [keyof CrmContactValues, (value: string) => string, string]> = [
  ['mobile_number', phoneRepeatKey, 'crm.duplicates.phoneRepeated'],
  ['email', (value) => value.trim().toLowerCase(), 'crm.duplicates.emailRepeated'],
];

/**
 * Contacts array (row 0 is the primary contact). No field is required, but one
 * lead cannot list the same phone or email on two contacts. The same value on
 * another lead is refused by the server's duplicate check on save.
 */
export const contactsSchemaFor = (t: Translate) =>
  z
    .array(contactSchema)
    .min(1, 'Add at least one contact')
    .superRefine((arr, ctx) => {
      for (const [field, keyOf, messageKey] of REPEAT_KEYS) {
        const seen = new Set<string>();
        arr.forEach((row, index) => {
          const key = keyOf(row[field]);
          if (!key) return;
          if (seen.has(key)) ctx.addIssue({ code: 'custom', path: [index, field], message: t(messageKey) });
          seen.add(key);
        });
      }
    });

/** A URL-ish string: blank ok, otherwise must look like a URL. */
export const urlish = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, `${label} is too long`)
    .refine((v) => !v || /^(https?:\/\/|www\.)/i.test(v), `Enter a valid ${label.toLowerCase()}`);

/** A "service offered" row: catalogue value required; "Other" needs a custom name. */
export const serviceOfferedSchema = z
  .object({
    service: z.string().trim().min(1, 'Pick a service'),
    custom_name: z.string().trim().max(80, 'Name is too long'),
    description: z.string().trim().max(500, 'Description is too long'),
  })
  .superRefine((row, ctx) => {
    if (row.service === 'Other' && !row.custom_name.trim()) {
      ctx.addIssue({ code: 'custom', path: ['custom_name'], message: 'Enter a custom service name' });
    }
  });

/** Caps shared with the server (`cleanSocialLinks` in crm.service.ts). */
export const SOCIAL_LINK_MAX = 20;
export const SOCIAL_NAME_MAX = 60;

/** A web address: parsed by the URL parser, http(s) only — never "javascript:". */
export function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * The extra social links every lead form has (beyond its main Instagram link).
 * A row left completely blank is allowed and dropped on save; a row with a
 * name needs its link, and every link must be a full web address.
 */
export const socialLinksSchema = (t: Translate) =>
  z
    .array(
      z
        .object({
          name: z.string().trim().max(SOCIAL_NAME_MAX, t('crm.forms.socialNameTooLong', { vars: { max: SOCIAL_NAME_MAX } })),
          url: z
            .string()
            .trim()
            .max(2048, t('crm.forms.socialLinkTooLong'))
            .refine((v) => v === '' || isWebUrl(v), t('crm.forms.socialLinkInvalid')),
        })
        .superRefine((row, ctx) => {
          if (row.name.trim() && !row.url.trim()) {
            ctx.addIssue({ code: 'custom', path: ['url'], message: t('crm.forms.socialLinkRequired') });
          }
        })
    )
    .max(SOCIAL_LINK_MAX, t('crm.forms.socialLinksTooMany', { vars: { max: SOCIAL_LINK_MAX } }));

/**
 * A lead form's schema plus its social links. An intersection rather than
 * `.extend()`, because some lead schemas carry refinements, which Zod refuses
 * to extend. `withInstagram` adds the main Instagram field for a schema that
 * predates it (venue leads).
 */
export function withSocialLinks<S extends z.ZodType>(schema: S, t: Translate, withInstagram = false) {
  const extra = z.object({
    social_links: socialLinksSchema(t),
    ...(withInstagram
      ? {
          instagram_link: z
            .string()
            .trim()
            .max(2048, t('crm.forms.socialLinkTooLong'))
            .refine((v) => v === '' || isWebUrl(v), t('crm.forms.socialLinkInvalid')),
        }
      : {}),
  });
  return schema.and(extra);
}

/** A required display name between 2 and 120 characters. */
const displayName = (required: string, tooShort: string, tooLong: string) =>
  z.string().trim().min(1, required).min(2, tooShort).max(120, tooLong);

const tracking = {
  lead_status: z.string().min(1, 'Lead status is required'),
  priority: z.string().min(1, 'Priority is required'),
};

export const makeVenueLeadSchema = (t: Translate) =>
  z
    .object({
      super_category_id: z.string().trim().min(1, 'Super category is required'),
      venue_name: displayName('Venue name is required', 'Venue name is too short', 'Venue name is too long'),
      venue_types: z.array(z.string()).min(1, 'Select at least one venue type'),
      venue_type_other: z.string(),
      city: z.string().trim().min(1, 'City is required'),
      full_address: z.string().trim().min(1, 'Full address is required').min(5, 'Address is too short'),
      capacity_min: numeric('Minimum capacity'),
      capacity_max: numeric('Maximum capacity'),
      expected_charges: numeric('Expected charges'),
      security_deposit: numeric('Security deposit'),
      map_link: z.string().trim().max(2048, 'Map link is too long'),
      website: urlish('Website'),
      services_offered: z.array(serviceOfferedSchema),
      contacts: contactsSchemaFor(t),
      ...tracking,
    })
    .superRefine((v, ctx) => {
      if (v.venue_types.includes('Other') && !v.venue_type_other.trim()) {
        ctx.addIssue({ code: 'custom', path: ['venue_type_other'], message: 'Please specify the "Other" venue type' });
      }
    });

export const makeHostLeadSchema = (t: Translate) =>
  z.object({
    super_category_id: z.string().trim().min(1, 'Super category is required'),
    host_name: displayName('Host name is required', 'Host name is too short', 'Host name is too long'),
    community_size: numeric('Community size'),
    past_attendees: numeric('Past attendees'),
    instagram_link: z.string().trim().max(2048, 'Instagram link is too long'),
    community_link: z.string().trim().max(2048, 'Community link is too long'),
    website: urlish('Website'),
    services_offered: z.array(serviceOfferedSchema),
    contacts: contactsSchemaFor(t),
    ...tracking,
  });

export const makeEcommLeadSchema = (t: Translate) =>
  z.object({
    super_category_id: z.string().trim().min(1, 'Super category is required'),
    seller_name: displayName('Seller name is required', 'Seller name is too short', 'Seller name is too long'),
    brand_name: z.string().trim().max(120, 'Brand name is too long'),
    gst_number: z.string().trim().max(20, 'GST number is too long'),
    website: urlish('Website'),
    instagram_link: z.string().trim().max(2048, 'Instagram link is too long'),
    services_offered: z.array(serviceOfferedSchema),
    contacts: contactsSchemaFor(t),
    ...tracking,
  });

/** The backbone creator and community leads share. */
const prospectBackbone = (t: Translate) => ({
  super_category_id: z.string().trim().min(1, t('crm.prospectLeads.superCategoryRequired')),
  website: urlish('Website'),
  instagram_link: z.string().trim().max(2048, t('crm.prospectLeads.linkTooLong')),
  contacts: contactsSchemaFor(t),
  social_links: socialLinksSchema(t),
  services_offered: z.array(serviceOfferedSchema),
  lead_status: z.string().min(1, t('crm.prospectLeads.statusRequired')),
  priority: z.string().min(1, t('crm.prospectLeads.priorityRequired')),
});

/** Blank, or a number from 0 to 100 (decimals allowed). */
const percent = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100), message);

export const makeCreatorLeadSchema = (t: Translate) =>
  z.object({
    ...prospectBackbone(t),
    creator_name: displayName(t('crm.creatorLeads.nameRequired'), t('crm.creatorLeads.nameTooShort'), t('crm.creatorLeads.nameTooLong')),
    handle: z.string().trim().max(80, t('crm.creatorLeads.handleTooLong')),
    followers_count: numeric(t('crm.creatorLeads.followers')),
    engagement_rate: percent(t('crm.creatorLeads.engagementInvalid')),
    rate_card: z.string().trim().max(500, t('crm.creatorLeads.rateCardTooLong')),
  });

export const makeCommunityLeadSchema = (t: Translate) =>
  z.object({
    ...prospectBackbone(t),
    community_name: displayName(
      t('crm.communityLeads.nameRequired'),
      t('crm.communityLeads.nameTooShort'),
      t('crm.communityLeads.nameTooLong')
    ),
    member_count: numeric(t('crm.communityLeads.members')),
    community_link: z.string().trim().max(2048, t('crm.prospectLeads.linkTooLong')),
  });

/** The lead forms' live duplicate check waits this long after typing stops, so typing a number is one request, not ten. */
export const DUPLICATE_CHECK_DEBOUNCE_MS = 500;
/** Fewer digits cannot identify a lead; the server ignores them too. */
const DUPLICATE_MIN_PHONE_DIGITS = 7;

/** What the duplicate check sends: the typed phones and emails worth checking, and the website. */
export interface DuplicateCheckValues {
  contacts: { mobile_number: string; email: string }[];
  website: string;
}

const digitCount = (value: string) => [...value].filter((ch) => ch >= '0' && ch <= '9').length;
const trimmedText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * The values worth checking for duplicates, as a stable string so a debounce
 * compares by value; '' when nothing typed could match another lead. The CRM
 * portal and the CRM app send exactly this to crmLeadDuplicates.
 */
export function duplicateCheckKey(contacts: unknown, website: unknown): string {
  const rows = Array.isArray(contacts) ? (contacts as Array<Record<string, unknown> | null>) : [];
  const values: DuplicateCheckValues = {
    contacts: rows
      .map((row) => {
        const mobile = trimmedText(row?.mobile_number);
        const email = trimmedText(row?.email);
        return { mobile_number: digitCount(mobile) >= DUPLICATE_MIN_PHONE_DIGITS ? mobile : '', email: email.includes('@') ? email : '' };
      })
      .filter((row) => row.mobile_number || row.email),
    website: trimmedText(website),
  };
  return values.contacts.length > 0 || values.website ? JSON.stringify(values) : '';
}
