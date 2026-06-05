import { crmEmailTemplateService } from '../../crmEmailTemplate.service';
import { CrmEmailTemplateModel } from '../../crmEmailTemplate.model';
import { EmailTemplateModel } from '@modules/content/emailTemplate/emailTemplate.model';

const MJML = '<mjml><mj-body><mj-section><mj-column><mj-text>Hi {{ name }}</mj-text></mj-column></mj-section></mj-body></mjml>';

describe('crmEmailTemplateService integration', () => {
  it('creates in the CRM store only (not the core EmailTemplate collection)', async () => {
    const created = await crmEmailTemplateService.create(
      { slug: 'CRM Welcome!', name: 'CRM Welcome', subject: 'Hi {{ name }}', mjml: MJML },
      'tester'
    );
    expect(created!.slug).toBe('crm-welcome'); // slugified
    expect(created!.template_id).toBeTruthy();

    // It must NOT have written to the admin/core templates collection.
    expect(await EmailTemplateModel.countDocuments({ slug: 'crm-welcome' })).toBe(0);
    expect(await CrmEmailTemplateModel.countDocuments({ slug: 'crm-welcome' })).toBe(1);

    const list = await crmEmailTemplateService.list();
    expect(list.find((t) => t!.template_id === created!.template_id)).toBeTruthy();
  });

  it('renders MJML with vars + detects variables', () => {
    const r = crmEmailTemplateService.render(MJML, JSON.stringify({ name: 'Sury' }));
    expect(r.detected_variables).toContain('name');
    expect(r.html).toContain('Sury');
    expect(r.errors).toEqual([]);
  });

  it('rejects duplicate slugs and updates/deletes by template_id', async () => {
    const t = await crmEmailTemplateService.create({ slug: 'promo', name: 'Promo', subject: 'S', mjml: MJML });
    await expect(
      crmEmailTemplateService.create({ slug: 'promo', name: 'Dup', subject: 'S', mjml: MJML })
    ).rejects.toThrow(/already exists/i);

    const updated = await crmEmailTemplateService.update(t!.template_id, { name: 'Promo 2' });
    expect(updated!.name).toBe('Promo 2');
    expect(await crmEmailTemplateService.delete(t!.template_id)).toBe(true);
    expect(await crmEmailTemplateService.byId(t!.template_id)).toBeNull();
  });

  it('adds and removes library images immediately', async () => {
    const t = await crmEmailTemplateService.create({ slug: 'imgs', name: 'Imgs', subject: 'S', mjml: MJML });
    const added = await crmEmailTemplateService.addImage(t!.template_id, { url: 'https://x/a.png', name: 'a' });
    expect(added!.images).toHaveLength(1);
    expect(added!.images[0]).toMatchObject({ url: 'https://x/a.png', name: 'a' });

    const removed = await crmEmailTemplateService.removeImage(t!.template_id, 'https://x/a.png');
    expect(removed!.images).toHaveLength(0);
  });
});
