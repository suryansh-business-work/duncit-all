import { describe, expect, it } from 'vitest';
import {
  CRM_EMAIL_BRAND_GROUPS,
  CRM_EMAIL_HOST_VARIABLES,
  CRM_EMAIL_IMAGE_TYPES,
  CRM_EMAIL_VENUE_VARIABLES,
  crmEmailTemplateSlug,
  crmEmailVariablesFor,
  crmEmailVarsJson,
  crmForeignEmailVariables,
  crmInsertMjmlImage,
  crmMergeDetectedVariables,
} from '../src/crm-email-templates';

/** CRM › Email Templates: slug, variables offered per audience, image insert and the preview values. */

describe('crmEmailVariablesFor', () => {
  it('offers venue fields for venue templates and host fields for host templates', () => {
    expect(crmEmailVariablesFor('VENUE')).toBe(CRM_EMAIL_VENUE_VARIABLES);
    expect(crmEmailVariablesFor('HOST')).toBe(CRM_EMAIL_HOST_VARIABLES);
    expect(CRM_EMAIL_VENUE_VARIABLES[0]).toEqual({ slug: 'venue_name', labelKey: 'crm.emailTemplates.variableLabel.venueName' });
    expect(CRM_EMAIL_HOST_VARIABLES.map((v) => v.slug)).toContain('organization_name');
  });

  it('offers nothing for ecomm and static templates', () => {
    expect(crmEmailVariablesFor('ECOMM')).toEqual([]);
    expect(crmEmailVariablesFor('STATIC')).toEqual([]);
  });
});

describe('crmForeignEmailVariables', () => {
  it('keeps only the placeholders the audience does not offer', () => {
    expect(crmForeignEmailVariables(['venue_name', 'host_name', 'coupon'], 'VENUE')).toEqual(['host_name', 'coupon']);
    expect(crmForeignEmailVariables(['host_name'], 'HOST')).toEqual([]);
    expect(crmForeignEmailVariables(['city'], 'STATIC')).toEqual(['city']);
  });
});

describe('crmEmailTemplateSlug', () => {
  it('lower-cases the name and joins its words with single dashes', () => {
    expect(crmEmailTemplateSlug('  Diwali Offer 2026 ')).toBe('diwali-offer-2026');
    expect(crmEmailTemplateSlug('Venue -- Intro!!')).toBe('venue-intro');
  });

  it('drops dashes at either end, and is blank when nothing is usable', () => {
    expect(crmEmailTemplateSlug('***Hello***')).toBe('hello');
    expect(crmEmailTemplateSlug('***')).toBe('');
    expect(crmEmailTemplateSlug('')).toBe('');
  });
});

describe('crmInsertMjmlImage', () => {
  it('puts the image inside the first column', () => {
    expect(crmInsertMjmlImage('<mj-column><mj-text/></mj-column>', 'u')).toBe(
      '<mj-column><mj-text/>      <mj-image src="u" alt="" />\n    </mj-column>',
    );
  });

  it('adds a section before the body ends when there is no column', () => {
    expect(crmInsertMjmlImage('<mjml><mj-body></mj-body></mjml>', 'u')).toBe(
      '<mjml><mj-body>    <mj-section><mj-column>\n      <mj-image src="u" alt="" />\n    </mj-column></mj-section>\n  </mj-body></mjml>',
    );
  });

  it('appends the image when the MJML has no body', () => {
    expect(crmInsertMjmlImage('<mjml></mjml>', 'u')).toBe('<mjml></mjml>\n      <mj-image src="u" alt="" />\n');
  });
});

describe('crmEmailVarsJson', () => {
  it('maps each variable to its default value, blank when it has none', () => {
    expect(crmEmailVarsJson([{ key: 'city', sample: 'Pune' }, { key: 'area', sample: null }, { key: 'venue_name' }])).toBe(
      '{"city":"Pune","area":"","venue_name":""}',
    );
    expect(crmEmailVarsJson([])).toBe('{}');
  });
});

describe('crmMergeDetectedVariables', () => {
  it('declares the new placeholders once, after the declared ones, keeping those untouched', () => {
    const declared = [{ key: 'city', description: 'City', sample: 'Pune' }];
    expect(crmMergeDetectedVariables(declared, ['city', 'area', 'area', 'coupon'])).toEqual([
      { key: 'city', description: 'City', sample: 'Pune' },
      { key: 'area' },
      { key: 'coupon' },
    ]);
    expect(crmMergeDetectedVariables(declared, [])).toEqual(declared);
  });
});

describe('CRM_EMAIL_BRAND_GROUPS', () => {
  it('shelves logos whole, then banners and images filling their frames, each with its own copy', () => {
    expect(CRM_EMAIL_BRAND_GROUPS.map((g) => [g.kind, g.fit])).toEqual([
      ['LOGO', 'contain'],
      ['BANNER', 'cover'],
      ['IMAGE', 'cover'],
    ]);
    expect(CRM_EMAIL_BRAND_GROUPS[1]).toMatchObject({
      titleKey: 'crm.emailSettings.banners',
      moveKey: 'crm.emailSettings.moveToBanners',
    });
  });

  it('takes only the image types every mail app shows', () => {
    expect(CRM_EMAIL_IMAGE_TYPES).toEqual(['image/png', 'image/jpeg', 'image/gif']);
  });
});
