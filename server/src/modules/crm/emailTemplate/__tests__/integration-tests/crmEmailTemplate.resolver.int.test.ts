import { makeContext } from '@test/harness';
import { openaiChat } from '@services/openai/openai.client';
import { commsService } from '@services/comms/comms.service';
import { STARTER_MJML } from '@services/email/catalogue/starter';
import { aiPromptService } from '@modules/ai/prompt/prompt.service';
import { crmEmailTemplateResolvers } from '../../crmEmailTemplate.resolver';
import { CrmEmailSettingsModel } from '../../crmEmailSettings.model';
import { CrmEmailTemplateModel } from '../../crmEmailTemplate.model';
import { crmEmailTemplateService } from '../../crmEmailTemplate.service';
import { CRM_EMAIL_THEME_DEFAULTS } from '../../crmEmailTheme';

/**
 * Every CRM email template, settings and AI resolver: CRM staff (SUPER_ADMIN,
 * CRM_MANAGER) only, with the acting user recorded where the write keeps one.
 */
jest.mock('@services/openai/openai.client', () => ({
  ...jest.requireActual('@services/openai/openai.client'),
  openaiChat: jest.fn(),
}));

const Q = crmEmailTemplateResolvers.Query;
const M = crmEmailTemplateResolvers.Mutation;
const mockChat = openaiChat as jest.Mock;

const crm = () => makeContext({ id: 'crm-user', roles: ['CRM_MANAGER'] });
const MJML = '<mjml><mj-body><mj-section><mj-column><mj-text>Hi {{ name }}</mj-text></mj-column></mj-section></mj-body></mjml>';
const LOGO = { kind: 'LOGO', url: 'https://cdn.example.com/logo.png' };

afterEach(() => jest.restoreAllMocks());

describe('role gating', () => {
  const calls: [string, (ctx: ReturnType<typeof makeContext>) => unknown][] = [
    ['crmEmailTemplates', (ctx) => Q.crmEmailTemplates({}, {}, ctx)],
    ['crmEmailTemplatesTable', (ctx) => Q.crmEmailTemplatesTable({}, {}, ctx)],
    ['crmEmailTemplate', (ctx) => Q.crmEmailTemplate({}, { template_id: 't' }, ctx)],
    ['renderCrmEmailTemplate', (ctx) => Q.renderCrmEmailTemplate({}, { mjml: MJML }, ctx)],
    ['crmEmailSettings', (ctx) => Q.crmEmailSettings({}, {}, ctx)],
    ['crmEmailStarterMjml', (ctx) => Q.crmEmailStarterMjml({}, {}, ctx)],
    ['crmEmailAiPrompts', (ctx) => Q.crmEmailAiPrompts({}, {}, ctx)],
    ['renderCrmEmailThemePreview', (ctx) => Q.renderCrmEmailThemePreview({}, { theme: {} }, ctx)],
    ['createCrmEmailTemplate', (ctx) => M.createCrmEmailTemplate({}, { input: { slug: 'x', name: 'X', subject: 'S', mjml: MJML } }, ctx)],
    ['updateCrmEmailTemplate', (ctx) => M.updateCrmEmailTemplate({}, { template_id: 't', input: { name: 'Y' } }, ctx)],
    ['deleteCrmEmailTemplate', (ctx) => M.deleteCrmEmailTemplate({}, { template_id: 't' }, ctx)],
    ['sendCrmTestEmail', (ctx) => M.sendCrmTestEmail({}, { template_id: 't', to: 'a@example.com' }, ctx)],
    ['addCrmEmailTemplateImage', (ctx) => M.addCrmEmailTemplateImage({}, { template_id: 't', image: { url: 'https://x/a.png' } }, ctx)],
    ['removeCrmEmailTemplateImage', (ctx) => M.removeCrmEmailTemplateImage({}, { template_id: 't', url: 'https://x/a.png' }, ctx)],
    ['updateCrmEmailTheme', (ctx) => M.updateCrmEmailTheme({}, { input: { primary_color: '#000000' } }, ctx)],
    ['resetCrmEmailTheme', (ctx) => M.resetCrmEmailTheme({}, {}, ctx)],
    ['addCrmEmailBrandAssets', (ctx) => M.addCrmEmailBrandAssets({}, { items: [LOGO] }, ctx)],
    ['updateCrmEmailBrandAsset', (ctx) => M.updateCrmEmailBrandAsset({}, { id: 'a', input: { name: 'x' } }, ctx)],
    ['removeCrmEmailBrandAsset', (ctx) => M.removeCrmEmailBrandAsset({}, { id: 'a' }, ctx)],
    ['setCrmEmailPrimaryLogo', (ctx) => M.setCrmEmailPrimaryLogo({}, { id: null }, ctx)],
    ['updateCrmEmailAiPrompt', (ctx) => M.updateCrmEmailAiPrompt({}, { key: 'crm.email_mjml', content: 'x' }, ctx)],
    ['resetCrmEmailAiPrompt', (ctx) => M.resetCrmEmailAiPrompt({}, { key: 'crm.email_mjml' }, ctx)],
    ['generateCrmEmailMjml', (ctx) => M.generateCrmEmailMjml({}, { input: { prompt: 'hello' } }, ctx)],
  ];

  it.each([
    ['a member', () => makeContext({ roles: ['USER'] }), 'FORBIDDEN'],
    ['a communications manager', () => makeContext({ roles: ['COMMUNICATIONS_MANAGER'] }), 'FORBIDDEN'],
    ['an anonymous caller', () => makeContext(null), 'UNAUTHENTICATED'],
  ])('refuses %s on every query and mutation, before any work', async (_who, ctx, code) => {
    const send = jest.spyOn(commsService, 'sendEmail');
    for (const [, call] of calls) {
      await expect((async () => call(ctx()))()).rejects.toMatchObject({ extensions: { code } });
    }
    expect(mockChat).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(await CrmEmailSettingsModel.countDocuments()).toBe(0);
    expect(await CrmEmailTemplateModel.countDocuments()).toBe(0);
  });
});

describe('templates through the resolvers', () => {
  it('lets CRM staff create, read, list, render, update and delete a template', async () => {
    const created = await M.createCrmEmailTemplate({}, { input: { slug: 'Hello', name: 'Hello', subject: 'S', mjml: MJML } }, crm());
    expect(await CrmEmailTemplateModel.findOne({ slug: 'hello' }).lean()).toMatchObject({ created_by: 'crm-user' });

    const id = created!.template_id;
    expect(await Q.crmEmailTemplate({}, { template_id: id }, crm())).toMatchObject({ slug: 'hello' });
    expect((await Q.crmEmailTemplates({}, {}, crm())).map((t) => t!.slug)).toEqual(['hello']);
    expect((await Q.crmEmailTemplatesTable({}, { query: { search: 'hel' } }, makeContext({ roles: ['SUPER_ADMIN'] }))).total).toBe(1);

    const rendered = await Q.renderCrmEmailTemplate({}, { mjml: MJML, vars: '{"name":"Asha"}' }, crm());
    expect(rendered.html).toContain('Asha');

    await M.addCrmEmailTemplateImage({}, { template_id: id, image: { url: 'https://x/a.png', name: 'a' } }, crm());
    const withoutImage = await M.removeCrmEmailTemplateImage({}, { template_id: id, url: 'https://x/a.png' }, crm());
    expect(withoutImage!.images).toEqual([]);

    expect((await M.updateCrmEmailTemplate({}, { template_id: id, input: { name: 'Hello 2' } }, crm()))!.name).toBe('Hello 2');
    expect(await M.deleteCrmEmailTemplate({}, { template_id: id }, crm())).toBe(true);
  });

  it('test-sends through the resolver', async () => {
    const t = await crmEmailTemplateService.create({ slug: 'send', name: 'Send', subject: 'Hi {{ name }}', mjml: MJML });
    const send = jest.spyOn(commsService, 'sendEmail').mockResolvedValue({ ok: true, message: 'Sent' } as never);

    const out = await M.sendCrmTestEmail({}, { template_id: t!.template_id, to: 'me@example.com', vars: '{"name":"Ravi"}' }, crm());

    expect(out).toEqual({ ok: true, message: 'Sent' });
    expect(send.mock.calls[0][0]).toMatchObject({ to: 'me@example.com', subject: 'Hi Ravi' });
  });
});

describe('settings through the resolvers', () => {
  it('reads, themes, previews and resets, recording the acting user', async () => {
    expect((await Q.crmEmailSettings({}, {}, crm())).theme).toEqual(CRM_EMAIL_THEME_DEFAULTS);
    expect(Q.crmEmailStarterMjml({}, {}, crm())).toBe(STARTER_MJML);

    const themed = await M.updateCrmEmailTheme({}, { input: { primary_color: '#123456' } }, crm());
    expect(themed.theme.primary_color).toBe('#123456');
    expect((await CrmEmailSettingsModel.findOne().lean())?.updated_by).toBe('crm-user');

    const preview = await Q.renderCrmEmailThemePreview({}, { theme: { accent_color: '#00ff00' }, mjml: null }, crm());
    expect(preview.html).toContain('#123456');
    expect(preview.html).toContain('#00ff00');

    expect((await M.resetCrmEmailTheme({}, {}, crm())).theme).toEqual(CRM_EMAIL_THEME_DEFAULTS);
  });

  it('manages the brand library and the header logo', async () => {
    const added = await M.addCrmEmailBrandAssets({}, { items: [LOGO, { kind: 'BANNER', url: 'https://cdn.example.com/b.png' }] }, crm());
    expect((await CrmEmailSettingsModel.findOne().lean())?.assets.map((a) => a.created_by)).toEqual(['crm-user', 'crm-user']);
    const [logoId, bannerId] = added.assets.map((a: { id: string }) => a.id);

    expect((await M.setCrmEmailPrimaryLogo({}, { id: logoId }, crm())).primary_logo_id).toBe(logoId);
    // An omitted id puts the Duncit logo back.
    expect((await M.setCrmEmailPrimaryLogo({}, {}, crm())).primary_logo_id).toBeNull();

    const renamed = await M.updateCrmEmailBrandAsset({}, { id: bannerId, input: { name: 'Hero' } }, crm());
    expect(renamed.assets[1].name).toBe('Hero');
    expect((await M.removeCrmEmailBrandAsset({}, { id: bannerId }, crm())).assets.map((a: { id: string }) => a.id)).toEqual([logoId]);
  });
});

describe('the AI writer through the resolvers', () => {
  it('lists, edits and resets the CRM prompts, and refuses any other prompt', async () => {
    await aiPromptService.seedDefaults();

    expect((await Q.crmEmailAiPrompts({}, {}, crm())).map((p) => p.key)).toEqual(['crm.email_mjml', 'crm.email_mjml.user']);
    const edited = await M.updateCrmEmailAiPrompt({}, { key: 'crm.email_mjml', content: 'Be brief. JSON { "mjml": string }.' }, crm());
    expect(edited!.content).toBe('Be brief. JSON { "mjml": string }.');
    expect((await M.resetCrmEmailAiPrompt({}, { key: 'crm.email_mjml' }, crm()))!.content).not.toBe(edited!.content);

    await expect(M.updateCrmEmailAiPrompt({}, { key: 'generate.email_mjml', content: 'x' }, crm())).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('generates MJML for CRM staff', async () => {
    mockChat.mockResolvedValue({ ok: true, content: JSON.stringify({ mjml: MJML }), model: 'gpt-4o-mini' });

    const out = await M.generateCrmEmailMjml({}, { input: { prompt: 'welcome', target: 'VENUE' } }, crm());

    expect(out).toContain('Hi {{ name }}');
    expect(mockChat.mock.calls[0][0]).toMatchObject({ task: 'crm.email_mjml' });
  });
});
