import type { Tpl } from '../../src/pages/email-templates-page/queries';

/**
 * Email-template mocks. `Tpl` is the tech portal's projection of the schema's
 * `EmailTemplate` type (the exact shape the editor + list consume), so the
 * factory is typed against it. Callers override `variables` to model declared
 * template variables.
 */
export const makeTpl = (over: Partial<Tpl> = {}): Tpl => ({
  template_id: 't1',
  slug: 'welcome',
  name: 'Welcome',
  subject: 'Hi',
  mjml: '<mjml></mjml>',
  description: '',
  variables: [],
  is_active: true,
  ...over,
});
