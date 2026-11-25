import { describe, expect, it } from 'vitest';
import {
  CRM_TEMPLATE_TARGET,
  crmHostTemplateValues,
  crmInterpolateTemplate,
  crmProviderToSelect,
  crmSeedTemplateValue,
  crmStripPlaceholders,
  crmTemplatePlaceholders,
  crmTemplatesFor,
  crmTextToHtml,
  crmVenueTemplateValues,
} from '../src/crm-email-compose';

/** The lead email composer's rules, the same on the CRM portal and in the CRM app. */
describe('crm email compose', () => {
  const templates = [
    { id: 'venue', target: 'VENUE', is_active: true },
    { id: 'host', target: 'HOST', is_active: true },
    { id: 'static', target: 'STATIC', is_active: true },
    { id: 'old', target: 'VENUE', is_active: false },
  ];

  it('offers a kind its own active templates and the static ones', () => {
    expect(crmTemplatesFor(templates, 'VENUE_LEAD').map((tpl) => tpl.id)).toEqual(['venue', 'static']);
    expect(crmTemplatesFor(templates, 'HOST_LEAD').map((tpl) => tpl.id)).toEqual(['host', 'static']);
    expect(crmTemplatesFor(templates, 'CREATOR_LEAD').map((tpl) => tpl.id)).toEqual(['static']);
    expect(CRM_TEMPLATE_TARGET.COMMUNITY_LEAD).toBe('STATIC');
    expect(CRM_TEMPLATE_TARGET.ECOMM_LEAD).toBe('ECOMM');
  });

  it('finds every distinct placeholder, spaced or not, and skips what is not one', () => {
    const text = 'Hi {{ name }}, {{name}} at {{venue.city}}! {{ }} {{bad-key}} {{{ x }} {{ unfinished';
    expect(crmTemplatePlaceholders(text)).toEqual(['name', 'venue.city', 'x']);
    expect(crmTemplatePlaceholders('No placeholders here')).toEqual([]);
  });

  it('fills placeholders from the values and empties the rest', () => {
    expect(crmInterpolateTemplate('Hi {{ name }}, see you in {{city}}.', { name: 'Asha' })).toBe('Hi Asha, see you in .');
    expect(crmStripPlaceholders('<p>{{ left }}over {{x}}</p>')).toBe('<p>over </p>');
  });

  it('starts a placeholder from the lead, the sample, then the name or email', () => {
    const lead = { venue_name: 'Grand Hall', city: '' };
    expect(crmSeedTemplateValue('venue_name', 'Sample hall', lead, 'Asha', 'a@b.in')).toBe('Grand Hall');
    expect(crmSeedTemplateValue('city', 'Pune', lead, 'Asha', 'a@b.in')).toBe('Pune');
    expect(crmSeedTemplateValue('Contact_Email', null, lead, 'Asha', 'a@b.in')).toBe('a@b.in');
    expect(crmSeedTemplateValue('first_name', undefined, lead, 'Asha', 'a@b.in')).toBe('Asha');
    expect(crmSeedTemplateValue('budget', '', lead, 'Asha', 'a@b.in')).toBe('');
  });

  it('turns a plain message into escaped HTML with line breaks', () => {
    expect(crmTextToHtml('Fish & <chips>\r\nline two\nthree')).toBe('Fish &amp; &lt;chips&gt;<br/>line two<br/>three');
  });

  it('picks the default provider when none or a stale one is selected', () => {
    const options = [
      { id: 'a', is_default: false },
      { id: 'b', is_default: true },
    ];
    expect(crmProviderToSelect([], '')).toBeNull();
    expect(crmProviderToSelect(options, '')).toBe('b');
    expect(crmProviderToSelect(options, 'gone')).toBe('b');
    expect(crmProviderToSelect(options, 'a')).toBeNull();
    expect(crmProviderToSelect([{ id: 'only', is_default: false }], '')).toBe('only');
  });
});

describe('crm template values', () => {
  const contacts = [{ name: 'Meera', email: 'meera@grandhall.in', mobile_number: '9812345678' }];

  it('maps a venue lead to every venue slug, blank where a field is empty', () => {
    expect(
      crmVenueTemplateValues({
        venue_name: 'Grand Hall',
        super_category: { name: 'Events' },
        space_type: 'Indoor',
        city: 'Pune',
        area: null,
        full_address: '12 MG Road',
        website: undefined,
        lead_status: 'New',
        priority: 'High',
        contacts,
      }),
    ).toEqual({
      venue_name: 'Grand Hall',
      super_category: 'Events',
      space_type: 'Indoor',
      city: 'Pune',
      area: '',
      full_address: '12 MG Road',
      contact_name: 'Meera',
      contact_email: 'meera@grandhall.in',
      contact_mobile: '9812345678',
      website: '',
      lead_status: 'New',
      priority: 'High',
    });
  });

  it('maps a host lead to every host slug, blank without a contact', () => {
    expect(crmHostTemplateValues({ host_name: 'Run Club', host_type: 'Club', super_category: null, contacts: [] })).toEqual({
      host_name: 'Run Club',
      organization_name: '',
      host_type: 'Club',
      super_category: '',
      city: '',
      area: '',
      contact_name: '',
      contact_email: '',
      contact_mobile: '',
      website: '',
      lead_status: '',
      priority: '',
    });
  });
});
