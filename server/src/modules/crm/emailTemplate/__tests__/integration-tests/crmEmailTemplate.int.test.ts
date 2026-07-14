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

  it('serves the crmEmailTemplatesTable page with search, filters, sort and paging', async () => {
    await crmEmailTemplateService.create({ slug: 'venue-pitch', name: 'Venue Pitch', subject: 'List your venue', target: 'VENUE', mjml: MJML });
    await crmEmailTemplateService.create({ slug: 'host-hello', name: 'Host Hello', subject: 'Host with us', target: 'HOST', mjml: MJML });
    const off = await crmEmailTemplateService.create({ slug: 'old-promo', name: 'Old Promo', subject: 'Big sale', mjml: MJML });
    await crmEmailTemplateService.update(off!.template_id, { is_active: false });

    // Default sort name asc + clamp defaults.
    const all = await crmEmailTemplateService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((t) => t!.name)).toEqual(['Host Hello', 'Old Promo', 'Venue Pitch']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name, slug and subject.
    const bySubject = await crmEmailTemplateService.table({ search: 'sale' });
    expect(bySubject.rows.map((t) => t!.name)).toEqual(['Old Promo']);
    const bySlug = await crmEmailTemplateService.table({ search: 'venue-pitch' });
    expect(bySlug.rows.map((t) => t!.name)).toEqual(['Venue Pitch']);

    // Enum + boolean filters narrow.
    const venue = await crmEmailTemplateService.table({
      filters: [{ field: 'target', op: 'eq', value: 'VENUE' }],
    });
    expect(venue.rows.map((t) => t!.name)).toEqual(['Venue Pitch']);
    const active = await crmEmailTemplateService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((t) => t!.name)).toEqual(['Host Hello', 'Venue Pitch']);

    // Allowlisted sort override + paging.
    const desc = await crmEmailTemplateService.table({ sort_by: 'name', sort_dir: 'desc' });
    expect(desc.rows.map((t) => t!.name)).toEqual(['Venue Pitch', 'Old Promo', 'Host Hello']);
    const page2 = await crmEmailTemplateService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((t) => t!.name)).toEqual(['Old Promo']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
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
