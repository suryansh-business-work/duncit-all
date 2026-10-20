import {
  detectVariables,
  applyVars,
  renderMjml,
  emailTemplateService,
} from '../../emailTemplate.service';
import { emailTemplateResolvers } from '../../emailTemplate.resolver';
import { TEMPLATE_DEFAULTS } from '../../emailTemplate.defaults';
import {
  LEGACY_FRAGMENT_FINGERPRINTS,
  LEGACY_TEMPLATE_FINGERPRINTS,
  shippedFingerprint,
} from '../../emailTemplate.legacy';
import { FRAGMENT_DEFAULTS } from '@modules/content/emailFragment/emailFragment.defaults';
import { makeContext } from '@test/harness';

describe('emailTemplate unit', () => {
  it('detectVariables extracts unique {{ var }} names', () => {
    expect(detectVariables('Hi {{ name }}, code {{code}}, again {{ name }}')).toEqual(['name', 'code']);
  });

  it('applyVars substitutes values', () => {
    expect(applyVars('Hi {{name}}!', { name: 'Bob' })).toBe('Hi Bob!');
  });

  it('renderMjml substitutes vars and compiles to HTML', async () => {
    const { html, errors } = await renderMjml(
      '<mjml><mj-body><mj-section><mj-column><mj-text>{{x}}</mj-text></mj-column></mj-section></mj-body></mjml>',
      { x: 'Yo' }
    );
    expect(Array.isArray(errors)).toBe(true);
    expect(html).toContain('Yo');
    expect(html.toLowerCase()).toContain('<html');
  });

  it('emailTemplates query is gated to admin roles', () => {
    expect(() =>
      (emailTemplateResolvers.Query as any).emailTemplates({}, {}, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });

  it('service exposes list/create helpers', () => {
    expect(typeof emailTemplateService.create).toBe('function');
  });

  it('starter body and reset are gated to admin roles, and is_shipped follows the catalogue', () => {
    const user = makeContext({ roles: ['USER'] });
    expect(() => (emailTemplateResolvers.Query as any).emailStarterMjml({}, {}, user)).toThrow(/access denied/i);
    expect(() =>
      (emailTemplateResolvers.Mutation as any).resetEmailTemplate({}, { template_id: 'x' }, user)
    ).toThrow(/access denied/i);
    expect(emailTemplateResolvers.EmailTemplate.is_shipped({ slug: 'password-reset-otp' })).toBe(true);
    expect(emailTemplateResolvers.EmailTemplate.is_shipped({ slug: 'an-admin-made-one' })).toBe(false);
  });
});

/**
 * The upgrade table is what moves an untouched stored body onto the current
 * design. A shipped template with no legacy fingerprint can never be upgraded,
 * and the CURRENT default listed as legacy would mean the table was generated
 * after the builders changed instead of before.
 */
describe('emailTemplate legacy fingerprints', () => {
  it('lists earlier shipped bodies for every shipped template, never the current one', () => {
    for (const tpl of TEMPLATE_DEFAULTS) {
      const legacy = LEGACY_TEMPLATE_FINGERPRINTS[tpl.slug] ?? [];
      expect({ slug: tpl.slug, hasLegacy: legacy.length > 0 }).toEqual({ slug: tpl.slug, hasLegacy: true });
      expect(legacy).not.toContain(shippedFingerprint(tpl.mjml));
    }
  });

  it('lists earlier header and footer fragments for every category, never the current ones', () => {
    for (const frag of FRAGMENT_DEFAULTS) {
      const legacy = LEGACY_FRAGMENT_FINGERPRINTS[frag.category];
      expect(legacy.header.length).toBeGreaterThan(0);
      expect(legacy.footer.length).toBeGreaterThan(0);
      expect(legacy.header).not.toContain(shippedFingerprint(frag.header_mjml));
      expect(legacy.footer).not.toContain(shippedFingerprint(frag.footer_mjml));
    }
  });
});
