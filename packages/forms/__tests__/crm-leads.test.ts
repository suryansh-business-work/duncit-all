import { describe, expect, it } from 'vitest';
import {
  contactsSchemaFor,
  DUPLICATE_CHECK_DEBOUNCE_MS,
  duplicateCheckKey,
  emptyCrmContact,
  isWebUrl,
  makeCommunityLeadSchema,
  makeCreatorLeadSchema,
  makeEcommLeadSchema,
  makeHostLeadSchema,
  makeVenueLeadSchema,
  numeric,
  serviceOfferedSchema,
  SOCIAL_LINK_MAX,
  socialLinksSchema,
  urlish,
  withSocialLinks,
} from '../src/schemas';

/**
 * The CRM lead rules the CRM portal and the Duncit CRM app share. Echoing
 * keys keeps the localized messages assertable.
 */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => i.message);

const contact = (over: Partial<typeof emptyCrmContact> = {}) => ({ ...emptyCrmContact, ...over });

describe('field rules', () => {
  it('numeric takes a whole number or blank', () => {
    expect(numeric('Size').safeParse(' 42 ').success).toBe(true);
    expect(numeric('Size').safeParse('').success).toBe(true);
    expect(messages(numeric('Size').safeParse('4.2'))).toEqual(['Size must be a whole number']);
  });

  it('urlish takes blank, http(s) or www addresses only', () => {
    expect(urlish('Website').safeParse('www.cafe.in').success).toBe(true);
    expect(urlish('Website').safeParse('').success).toBe(true);
    expect(messages(urlish('Website').safeParse('cafe.in'))).toEqual(['Enter a valid website']);
    expect(messages(urlish('Website').safeParse(`https://${'a'.repeat(2050)}`))).toContain('Website is too long');
  });

  it('a service needs a catalogue value, and "Other" needs its own name', () => {
    expect(serviceOfferedSchema.safeParse({ service: 'Catering', custom_name: '', description: '' }).success).toBe(true);
    expect(messages(serviceOfferedSchema.safeParse({ service: '', custom_name: '', description: '' }))).toEqual(['Pick a service']);
    expect(messages(serviceOfferedSchema.safeParse({ service: 'Other', custom_name: ' ', description: '' }))).toEqual([
      'Enter a custom service name',
    ]);
  });

  it('isWebUrl accepts http(s) and refuses other schemes and non-URLs', () => {
    expect(isWebUrl('https://instagram.com/x')).toBe(true);
    expect(isWebUrl('http://x.in')).toBe(true);
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('not a url')).toBe(false);
  });
});

describe('contacts', () => {
  const schema = contactsSchemaFor(t);

  it('needs at least one row, with no field required', () => {
    expect(schema.safeParse([contact()]).success).toBe(true);
    expect(messages(schema.safeParse([]))).toEqual(['Add at least one contact']);
  });

  it('refuses a bad phone or email on a row', () => {
    expect(messages(schema.safeParse([contact({ mobile_number: 'call me' })]))).toEqual(['Enter a valid number']);
    expect(messages(schema.safeParse([contact({ email: 'nope' })]))).toEqual(['Enter a valid email']);
  });

  it('refuses the same phone (by its last ten digits) or email twice on one lead', () => {
    const phones = schema.safeParse([contact({ mobile_number: '+91 98110 00001' }), contact({ mobile_number: '9811000001' })]);
    expect(messages(phones)).toEqual(['crm.duplicates.phoneRepeated']);
    const emails = schema.safeParse([contact({ email: 'A@x.in' }), contact({ email: 'a@x.in' })]);
    expect(messages(emails)).toEqual(['crm.duplicates.emailRepeated']);
  });

  it('ignores numbers too short to compare', () => {
    expect(schema.safeParse([contact({ mobile_number: '123' }), contact({ mobile_number: '123' })]).success).toBe(true);
  });
});

describe('social links', () => {
  const schema = socialLinksSchema(t);

  it('allows a blank row and a named row with a web address', () => {
    expect(schema.safeParse([{ name: '', url: '' }, { name: 'YouTube', url: 'https://youtube.com/x' }]).success).toBe(true);
  });

  it('needs the link of a named row, and only web addresses', () => {
    expect(messages(schema.safeParse([{ name: 'YouTube', url: '' }]))).toEqual(['crm.forms.socialLinkRequired']);
    expect(messages(schema.safeParse([{ name: '', url: 'ftp://x' }]))).toEqual(['crm.forms.socialLinkInvalid']);
  });

  it('caps the number of links', () => {
    const rows = Array.from({ length: SOCIAL_LINK_MAX + 1 }, () => ({ name: '', url: '' }));
    expect(messages(schema.safeParse(rows))).toEqual([`crm.forms.socialLinksTooMany:{"max":${SOCIAL_LINK_MAX}}`]);
  });

  it('withSocialLinks adds the links, and the Instagram field when asked', () => {
    const base = makeHostLeadSchema(t);
    expect(withSocialLinks(base, t).safeParse({ ...hostLead(), social_links: [] }).success).toBe(true);
    const venue = withSocialLinks(makeVenueLeadSchema(t), t, true);
    expect(messages(venue.safeParse({ ...venueLead(), social_links: [], instagram_link: 'insta' }))).toEqual(['crm.forms.socialLinkInvalid']);
  });
});

const tracking = { lead_status: 'New', priority: 'Medium', services_offered: [], contacts: [contact()] };

const venueLead = () => ({
  ...tracking,
  super_category_id: 'sc1',
  venue_name: 'Smash Arena',
  venue_types: ['Rooftop'],
  venue_type_other: '',
  city: 'Pune',
  full_address: 'Plot 12, Baner',
  capacity_min: '',
  capacity_max: '200',
  expected_charges: '',
  security_deposit: '',
  map_link: '',
  website: '',
});

const hostLead = () => ({
  ...tracking,
  super_category_id: 'sc1',
  host_name: 'Run Club',
  community_size: '',
  past_attendees: '',
  instagram_link: '',
  community_link: '',
  website: '',
});

describe('lead schemas', () => {
  it('venue: valid, and "Other" needs its description', () => {
    const schema = makeVenueLeadSchema(t);
    expect(schema.safeParse(venueLead()).success).toBe(true);
    expect(messages(schema.safeParse({ ...venueLead(), venue_types: ['Other'] }))).toEqual(['Please specify the "Other" venue type']);
    expect(messages(schema.safeParse({ ...venueLead(), venue_name: 'A', venue_types: [], full_address: 'abc' }))).toEqual([
      'Venue name is too short',
      'Select at least one venue type',
      'Address is too short',
    ]);
  });

  it('host and ecomm need a name and the tracking fields', () => {
    expect(makeHostLeadSchema(t).safeParse(hostLead()).success).toBe(true);
    expect(messages(makeHostLeadSchema(t).safeParse({ ...hostLead(), lead_status: '' }))).toEqual(['Lead status is required']);
    const ecomm = { ...tracking, super_category_id: 'sc1', seller_name: 'Pawfect', brand_name: '', gst_number: '', website: '', instagram_link: '' };
    expect(makeEcommLeadSchema(t).safeParse(ecomm).success).toBe(true);
    expect(messages(makeEcommLeadSchema(t).safeParse({ ...ecomm, seller_name: '' }))).toContain('Seller name is required');
  });

  it('creator: an engagement rate is a percentage', () => {
    const creator = {
      ...tracking,
      super_category_id: 'sc1',
      website: '',
      instagram_link: '',
      social_links: [],
      creator_name: 'Riya Runs',
      handle: '',
      followers_count: '1200',
      engagement_rate: '4.5',
      rate_card: '',
    };
    expect(makeCreatorLeadSchema(t).safeParse(creator).success).toBe(true);
    expect(messages(makeCreatorLeadSchema(t).safeParse({ ...creator, engagement_rate: '140' }))).toEqual(['crm.creatorLeads.engagementInvalid']);
    expect(messages(makeCreatorLeadSchema(t).safeParse({ ...creator, engagement_rate: 'lots' }))).toEqual(['crm.creatorLeads.engagementInvalid']);
  });

  it('community: localized name and status messages', () => {
    const community = {
      ...tracking,
      super_category_id: '',
      website: '',
      instagram_link: '',
      social_links: [],
      community_name: '',
      member_count: '',
      community_link: '',
    };
    expect(messages(makeCommunityLeadSchema(t).safeParse(community))).toEqual([
      'crm.prospectLeads.superCategoryRequired',
      'crm.communityLeads.nameRequired',
      'crm.communityLeads.nameTooShort',
    ]);
  });
});

describe('duplicateCheckKey', () => {
  it('is empty when nothing typed could identify another lead', () => {
    expect(duplicateCheckKey(undefined, undefined)).toBe('');
    expect(duplicateCheckKey([{ mobile_number: '98110', email: 'not-an-email' }, null], '  ')).toBe('');
  });

  it('keeps phones of 7+ digits and emails with @, trimmed, and drops rows with neither', () => {
    const key = duplicateCheckKey(
      [
        { mobile_number: ' 98110 00001 ', email: '' },
        { mobile_number: '12', email: ' mira@paws.in ' },
        { mobile_number: '', email: '' },
        { mobile_number: 9811000001, email: null },
      ],
      '',
    );
    expect(JSON.parse(key)).toEqual({
      contacts: [
        { mobile_number: '98110 00001', email: '' },
        { mobile_number: '', email: 'mira@paws.in' },
      ],
      website: '',
    });
  });

  it('checks a website alone, and is stable for the same values so a debounce compares by value', () => {
    const a = duplicateCheckKey([], ' paws.in ');
    expect(JSON.parse(a)).toEqual({ contacts: [], website: 'paws.in' });
    expect(duplicateCheckKey([], 'paws.in')).toBe(a);
    expect(DUPLICATE_CHECK_DEBOUNCE_MS).toBe(500);
  });
});
