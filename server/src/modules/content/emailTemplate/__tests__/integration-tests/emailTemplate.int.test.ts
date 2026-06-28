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

  it('imports a real on-disk template by slug (disk-fallback path resolves)', async () => {
    // Guards the loadTemplate path fix: the .mjml must resolve from disk and be
    // auto-imported to the DB (this is what makes the prod reset-OTP email work).
    const tpl = await emailTemplateService.bySlug('password-reset-otp');
    expect(tpl).not.toBeNull();
    expect(tpl?.mjml).toContain('{{otp}}');
    expect(await EmailTemplateModel.countDocuments({ slug: 'password-reset-otp' })).toBe(1);
  });

  it('seedDefaults imports every on-disk template idempotently', async () => {
    await emailTemplateService.seedDefaults();
    const first = await EmailTemplateModel.countDocuments();
    expect(first).toBeGreaterThan(0);
    // Includes the new change/deletion OTP templates added for the auth flows.
    expect(await EmailTemplateModel.countDocuments({ slug: 'password-change-otp' })).toBe(1);
    expect(await EmailTemplateModel.countDocuments({ slug: 'account-deletion-otp' })).toBe(1);
    // Re-running must not duplicate (existing slugs are skipped).
    await emailTemplateService.seedDefaults();
    expect(await EmailTemplateModel.countDocuments()).toBe(first);
  });

  it('renders an imported template by slug end-to-end', async () => {
    const r = await emailTemplateService.render('password-reset-otp', {
      name: 'Riya',
      otp: '123456',
      expiresMinutes: '10',
    });
    expect(r.html).toContain('123456');
    expect(r.html.toLowerCase()).toContain('<html');
  });
});
