import { describe, expect, it } from 'vitest';
import {
  CRM_DASH,
  CRM_LEAD_PRIORITY_TONE,
  CRM_LEAD_STATUS_TONE,
  crmDynamicValueText,
  crmFormatCapacity,
  crmFormatCount,
  crmJoinList,
  crmMapsUrl,
  crmParseDynamicValues,
  crmSafeHref,
  crmServicesHint,
  crmSocialCount,
  crmToneOf,
  crmWhatsappDigits,
} from '../src/crm-lead-detail';

/** What a lead's detail page prints, the same on the CRM portal and the CRM app. */
describe('crm lead detail values', () => {
  it('joins a list, or shows the dash when it is empty or missing', () => {
    expect(crmJoinList(['Mon', 'Tue'])).toBe('Mon, Tue');
    expect(crmJoinList([])).toBe(CRM_DASH);
    expect(crmJoinList(null)).toBe(CRM_DASH);
    expect(crmJoinList(undefined)).toBe(CRM_DASH);
  });

  it('prints a capacity from both ends, one end, or neither', () => {
    expect(crmFormatCapacity(20, 80)).toBe('20 – 80');
    expect(crmFormatCapacity(20, null)).toBe('20');
    expect(crmFormatCapacity(undefined, 80)).toBe('80');
    expect(crmFormatCapacity(0, null)).toBe('0');
    expect(crmFormatCapacity(null, undefined)).toBe(CRM_DASH);
  });

  it('groups a known count and dashes an unknown one', () => {
    expect(crmFormatCount(12400)).toBe((12400).toLocaleString());
    expect(crmFormatCount(0)).toBe('0');
    expect(crmFormatCount(null)).toBe(CRM_DASH);
    expect(crmFormatCount(undefined)).toBe(CRM_DASH);
  });

  it('opens only web addresses, adding https:// to a bare host', () => {
    expect(crmSafeHref('https://grandhall.in/menu')).toBe('https://grandhall.in/menu');
    expect(crmSafeHref(' http://grandhall.in ')).toBe('http://grandhall.in');
    expect(crmSafeHref('instagram.com/grandhall')).toBe('https://instagram.com/grandhall');
    expect(crmSafeHref('javascript:alert(1)')).toBeNull();
    expect(crmSafeHref('mailto:owner@grandhall.in')).toBeNull();
    expect(crmSafeHref('   ')).toBeNull();
  });

  it('colours a status or priority, and a value it does not know as default', () => {
    expect(crmToneOf(CRM_LEAD_STATUS_TONE, 'Won')).toBe('success');
    expect(crmToneOf(CRM_LEAD_STATUS_TONE, 'Lost')).toBe('error');
    expect(crmToneOf(CRM_LEAD_STATUS_TONE, 'Follow-up')).toBe('warning');
    expect(crmToneOf(CRM_LEAD_STATUS_TONE, 'Archived')).toBe('default');
    expect(crmToneOf(CRM_LEAD_PRIORITY_TONE, 'High')).toBe('error');
    expect(crmToneOf(CRM_LEAD_PRIORITY_TONE, null)).toBe('default');
    expect(crmToneOf(CRM_LEAD_PRIORITY_TONE, undefined)).toBe('default');
    expect(Object.keys(CRM_LEAD_STATUS_TONE)).toEqual(['New', 'Contacted', 'Qualified', 'Follow-up', 'Negotiation', 'Won', 'Lost']);
    expect(Object.keys(CRM_LEAD_PRIORITY_TONE)).toEqual(['Low', 'Medium', 'High']);
  });

  it('counts Instagram and every extra social link', () => {
    expect(crmSocialCount({ instagram_link: 'instagram.com/x', social_links: [{}, {}] })).toBe(3);
    expect(crmSocialCount({ instagram_link: '', social_links: [{}] })).toBe(1);
    expect(crmSocialCount({ instagram_link: 'instagram.com/x' })).toBe(1);
    expect(crmSocialCount({ social_links: null })).toBe(0);
  });

  it('names the first two services, a custom one by its own name', () => {
    expect(crmServicesHint([])).toBe('');
    expect(
      crmServicesHint([
        { service: 'Catering' },
        { service: 'Other', custom_name: 'Fire show' },
        { service: 'DJ' },
      ]),
    ).toBe('Catering, Fire show');
  });

  it('keeps only the digits of the WhatsApp number, else the mobile', () => {
    expect(crmWhatsappDigits('+91 98123-45678', '111')).toBe('919812345678');
    expect(crmWhatsappDigits(null, '98123 45678')).toBe('9812345678');
    expect(crmWhatsappDigits('', undefined)).toBe('');
  });

  it('links an address to Google Maps unless the lead has its own map link', () => {
    expect(crmMapsUrl('  ')).toBeNull();
    expect(crmMapsUrl('12 MG Road, Pune', 'https://maps.app.goo.gl/abc')).toBe('https://maps.app.goo.gl/abc');
    expect(crmMapsUrl('12 MG Road, Pune', null)).toBe('https://www.google.com/maps?q=12%20MG%20Road%2C%20Pune');
  });

  it('reads the dynamic values map, and anything but an object as empty', () => {
    expect(crmParseDynamicValues('{"parking":true}')).toEqual({ parking: true });
    expect(crmParseDynamicValues('')).toEqual({});
    expect(crmParseDynamicValues(null)).toEqual({});
    expect(crmParseDynamicValues('not json')).toEqual({});
    expect(crmParseDynamicValues('[1,2]')).toEqual({});
    expect(crmParseDynamicValues('null')).toEqual({});
    expect(crmParseDynamicValues('5')).toEqual({});
  });
});

describe('crmDynamicValueText', () => {
  const words = { yes: 'Yes', no: 'No', formatDate: (iso: string) => (iso.startsWith('2026') ? `on ${iso}` : '') };
  const text = { kind: 'text', options: [] };
  const select = { kind: 'select', options: [{ value: 'wifi', label: 'Wi-Fi' }, { value: 'ac', label: 'Air conditioning' }] };

  it('dashes an empty value', () => {
    expect(crmDynamicValueText(text, null, words)).toBe(CRM_DASH);
    expect(crmDynamicValueText(text, undefined, words)).toBe(CRM_DASH);
    expect(crmDynamicValueText(text, '', words)).toBe(CRM_DASH);
  });

  it('says Yes or No for a switch', () => {
    expect(crmDynamicValueText({ kind: 'boolean', options: [] }, true, words)).toBe('Yes');
    expect(crmDynamicValueText({ kind: 'boolean', options: [] }, false, words)).toBe('No');
  });

  it('prints a date in the admin format, or as stored when it cannot be read', () => {
    expect(crmDynamicValueText({ kind: 'date', options: [] }, '2026-09-25', words)).toBe('on 2026-09-25');
    expect(crmDynamicValueText({ kind: 'date', options: [] }, 'someday', words)).toBe('someday');
  });

  it('prints the labels of the picked options', () => {
    expect(crmDynamicValueText(select, 'ac', words)).toBe('Air conditioning');
    expect(crmDynamicValueText(select, 'pool', words)).toBe('pool');
    expect(crmDynamicValueText(select, ['wifi', 'ac'], words)).toBe('Wi-Fi, Air conditioning');
    expect(crmDynamicValueText(select, [], words)).toBe(CRM_DASH);
    expect(crmDynamicValueText(select, [null, 'wifi'], words)).toBe(', Wi-Fi');
  });

  it('prints any other value as text, an object as JSON', () => {
    expect(crmDynamicValueText(text, 'Rooftop', words)).toBe('Rooftop');
    expect(crmDynamicValueText(text, 42, words)).toBe('42');
    expect(crmDynamicValueText(text, true, words)).toBe('true');
    expect(crmDynamicValueText(text, { floor: 3 }, words)).toBe('{"floor":3}');
  });
});
