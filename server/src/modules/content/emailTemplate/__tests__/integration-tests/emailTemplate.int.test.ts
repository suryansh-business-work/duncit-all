import { emailTemplateService } from '../../emailTemplate.service';
import { EmailTemplateModel } from '../../emailTemplate.model';

const base = {
  slug: 'welcome-blast',
  name: 'Welcome Blast',
  subject: 'Welcome {{name}}',
  mjml: '<mjml><mj-body><mj-text>Hi {{name}}</mj-text></mj-body></mjml>',
};

describe('emailTemplateService integration', () => {
  it('creates, lists, fetches and updates a template', async () => {
    const created = await emailTemplateService.create(base);
    expect(created.slug).toBe('welcome-blast');

    expect(await emailTemplateService.list()).toHaveLength(1);
    expect((await emailTemplateService.byId(created.template_id))?.name).toBe('Welcome Blast');

    const updated = await emailTemplateService.update(created.template_id, { subject: 'Hey {{name}}' });
    expect(updated.subject).toBe('Hey {{name}}');
  });

  it('prevents duplicate slugs and deletes templates', async () => {
    const created = await emailTemplateService.create(base);
    await expect(emailTemplateService.create(base)).rejects.toThrow(/already exists/i);

    expect(await emailTemplateService.delete(created.template_id)).toBe(true);
    expect(await EmailTemplateModel.countDocuments()).toBe(0);
  });

  it('returns null for an unknown slug with no disk fallback', async () => {
    expect(await emailTemplateService.bySlug('totally-unknown-slug')).toBeNull();
  });
});
