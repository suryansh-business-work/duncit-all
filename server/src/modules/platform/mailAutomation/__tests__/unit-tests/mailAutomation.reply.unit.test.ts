import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { logs } from '@observability/log';
import type { IMailAutomationAccount } from '../../mailAutomation.model';
import { composeReply, previewReply, renderTemplate, slaLabel, templateVariables, type ReplyContext } from '../../mailAutomation.reply';

jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));

const account = (over: Record<string, unknown> = {}) =>
  ({ email: 'support@duncit.com', sla_min_hours: 24, sla_max_hours: 48, reply_template: 'Hi {{sender_name}}, ticket {{ticket_no}} within {{sla}}.', ai_enabled: false, ...over }) as unknown as IMailAutomationAccount;
const context = (over: Partial<ReplyContext> = {}): ReplyContext => ({
  ticketNo: 'ST-1', senderName: 'Asha', senderEmail: 'asha@example.com', subject: 'Refund', bodyText: 'Please refund', ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  (resolvePrompt as jest.Mock).mockImplementation(async (key: string) => ({ content: `prompt:${key}`, model: 'm-1' }));
});

describe('slaLabel', () => {
  it.each([
    [24, 48, '24-48 hours'],
    [48, 24, '24-48 hours'],
    [24, 24, '24 hours'],
    [1, 1, '1 hour'],
    [1, 2, '1-2 hours'],
  ])('%s..%s reads %s', (min, max, label) => {
    expect(slaLabel(min, max)).toBe(label);
  });
});

describe('templateVariables / renderTemplate', () => {
  it('resolves every placeholder, falling back to the address when the sender has no name', () => {
    const vars = templateVariables(account(), context({ senderName: '' }));
    expect(vars).toEqual({
      ticket_no: 'ST-1', sla: '24-48 hours', sla_min_hours: '24', sla_max_hours: '48',
      sender_name: 'asha@example.com', sender_email: 'asha@example.com', subject: 'Refund', mailbox: 'support@duncit.com',
    });
  });

  it('leaves an unknown placeholder standing and does not read inherited properties', () => {
    expect(renderTemplate('{{ticket_no}} {{ typo }} {{constructor}}', { ticket_no: 'ST-1' })).toBe('ST-1 {{ typo }} {{constructor}}');
  });
});

describe('composeReply', () => {
  it('sends the operator template as written when the AI is off', async () => {
    await expect(composeReply(account(), context())).resolves.toEqual({ text: 'Hi Asha, ticket ST-1 within 24-48 hours.', byAi: false });
    expect(openaiChat).not.toHaveBeenCalled();
  });

  it('sends the rewrite when it keeps the reference, handing the model the rendered template and a bounded body', async () => {
    (openaiChat as jest.Mock).mockResolvedValue({ ok: true, content: '  Hello Asha, we opened ST-1.  ' });
    const out = await composeReply(account({ ai_enabled: true }), context({ senderName: '', bodyText: 'x'.repeat(5000) }));
    expect(out).toEqual({ text: 'Hello Asha, we opened ST-1.', byAi: true });
    const system = (resolvePrompt as jest.Mock).mock.calls[0];
    expect(system[0]).toBe('support.mail_auto_reply');
    expect(system[1]).toMatchObject({ ticket_no: 'ST-1', template: expect.stringContaining('ticket ST-1') });
    const user = (resolvePrompt as jest.Mock).mock.calls[1];
    expect(user[1].sender_name).toBe('asha@example.com');
    expect(user[1].body).toHaveLength(4000);
    expect((openaiChat as jest.Mock).mock.calls[0][0]).toMatchObject({ task: 'support.mail_reply', model: 'm-1', detail: 'support@duncit.com' });
  });

  it('falls back to the template, with a warning, when the rewrite dropped the ticket number', async () => {
    (openaiChat as jest.Mock).mockResolvedValue({ ok: true, content: 'We got your email.' });
    await expect(composeReply(account({ ai_enabled: true }), context())).resolves.toMatchObject({ byAi: false, text: expect.stringContaining('ST-1') });
    expect(logs.server.warn).toHaveBeenCalledWith('mail-automation', 'composeReply', expect.objectContaining({ mailbox: 'support@duncit.com' }));
  });

  it('accepts any rewrite when there is no ticket number to keep', async () => {
    (openaiChat as jest.Mock).mockResolvedValue({ ok: true, content: 'Thanks for writing.' });
    await expect(composeReply(account({ ai_enabled: true }), context({ ticketNo: '' }))).resolves.toEqual({ text: 'Thanks for writing.', byAi: true });
  });

  it('falls back to the template when OpenAI refuses or throws', async () => {
    (openaiChat as jest.Mock).mockResolvedValueOnce({ ok: false, message: 'not configured' });
    await expect(composeReply(account({ ai_enabled: true }), context())).resolves.toMatchObject({ byAi: false });
    (openaiChat as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
    await expect(composeReply(account({ ai_enabled: true }), context())).resolves.toMatchObject({ byAi: false });
    expect(logs.server.warn).toHaveBeenCalledTimes(2);
  });
});

describe('previewReply', () => {
  it('renders the sample sender when the operator gives none', async () => {
    const out = await previewReply(account({ reply_template: '{{sender_name}}|{{ticket_no}}|{{subject}}' }));
    expect(out.text).toBe('Asha|ST-PREVIEW|Refund for a pod I could not attend');
  });

  it('uses what the operator supplied over the sample', async () => {
    const out = await previewReply(account({ reply_template: '{{sender_name}}|{{ticket_no}}|{{subject}}' }), {
      ticketNo: 'ST-9', senderName: 'Ravi', senderEmail: 'r@x.com', subject: 'Hello', bodyText: 'Body',
    });
    expect(out.text).toBe('Ravi|ST-9|Hello');
  });

  it('shows the sample message to the rewriter when none is given', async () => {
    (openaiChat as jest.Mock).mockResolvedValue({ ok: true, content: 'ST-PREVIEW done' });
    await previewReply(account({ ai_enabled: true }));
    expect((resolvePrompt as jest.Mock).mock.calls[1][1].body).toContain('I booked a pod last Saturday');
  });
});
