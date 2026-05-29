import {
  detectVariables,
  applyVars,
  renderMjml,
  emailTemplateService,
} from '../../emailTemplate.service';
import { emailTemplateResolvers } from '../../emailTemplate.resolver';
import { makeContext } from '@test/harness';

describe('emailTemplate unit', () => {
  it('detectVariables extracts unique {{ var }} names', () => {
    expect(detectVariables('Hi {{ name }}, code {{code}}, again {{ name }}')).toEqual(['name', 'code']);
  });

  it('applyVars substitutes values', () => {
    expect(applyVars('Hi {{name}}!', { name: 'Bob' })).toBe('Hi Bob!');
  });

  it('renderMjml substitutes vars and compiles to HTML', () => {
    const { html, errors } = renderMjml(
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
});
