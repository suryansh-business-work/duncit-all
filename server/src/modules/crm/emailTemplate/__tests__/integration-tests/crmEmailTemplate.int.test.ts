import { crmEmailTemplateService } from '../../crmEmailTemplate.service';
import { CrmEmailTemplateModel } from '../../crmEmailTemplate.model';
import { crmEmailSettingsService } from '../../crmEmailSettings.service';
import { EmailTemplateModel } from '@modules/content/emailTemplate/emailTemplate.model';
import * as coreTemplates from '@modules/content/emailTemplate/emailTemplate.service';
import { emailFragmentService } from '@modules/content/emailFragment/emailFragment.service';
import { STARTER_MJML } from '@services/email/catalogue/starter';
import { EMAIL_COLOR as C } from '@services/email/catalogue/tokens';
import { commsService } from '@services/comms/comms.service';

const MJML = '<mjml><mj-body><mj-section><mj-column><mj-text>Hi {{ name }}</mj-text></mj-column></mj-section></mj-body></mjml>';

/** A body painted with two shared tokens: the button primary and the brand red. */
const TOKEN_MJML = [
  '<mjml><mj-body><mj-section><mj-column>',
  `<mj-text color="${C.brand}">Hi {{ name }}</mj-text>`,
  `<mj-button background-color="${C.primary}" href="https://duncit.com">Book</mj-button>`,
  '</mj-column></mj-section></mj-body></mjml>',
].join('');

const CRM_LOGO = 'https://cdn.example.com/crm-logo.png';

afterEach(() => jest.restoreAllMocks());

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

  // Async since the render started going through the shared body renderer,
  // which reads the SERVICE header/footer fragment from the database.
  it('renders MJML with vars + detects variables', async () => {
    const r = await crmEmailTemplateService.render(MJML, JSON.stringify({ name: 'Sury' }));
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

describe('the CRM look on render (theme + logo)', () => {
  it('renders the shared tokens unchanged while the theme is at its defaults', async () => {
    const r = await crmEmailTemplateService.render(TOKEN_MJML, JSON.stringify({ name: 'Sury' }));
    expect(r.html).toContain(C.primary);
    expect(r.html).toContain(C.brand);
    expect(r.errors).toEqual([]);
  });

  it('puts the saved theme on every render, so existing templates follow a theme change', async () => {
    await crmEmailSettingsService.updateTheme({ primary_color: '#123456', accent_color: '#0a0b0c' });

    const r = await crmEmailTemplateService.render(TOKEN_MJML, JSON.stringify({ name: 'Sury' }));

    expect(r.html).toContain('#123456');
    expect(r.html).toContain('#0a0b0c');
    expect(r.html).not.toContain(C.primary);
    expect(r.html).not.toContain(C.brand);
    expect(r.html).toContain('Sury');
    expect(r.detected_variables).toEqual(['name']);
  });

  it('treats unparseable or non-object vars as none rather than failing', async () => {
    const bad = await crmEmailTemplateService.render(MJML, '{not json');
    expect(bad.html).toContain('{{ name }}');
    const scalar = await crmEmailTemplateService.render(MJML, '42');
    expect(scalar.html).toContain('{{ name }}');
    expect(scalar.errors).toEqual([]);
  });

  describe('inside the SERVICE header and footer', () => {
    beforeEach(async () => {
      await emailFragmentService.seedDefaults();
    });

    it('shows the Duncit logo until a CRM logo is picked, then the CRM logo', async () => {
      const { assets } = await crmEmailSettingsService.addAssets([{ kind: 'LOGO', url: CRM_LOGO }]);

      const before = await crmEmailTemplateService.render(MJML, null);
      expect(before.html).not.toContain(CRM_LOGO);
      // The fragment's placeholders are all filled by the chrome values.
      expect(before.html).not.toContain('{{brand_logo_url}}');
      expect(before.html).not.toContain('{{app_name}}');

      await crmEmailSettingsService.setPrimaryLogo(assets[0].id);
      const after = await crmEmailTemplateService.render(MJML, null);
      expect(after.html).toContain(CRM_LOGO);
    });

    it('lets an explicitly passed logo variable win over the picked CRM logo', async () => {
      const { assets } = await crmEmailSettingsService.addAssets([{ kind: 'LOGO', url: CRM_LOGO }]);
      await crmEmailSettingsService.setPrimaryLogo(assets[0].id);

      const r = await crmEmailTemplateService.render(
        MJML,
        JSON.stringify({ brand_logo_url: 'https://cdn.example.com/override.png' })
      );

      expect(r.html).toContain('https://cdn.example.com/override.png');
      expect(r.html).not.toContain(CRM_LOGO);
    });
  });
});

describe('crmEmailTemplateService.previewTheme', () => {
  it('previews the starter under an unsaved theme without saving it', async () => {
    const r = await crmEmailTemplateService.previewTheme({ primary_color: '#0d0e0f' });

    expect(r.errors).toEqual([]);
    expect(r.html).toContain('#0d0e0f');
    expect(r.html).not.toContain(C.primary);
    expect(r.detected_variables).toEqual(coreTemplates.detectVariables(STARTER_MJML));
    expect((await crmEmailSettingsService.get()).theme.primary_color).toBe(C.primary);
  });

  it('falls back to the starter for a blank template and previews a given one otherwise', async () => {
    const blank = await crmEmailTemplateService.previewTheme({}, '   ');
    expect(blank.detected_variables).toEqual(coreTemplates.detectVariables(STARTER_MJML));

    const given = await crmEmailTemplateService.previewTheme({ accent_color: '#00ff00' }, TOKEN_MJML);
    expect(given.detected_variables).toEqual(['name']);
    expect(given.html).toContain('#00ff00');
  });

  it('layers the draft over the saved theme', async () => {
    await crmEmailSettingsService.updateTheme({ primary_color: '#123456' });

    const r = await crmEmailTemplateService.previewTheme({ accent_color: '#00ff00' }, TOKEN_MJML);

    expect(r.html).toContain('#123456');
    expect(r.html).toContain('#00ff00');
  });

  it('shows the dark-mode sheet in AUTO and drops it in LIGHT', async () => {
    const auto = await crmEmailTemplateService.previewTheme({ color_mode: 'AUTO' });
    expect(auto.html).toContain('prefers-color-scheme: dark');

    const light = await crmEmailTemplateService.previewTheme({ color_mode: 'LIGHT' });
    expect(light.html).not.toContain('prefers-color-scheme');
  });

  it('refuses an invalid draft with the same message a save would give', async () => {
    await expect(crmEmailTemplateService.previewTheme({ base_font_size: 40 })).rejects.toMatchObject({
      message: 'base font size must be a whole number from 13 to 18',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('crmEmailTemplateService.starter', () => {
  it('serves the shared starter body', () => {
    expect(crmEmailTemplateService.starter()).toBe(STARTER_MJML);
  });
});

describe('crmEmailTemplateService.sendTest', () => {
  const sendSpy = (result = { ok: true, message: 'Sent' }) =>
    jest.spyOn(commsService, 'sendEmail').mockResolvedValue(result as never);

  it('sends the themed render with the subject filled and the attachments', async () => {
    await crmEmailSettingsService.updateTheme({ primary_color: '#123456' });
    const t = await crmEmailTemplateService.create({
      slug: 'test-send',
      name: 'Test send',
      subject: 'Hi {{ name }}',
      mjml: TOKEN_MJML,
      attachments: [{ url: 'https://cdn.example.com/deck.pdf', name: 'Deck' }],
    });
    const send = sendSpy();

    const result = await crmEmailTemplateService.sendTest(t!.template_id, 'lead@example.com', '{"name":"Sury"}', 'provider-1');

    expect(result).toEqual({ ok: true, message: 'Sent' });
    const sent = send.mock.calls[0][0];
    expect(sent).toMatchObject({
      to: 'lead@example.com',
      subject: 'Hi Sury',
      provider_id: 'provider-1',
      attachments: [{ url: 'https://cdn.example.com/deck.pdf', name: 'Deck' }],
    });
    expect(sent.body).toContain('#123456');
    expect(sent.body).not.toContain(C.primary);
  });

  it('defaults the provider to none and passes a failed send back', async () => {
    const t = await crmEmailTemplateService.create({ slug: 'fail-send', name: 'Fail', subject: 'S', mjml: MJML });
    const send = sendSpy({ ok: false, message: 'SMTP down' });

    expect(await crmEmailTemplateService.sendTest(t!.template_id, 'lead@example.com')).toEqual({ ok: false, message: 'SMTP down' });
    expect(send.mock.calls[0][0]).toMatchObject({ provider_id: null, attachments: [] });
  });

  it('does not send when the template cannot be rendered', async () => {
    const t = await crmEmailTemplateService.create({ slug: 'broken', name: 'Broken', subject: 'S', mjml: MJML });
    const send = sendSpy();
    const render = jest.spyOn(coreTemplates, 'renderTemplateBody');

    render.mockResolvedValueOnce({ html: '', errors: ['Malformed MJML'] });
    expect(await crmEmailTemplateService.sendTest(t!.template_id, 'lead@example.com')).toEqual({
      ok: false,
      message: 'Malformed MJML',
    });
    render.mockResolvedValueOnce({ html: '', errors: [] });
    expect(await crmEmailTemplateService.sendTest(t!.template_id, 'lead@example.com')).toEqual({
      ok: false,
      message: 'Could not render template',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('reports a missing template', async () => {
    const send = sendSpy();
    await expect(crmEmailTemplateService.sendTest('missing', 'lead@example.com')).rejects.toMatchObject({
      message: 'CRM template not found',
      extensions: { code: 'NOT_FOUND' },
    });
    expect(send).not.toHaveBeenCalled();
  });
});
