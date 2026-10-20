import { emailTemplateService, shippedDefault } from '../../emailTemplate.service';
import { EmailTemplateModel } from '../../emailTemplate.model';
import { STARTER_MJML } from '@services/email/catalogue/starter';

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

  it('returns null for an unknown slug with no shipped default', async () => {
    expect(await emailTemplateService.bySlug('totally-unknown-slug')).toBeNull();
  });

  it('seeds a shipped template by slug on first read', async () => {
    // The shipped default must be created in the DB on its first read
    // (this is what makes the reset-OTP email work on a fresh database).
    const tpl = await emailTemplateService.bySlug('password-reset-otp');
    expect(tpl).not.toBeNull();
    expect(tpl?.mjml).toContain('{{otp}}');
    expect(await EmailTemplateModel.countDocuments({ slug: 'password-reset-otp' })).toBe(1);
  });

  it('seedDefaults seeds every shipped template idempotently', async () => {
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

  it('starts a template created with no body from the shipped starter', async () => {
    const created = await emailTemplateService.create({ slug: base.slug, name: base.name, subject: base.subject });
    expect(created.mjml).toBe(STARTER_MJML);
    // The starter is the real card: the body is a closed box and greets by name.
    expect(created.mjml).toContain('<mj-wrapper background-color="#ffffff" border="1px solid #e3e5df"');
    expect(created.mjml).toContain('{{name}}');
  });

  it('resets an edited shipped template to its shipped body and keeps the admin subject', async () => {
    const seeded = await emailTemplateService.bySlug('password-reset-otp');
    const shipped = shippedDefault('password-reset-otp');
    await emailTemplateService.update(seeded!.template_id, {
      mjml: '<mjml><mj-body><mj-text>Edited by an admin {{otp}}</mj-text></mj-body></mjml>',
      subject: 'Admin subject',
    });

    const reset = await emailTemplateService.reset(seeded!.template_id);

    expect(reset?.mjml).toBe(shipped?.mjml);
    expect(reset?.subject).toBe('Admin subject');
    expect((await EmailTemplateModel.findOne({ slug: 'password-reset-otp' }))?.mjml).toBe(shipped?.mjml);
  });

  it('refuses to reset a template Duncit does not ship, and an unknown id', async () => {
    const custom = await emailTemplateService.create(base);
    await expect(emailTemplateService.reset(custom.template_id)).rejects.toThrow(/ship with Duncit/i);
    expect((await emailTemplateService.byId(custom.template_id))?.mjml).toBe(base.mjml);
    await expect(emailTemplateService.reset('no-such-id')).rejects.toThrow(/not found/i);
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
