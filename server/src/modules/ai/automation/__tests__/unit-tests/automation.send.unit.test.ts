import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import { resolveCampaign } from '@modules/crm/marketing/waCampaign.template';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { emailTemplateService } from '@modules/content/emailTemplate/emailTemplate.service';
import { sendHtmlEmail } from '@services/email/email.service';
import { logs } from '@observability/log';
import { previewTemplate, sendEmailStep, sendWhatsappStep, WA_AUTOMATION_EVENT } from '../../automation.send';
import type { AutomationNode, IAutomationRun } from '../../automation.model';
import type { StepContext } from '../../automation.types';
import type { AisensyTemplate } from '@modules/platform/aisensy/aisensy.project';

jest.mock('@modules/platform/aisensy/aisensy.service', () => ({ aisensyService: { send: jest.fn() } }));
jest.mock('@modules/crm/marketing/waCampaign.template', () => ({ resolveCampaign: jest.fn() }));
jest.mock('@modules/platform/whatsapp/waMessageLog.model', () => ({ WaMessageLogModel: { create: jest.fn() } }));
jest.mock('@modules/content/emailTemplate/emailTemplate.service', () => ({
  emailTemplateService: { render: jest.fn() },
}));
jest.mock('@services/email/email.service', () => ({ sendHtmlEmail: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
// automation.vars pulls these in for initialVars, which the send steps never call.
jest.mock('@modules/access/user/user.model', () => ({ UserModel: {} }));
jest.mock('@modules/crm/marketing/waCampaign.recipients', () => ({ WA_VARIABLES: [] }));

const mockSend = aisensyService.send as jest.Mock;
const mockResolve = resolveCampaign as jest.Mock;
const mockLogCreate = WaMessageLogModel.create as jest.Mock;
const mockRender = emailTemplateService.render as jest.Mock;
const mockSendEmail = sendHtmlEmail as jest.Mock;
const mockWarn = logs.server.warn as jest.Mock;

const template = (over: Partial<AisensyTemplate> = {}): AisensyTemplate =>
  ({
    id: 't1',
    name: 'pod_reminder',
    status: 'APPROVED',
    category: 'UTILITY',
    language: 'en',
    body: 'Hi {{1}}, your pod {{2}} starts soon',
    param_count: 2,
    header: 'Reminder',
    header_format: 'TEXT',
    needs_media: false,
    footer: 'Duncit',
    buttons: [{ type: 'URL', text: 'Open', url: 'https://x/{{3}}', url_param: 3 }],
    ...over,
  }) as AisensyTemplate;

const resolved = (over: Record<string, unknown> = {}) => ({
  known: true,
  template_name: 'pod_reminder',
  template_category: 'UTILITY',
  msg_rate: 0.12,
  template: template(),
  media: null,
  ...over,
});

const node = (data: Record<string, unknown>): AutomationNode => ({ id: 'n1', kind: 'send_whatsapp', x: 0, y: 0, data });

const run = (contact: Partial<IAutomationRun['contact']> = {}) =>
  ({
    _id: 'run-1',
    flow_id: 'flow-9',
    contact: { name: 'Asha', phone: '919876543210', email: 'asha@x.com', ...contact },
  }) as unknown as IAutomationRun;

const ctx = (data: Record<string, unknown>, over: Partial<StepContext> = {}): StepContext => ({
  run: run(),
  node: node(data),
  vars: { contact: { name: 'Asha' }, pod: { title: 'Sunday Hike', slug: 'sunday-hike' } },
  live: true,
  test: false,
  ...over,
});

describe('previewTemplate', () => {
  it('fills numbered placeholders and joins header, body and footer with blank lines', () => {
    expect(previewTemplate(template(), ['Asha', 'Hike'])).toBe('Reminder\n\nHi Asha, your pod Hike starts soon\n\nDuncit');
  });

  it('leaves a placeholder with no matching param standing and drops empty header/footer', () => {
    expect(previewTemplate(template({ header: '', footer: '' } as Partial<AisensyTemplate>), ['Asha'])).toBe(
      'Hi Asha, your pod {{2}} starts soon'
    );
  });

  it('with no template, shows the params one per line', () => {
    expect(previewTemplate(null, ['a', 'b'])).toBe('a\nb');
  });
});

describe('sendWhatsappStep', () => {
  beforeEach(() => {
    mockResolve.mockResolvedValue(resolved());
    mockLogCreate.mockResolvedValue({});
  });

  it('skips a contact whose number cannot receive WhatsApp, without resolving the campaign', async () => {
    const result = await sendWhatsappStep({ ...ctx({ campaign_name: 'c1' }), run: run({ phone: '9112345' }) });
    expect(result).toEqual({ handle: 'next', status: 'SKIPPED', detail: 'The contact has no valid WhatsApp number' });
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it('skips when a template variable renders empty, naming its 1-based position', async () => {
    const result = await sendWhatsappStep(ctx({ campaign_name: 'c1', template_params: ['{{contact.name}}', '  '] }));
    expect(result).toEqual({ handle: 'next', status: 'SKIPPED', detail: 'Template variable 2 came out empty' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('a test run previews the filled template and never calls AiSensy or the log', async () => {
    const result = await sendWhatsappStep(
      ctx({ campaign_name: 'c1', template_params: ['{{contact.name}}', '{{pod.title}}'] }, { live: false })
    );
    expect(result).toEqual({
      handle: 'next',
      status: 'OK',
      detail: 'Previewed campaign "c1" (not sent)',
      message: {
        direction: 'OUT',
        kind: 'whatsapp_template',
        text: 'Reminder\n\nHi Asha, your pod Sunday Hike starts soon\n\nDuncit',
        subject: '',
        html: '',
        template_name: 'pod_reminder',
        buttons: template().buttons,
        delivered: false,
      },
    });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockLogCreate).not.toHaveBeenCalled();
  });

  it('a live send passes rendered params, node media and rendered buttons, logs SENT and marks delivered', async () => {
    mockSend.mockResolvedValue({ submitted_message_id: 'msg-77' });
    const result = await sendWhatsappStep(
      ctx({
        campaign_name: 'c1',
        template_params: ['{{contact.name}}', '{{pod.title}}'],
        media_url: 'https://cdn/{{pod.slug}}.jpg',
        media_filename: 'cover.jpg',
        buttons: [{ index: '1', value: '{{pod.slug}}' }, { index: 2, value: '' }, null],
      })
    );

    expect(mockSend).toHaveBeenCalledWith({
      campaign_name: 'c1',
      destination: '919876543210',
      user_name: 'Asha',
      template_params: ['Asha', 'Sunday Hike'],
      media: { url: 'https://cdn/sunday-hike.jpg', filename: 'cover.jpg' },
      buttons: [{ index: 1, value: 'sunday-hike' }],
    });
    expect(mockLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event_key: WA_AUTOMATION_EVENT,
        campaign: 'c1',
        category: 'automation',
        entity_id: 'run-1',
        status: 'SENT',
        reason: '',
        submitted_message_id: 'msg-77',
        media_url: 'https://cdn/sunday-hike.jpg',
        media_filename: 'cover.jpg',
        template_category: 'UTILITY',
        msg_rate: 0.12,
        holds_slot: false,
      })
    );
    expect(result.status).toBe('OK');
    expect(result.detail).toBe('Sent via campaign "c1"');
    expect(result.message?.delivered).toBe(true);
  });

  it('falls back to the campaign media, the campaign name and "there" when the node and contact have none', async () => {
    mockResolve.mockResolvedValue(
      resolved({ template: null, template_name: '', media: { url: 'https://cdn/c.png', filename: 'c.png' } })
    );
    mockSend.mockResolvedValue({ submitted_message_id: 'm' });

    const result = await sendWhatsappStep({ ...ctx({ campaign_name: 'c1' }), run: run({ name: '' }) });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ user_name: 'there', media: { url: 'https://cdn/c.png', filename: 'c.png' }, buttons: [] })
    );
    expect(result.message).toMatchObject({ template_name: 'c1', buttons: [], text: '' });
  });

  it('a failed AiSensy call logs FAILED with the reason truncated to 500 chars and returns FAILED', async () => {
    const long = 'x'.repeat(700);
    mockSend.mockRejectedValue(new Error(long));

    const result = await sendWhatsappStep(ctx({ campaign_name: 'c1' }));

    expect(result).toMatchObject({ handle: 'next', status: 'FAILED', detail: long });
    expect(result.message?.delivered).toBe(false);
    const logged = mockLogCreate.mock.calls[0][0];
    expect(logged.status).toBe('FAILED');
    expect(logged.reason).toHaveLength(500);
    expect(logged.media_url).toBe('');
  });

  it('a non-Error rejection is stringified into the detail', async () => {
    mockSend.mockRejectedValue('quota exceeded');
    const result = await sendWhatsappStep(ctx({ campaign_name: 'c1' }));
    expect(result.detail).toBe('quota exceeded');
  });

  it('a failing log write is only warned about — the send result stands', async () => {
    mockSend.mockResolvedValue({ submitted_message_id: 'm' });
    mockLogCreate.mockRejectedValue(new Error('mongo down'));
    const ok = await sendWhatsappStep(ctx({ campaign_name: 'c1' }));
    expect(ok.status).toBe('OK');

    mockSend.mockRejectedValue(new Error('boom'));
    const failed = await sendWhatsappStep(ctx({ campaign_name: 'c1' }));
    expect(failed.status).toBe('FAILED');
    expect(mockWarn).toHaveBeenCalledTimes(2);
    expect(mockWarn).toHaveBeenCalledWith('automation', 'waLog', expect.objectContaining({ error: expect.any(Error) }));
  });
});

describe('sendEmailStep', () => {
  const emailCtx = (data: Record<string, unknown>, over: Partial<StepContext> = {}) =>
    ctx(data, { node: { id: 'e1', kind: 'send_email', x: 0, y: 0, data }, ...over });

  beforeEach(() => {
    mockRender.mockResolvedValue({ subject: 'Template subject', html: '<p>hi</p>', errors: [] });
  });

  it('skips a contact with no email address', async () => {
    const result = await sendEmailStep({ ...emailCtx({ template_slug: 'welcome' }), run: run({ email: '' }) });
    expect(result).toEqual({ handle: 'next', status: 'SKIPPED', detail: 'The contact has no email address' });
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('renders the template with the contact name plus rendered node vars', async () => {
    await sendEmailStep(emailCtx({ template_slug: 'welcome', vars: { pod: '{{pod.title}}', blank: null } }, { live: false }));
    expect(mockRender).toHaveBeenCalledWith('welcome', { name: 'Asha', pod: 'Sunday Hike', blank: '' });
  });

  it('fails with the first render error and never sends', async () => {
    mockRender.mockResolvedValue({ subject: 's', html: '', errors: ['missing var pod', 'other'] });
    const result = await sendEmailStep(emailCtx({ template_slug: 'welcome' }));
    expect(result.status).toBe('FAILED');
    expect(result.detail).toBe('Template "welcome" did not render: missing var pod');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('a test run previews using the node subject when it renders non-empty', async () => {
    const result = await sendEmailStep(emailCtx({ template_slug: 'welcome', subject: 'Hello {{contact.name}}' }, { live: false }));
    expect(result).toEqual({
      handle: 'next',
      status: 'OK',
      detail: 'Previewed template "welcome" (not sent)',
      message: {
        direction: 'OUT',
        kind: 'email',
        text: '',
        subject: 'Hello Asha',
        html: '<p>hi</p>',
        template_name: 'welcome',
        buttons: [],
        delivered: false,
      },
    });
  });

  it('a live send uses the template subject, a valid category and the chosen sender', async () => {
    mockSendEmail.mockResolvedValue({ skipped: false, entryName: 'Marketing box' });
    const result = await sendEmailStep(emailCtx({ template_slug: 'welcome', category: 'marketing', sender_id: 'p-1' }));
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'asha@x.com',
      subject: 'Template subject',
      html: '<p>hi</p>',
      category: 'marketing',
      provider_id: 'p-1',
      template: 'welcome',
      source_detail: 'automation:flow-9',
      vars: { name: 'Asha' },
    });
    expect(result).toMatchObject({ status: 'OK', detail: 'Sent "Template subject" through Marketing box' });
    expect(result.message?.delivered).toBe(true);
  });

  it('an unknown category falls back to notification, no sender to null, no entry name to the default mailbox', async () => {
    mockSendEmail.mockResolvedValue({ skipped: false, entryName: '' });
    const result = await sendEmailStep(emailCtx({ template_slug: 'welcome', category: 'spam' }));
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ category: 'notification', provider_id: null }));
    expect(result.detail).toBe('Sent "Template subject" through the default mailbox');
  });

  it('a skipped send is a FAILED step carrying the provider reason, or a generic one', async () => {
    mockSendEmail.mockResolvedValueOnce({ skipped: true, reason: 'User unsubscribed' });
    const withReason = await sendEmailStep(emailCtx({ template_slug: 'welcome' }));
    expect(withReason).toMatchObject({ status: 'FAILED', detail: 'User unsubscribed' });
    expect(withReason.message?.delivered).toBe(false);

    mockSendEmail.mockResolvedValueOnce({ skipped: true });
    const generic = await sendEmailStep(emailCtx({ template_slug: 'welcome' }));
    expect(generic.detail).toBe('The email was not sent');
  });
});
