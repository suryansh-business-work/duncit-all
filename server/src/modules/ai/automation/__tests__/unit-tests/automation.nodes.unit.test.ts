import { openaiChat } from '@services/openai/openai.client';
import { AiPromptModel } from '@modules/ai/prompt/prompt.model';
import { outboundFetch } from '@utils/outboundFetch';
import { executeNode } from '../../automation.nodes';
import { sendEmailStep, sendWhatsappStep } from '../../automation.send';
import type { AutomationNode, IAutomationRun } from '../../automation.model';
import type { StepContext } from '../../automation.types';

jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/ai/prompt/prompt.model', () => ({ AiPromptModel: { findById: jest.fn() } }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));
jest.mock('../../automation.send', () => ({ sendWhatsappStep: jest.fn(), sendEmailStep: jest.fn() }));
// automation.vars pulls these in for initialVars, which the executors never call.
jest.mock('@modules/access/user/user.model', () => ({ UserModel: {} }));
jest.mock('@modules/crm/marketing/waCampaign.recipients', () => ({ WA_VARIABLES: [] }));

const mockChat = openaiChat as jest.Mock;
const mockFindById = AiPromptModel.findById as jest.Mock;
const mockFetch = outboundFetch as jest.Mock;

const NOW = new Date('2026-10-01T10:00:00.000Z');
const HOUR = 60 * 60_000;

const node = (kind: string, data: Record<string, unknown> = {}): AutomationNode => ({ id: 'n1', kind, x: 0, y: 0, data });

const ctx = (n: AutomationNode, over: Partial<StepContext> = {}): StepContext => ({
  run: { flow_id: 'flow-1' } as unknown as IAutomationRun,
  node: n,
  vars: { message: { text: 'I want to book a pod' }, contact: { name: 'Asha' } },
  live: false,
  test: false,
  ...over,
});

/** The AI Library lookup resolves to `row` (or rejects when `row` is an Error). */
const library = (row: unknown) =>
  mockFindById.mockReturnValue({
    select: () => ({ lean: () => (row instanceof Error ? Promise.reject(row) : Promise.resolve(row)) }),
  });

const chatOk = (content: string, model = 'gpt-4o-mini') => mockChat.mockResolvedValue({ ok: true, content, model });
const chatFail = (message = 'OpenAI is not configured') =>
  mockChat.mockResolvedValue({ ok: false, code: 'NOT_CONFIGURED', status: 0, message, model: 'gpt-4o-mini' });

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});
afterEach(() => {
  jest.useRealTimers();
});

describe('executeNode — dispatch', () => {
  it('fails an unknown step kind instead of throwing', async () => {
    await expect(executeNode(ctx(node('teleport')))).resolves.toEqual({
      handle: 'next',
      status: 'FAILED',
      detail: 'Unknown step kind "teleport"',
    });
  });

  it('hands send steps to the send module with the same context', async () => {
    const wa = { handle: 'next', status: 'OK', detail: 'sent wa' };
    const mail = { handle: 'next', status: 'OK', detail: 'sent mail' };
    (sendWhatsappStep as jest.Mock).mockResolvedValue(wa);
    (sendEmailStep as jest.Mock).mockResolvedValue(mail);
    const waCtx = ctx(node('send_whatsapp'));
    const mailCtx = ctx(node('send_email'));

    await expect(executeNode(waCtx)).resolves.toBe(wa);
    await expect(executeNode(mailCtx)).resolves.toBe(mail);
    expect(sendWhatsappStep).toHaveBeenCalledWith(waCtx);
    expect(sendEmailStep).toHaveBeenCalledWith(mailCtx);
  });
});

describe('trigger step', () => {
  it('names what started the run', async () => {
    await expect(executeNode(ctx(node('trigger', { trigger: 'INBOUND_MESSAGE' })))).resolves.toEqual({
      handle: 'next',
      status: 'OK',
      detail: 'Started by INBOUND_MESSAGE',
    });
  });

  it('falls back to "a run" when the trigger is blank', async () => {
    const result = await executeNode(ctx(node('trigger')));
    expect(result.detail).toBe('Started by a run');
  });
});

describe('ai_compose step', () => {
  it('stores the trimmed reply under the named variable using the library prompt and model', async () => {
    library({ content: 'You are Duncit support.', target_model: 'gpt-4o', is_active: true });
    chatOk('  Sure, here is the link.  ', 'gpt-4o');

    const result = await executeNode(
      ctx(node('ai_compose', { prompt_id: 'p1', output_var: 'answer', instructions: 'Greet {{contact.name}}' }))
    );

    expect(mockFindById).toHaveBeenCalledWith('p1');
    expect(mockChat).toHaveBeenCalledWith({
      task: 'automation.compose',
      detail: 'flow:flow-1',
      model: 'gpt-4o',
      temperature: 0.5,
      messages: [
        { role: 'system', content: 'You are Duncit support.\n\nGreet Asha' },
        { role: 'user', content: 'I want to book a pod' },
      ],
    });
    expect(result).toEqual({
      handle: 'next',
      status: 'OK',
      detail: 'Saved {{answer}} (23 characters, gpt-4o)',
      vars: expect.objectContaining({ answer: 'Sure, here is the link.' }),
    });
  });

  it('defaults the output to ai_reply, skips the library without a prompt id and sends a placeholder for an empty input', async () => {
    chatOk('ok');
    const result = await executeNode(ctx(node('ai_compose', { input: '   ' }), { vars: {} }));

    expect(mockFindById).not.toHaveBeenCalled();
    const req = mockChat.mock.calls[0][0];
    expect(req.model).toBeUndefined();
    // '{{message.text}}' is left standing when the variable is unknown.
    expect(req.messages[1]).toEqual({ role: 'user', content: '{{message.text}}' });
    expect(result.vars).toEqual({ ai_reply: 'ok' });
  });

  it('ignores an inactive library prompt', async () => {
    library({ content: 'Retired prompt', target_model: 'gpt-4o', is_active: false });
    chatOk('done');
    await executeNode(ctx(node('ai_compose', { prompt_id: 'p1', instructions: 'Be brief' })));
    const req = mockChat.mock.calls[0][0];
    expect(req.model).toBeUndefined();
    expect(req.messages[0].content).toBe('Be brief');
  });

  it('treats a failed library lookup as no prompt', async () => {
    library(new Error('bad id'));
    chatOk('done');
    await executeNode(ctx(node('ai_compose', { prompt_id: 'not-an-id', instructions: 'Be brief' })));
    expect(mockChat.mock.calls[0][0].messages[0].content).toBe('Be brief');
  });

  it('fails the step and blanks the output when the model call fails', async () => {
    chatFail('OpenAI key missing');
    const result = await executeNode(ctx(node('ai_compose', { output_var: 'answer' })));
    expect(result).toEqual({
      handle: 'next',
      status: 'FAILED',
      detail: 'OpenAI key missing',
      vars: expect.objectContaining({ answer: '' }),
    });
  });
});

describe('ai_classify step', () => {
  const classify = (data: Record<string, unknown> = {}) =>
    node('ai_classify', { labels: ['Booking', 'Refund request', ''], ...data });

  it('takes the exit of an exact label match, ignoring case and punctuation', async () => {
    chatOk('refund-request.');
    const result = await executeNode(ctx(classify()));
    expect(result).toEqual({
      handle: 'label:1',
      status: 'OK',
      detail: 'Sorted as "Refund request"',
      vars: expect.objectContaining({ intent: 'Refund request' }),
    });
    const req = mockChat.mock.calls[0][0];
    expect(req).toEqual(expect.objectContaining({ task: 'automation.classify', temperature: 0, max_tokens: 30 }));
    expect(req.messages[0].content).toBe(
      'Answer with exactly one of these labels and nothing else: Booking, Refund request. If none fits, answer OTHER.'
    );
  });

  it('falls back to a label contained in a wordier answer', async () => {
    chatOk('I think this is a Booking question');
    const result = await executeNode(ctx(classify()));
    expect(result.handle).toBe('label:0');
    expect(result.vars).toEqual(expect.objectContaining({ intent: 'Booking' }));
  });

  it('takes the other exit when no label fits', async () => {
    chatOk('  Complaint ');
    const result = await executeNode(ctx(classify()));
    expect(result).toEqual({
      handle: 'other',
      status: 'OK',
      detail: 'Model answered "Complaint" — took the Anything else exit',
      vars: expect.objectContaining({ intent: 'other' }),
    });
  });

  it('takes the other exit as a failed step when the model call fails', async () => {
    chatFail('upstream 500');
    const result = await executeNode(ctx(classify()));
    expect(result).toEqual({
      handle: 'other',
      status: 'FAILED',
      detail: 'upstream 500',
      vars: expect.objectContaining({ intent: 'other' }),
    });
  });

  it('leads the system prompt with the library prompt and instructions, and pins its model', async () => {
    library({ content: 'Library body', target_model: 'gpt-4o', is_active: true });
    chatOk('booking');
    await executeNode(ctx(classify({ prompt_id: 'p2', instructions: 'Sort {{contact.name}}', input: '' }), { vars: {} }));
    const req = mockChat.mock.calls[0][0];
    expect(req.model).toBe('gpt-4o');
    expect(req.messages[0].content.startsWith('Library body\n\nSort {{contact.name}}\n\nAnswer with')).toBe(true);
  });

  it('treats a non-array labels value as no labels', async () => {
    chatOk('anything');
    const result = await executeNode(ctx(node('ai_classify', { labels: 'Booking' })));
    expect(result.handle).toBe('other');
  });
});

describe('condition step', () => {
  it('takes yes when the rendered value matches', async () => {
    const result = await executeNode(
      ctx(node('condition', { variable: 'message.text', operator: 'contains', value: 'book' }))
    );
    expect(result).toEqual({ handle: 'yes', status: 'OK', detail: '"I want to book a pod" contains "book" → yes' });
  });

  it('takes no, renders the expected value and spaces the operator name', async () => {
    const result = await executeNode(
      ctx(node('condition', { variable: 'message.text', operator: 'starts_with', value: '{{contact.name}}' }))
    );
    expect(result).toEqual({ handle: 'no', status: 'OK', detail: '"I want to book a pod" starts with "Asha" → no' });
  });

  it('shortens a long actual value in the detail', async () => {
    const long = 'x'.repeat(80);
    const result = await executeNode(
      ctx(node('condition', { variable: 'note', operator: 'not_empty' }), { vars: { note: long } })
    );
    expect(result.handle).toBe('yes');
    expect(result.detail).toBe(`"${'x'.repeat(57)}…" not empty "" → yes`);
  });
});

describe('wait_for_reply step', () => {
  it('parks on a reply wait for the configured hours', async () => {
    const result = await executeNode(ctx(node('wait_for_reply', { timeout_hours: 6 })));
    expect(result).toEqual({
      handle: 'reply',
      status: 'WAITING',
      detail: 'Waiting up to 6 hours for a reply',
      wait: { kind: 'REPLY', until: new Date(NOW.getTime() + 6 * HOUR) },
    });
  });

  it.each([
    [undefined, 24],
    [0, 24],
    [0.2, 1],
    [5000, 720],
  ])('clamps timeout_hours %p to %p', async (hours, expected) => {
    const result = await executeNode(ctx(node('wait_for_reply', { timeout_hours: hours })));
    expect(result.detail).toBe(`Waiting up to ${expected} hours for a reply`);
  });
});

describe('delay step', () => {
  it('parks a live run until the delay is up', async () => {
    const result = await executeNode(ctx(node('delay', { amount: 2, unit: 'DAYS' })));
    expect(result).toEqual({
      handle: 'next',
      status: 'WAITING',
      detail: 'Waiting 2 days',
      wait: { kind: 'DELAY', until: new Date(NOW.getTime() + 48 * HOUR) },
    });
  });

  it('defaults to one hour and floors fractional amounts', async () => {
    const blank = await executeNode(ctx(node('delay')));
    expect(blank.detail).toBe('Waiting 1 hours');
    expect(blank.wait).toEqual({ kind: 'DELAY', until: new Date(NOW.getTime() + HOUR) });

    const minutes = await executeNode(ctx(node('delay', { amount: 2.9, unit: 'MINUTES' })));
    expect(minutes.detail).toBe('Waiting 2 minutes');
    expect(minutes.wait).toEqual({ kind: 'DELAY', until: new Date(NOW.getTime() + 2 * 60_000) });
  });

  it('treats an unknown unit as hours but labels it as saved', async () => {
    const result = await executeNode(ctx(node('delay', { amount: 3, unit: 'WEEKS' })));
    expect(result.detail).toBe('Waiting 3 weeks');
    expect(result.wait).toEqual({ kind: 'DELAY', until: new Date(NOW.getTime() + 3 * HOUR) });
  });

  it('collapses in a test run and notes it in the transcript', async () => {
    const result = await executeNode(ctx(node('delay', { amount: 5, unit: 'MINUTES' }), { test: true }));
    expect(result.status).toBe('OK');
    expect(result.wait).toBeUndefined();
    expect(result.detail).toBe('Waits 5 minutes (skipped in test)');
    expect(result.message).toEqual(
      expect.objectContaining({ direction: 'SYSTEM', kind: 'text', text: 'Waits 5 minutes — skipped in a test run', delivered: false })
    );
  });
});

describe('set_variable step', () => {
  it('renders the value into the named variable without mutating the input', async () => {
    const vars = { contact: { name: 'Asha' } };
    const result = await executeNode(
      ctx(node('set_variable', { name: 'greeting', value: 'Hi {{contact.name}}' }), { vars })
    );
    expect(result).toEqual({
      handle: 'next',
      status: 'OK',
      detail: 'Set {{greeting}} = "Hi Asha"',
      vars: { contact: { name: 'Asha' }, greeting: 'Hi Asha' },
    });
    expect(vars).toEqual({ contact: { name: 'Asha' } });
  });

  it('cuts the shown value at 80 characters but stores it whole', async () => {
    const value = 'y'.repeat(100);
    const result = await executeNode(ctx(node('set_variable', { name: 'long', value })));
    expect(result.detail).toBe(`Set {{long}} = "${'y'.repeat(80)}"`);
    expect(result.vars).toEqual(expect.objectContaining({ long: value }));
  });
});

describe('http_request step', () => {
  const http = (data: Record<string, unknown>) => node('http_request', data);
  const response = (status: number, body: string) => ({ ok: status < 400, status, text: async () => body });

  it.each(['http://example.com/hook', 'not a url', ''])('refuses the non-https URL %p', async (url) => {
    const result = await executeNode(ctx(http({ url }), { live: true }));
    expect(result).toEqual({ handle: 'next', status: 'FAILED', detail: `Not an https URL: ${url}` });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['https://localhost/hook', 'localhost'],
    ['https://127.0.0.1/hook', '127.0.0.1'],
    ['https://10.1.2.3/hook', '10.1.2.3'],
    ['https://192.168.0.10/hook', '192.168.0.10'],
    ['https://172.20.0.1/hook', '172.20.0.1'],
    ['https://169.254.169.254/latest', '169.254.169.254'],
    ['https://[::1]/hook', '[::1]'],
    ['https://db.internal/hook', 'db.internal'],
    ['https://printer.local/hook', 'printer.local'],
  ])('refuses the private host in %p', async (url, host) => {
    const result = await executeNode(ctx(http({ url }), { live: true }));
    expect(result).toEqual({ handle: 'next', status: 'FAILED', detail: `Refused: ${host} is not a public host` });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('allows a public 172.x host outside the private range', async () => {
    mockFetch.mockResolvedValue(response(200, 'ok'));
    const result = await executeNode(ctx(http({ url: 'https://172.32.0.1/hook' }), { live: true }));
    expect(result.status).toBe('OK');
  });

  it('previews a POST with its body when the run is not live', async () => {
    const result = await executeNode(
      ctx(http({ url: 'https://hooks.example.com/{{contact.name}}', body: '{"who":"{{contact.name}}"}' }))
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.status).toBe('OK');
    expect(result.detail).toBe('Previewed POST https://hooks.example.com/Asha (not called)');
    expect(result.message?.text).toBe('POST https://hooks.example.com/Asha\n{"who":"Asha"}');
  });

  it('previews a GET without a body', async () => {
    const result = await executeNode(ctx(http({ url: 'https://hooks.example.com/x', method: 'GET' })));
    expect(result.message?.text).toBe('GET https://hooks.example.com/x');
  });

  it('POSTs the variables as JSON when no body is set, and stores the parsed JSON answer', async () => {
    mockFetch.mockResolvedValue(response(201, '{"order":"A1"}'));
    const vars = { contact: { name: 'Asha' } };
    const result = await executeNode(
      ctx(http({ url: 'https://hooks.example.com/orders', output_var: 'order' }), { live: true, vars })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'Automation webhook',
      'https://hooks.example.com/orders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(vars),
        headers: { 'content-type': 'application/json', accept: 'application/json, text/plain' },
      })
    );
    expect(result).toEqual({
      handle: 'next',
      status: 'OK',
      detail: 'POST hooks.example.com → HTTP 201',
      vars: { contact: { name: 'Asha' }, order: { order: 'A1' } },
    });
  });

  it('sends a GET without a body and keeps a non-JSON answer as text under webhook', async () => {
    mockFetch.mockResolvedValue(response(200, 'plain answer'));
    const result = await executeNode(ctx(http({ url: 'https://hooks.example.com/q', method: 'GET' }), { live: true }));
    expect(mockFetch.mock.calls[0][2]).toEqual(expect.objectContaining({ method: 'GET', body: undefined }));
    expect(result.vars).toEqual(expect.objectContaining({ webhook: 'plain answer' }));
  });

  it('fails the step on an HTTP error status but still keeps the answer', async () => {
    mockFetch.mockResolvedValue(response(503, 'down'));
    const result = await executeNode(ctx(http({ url: 'https://hooks.example.com/x' }), { live: true }));
    expect(result.status).toBe('FAILED');
    expect(result.detail).toBe('POST hooks.example.com → HTTP 503');
    expect(result.vars).toEqual(expect.objectContaining({ webhook: 'down' }));
  });

  it('caps the stored answer at 20,000 characters', async () => {
    mockFetch.mockResolvedValue(response(200, 'z'.repeat(25_000)));
    const result = await executeNode(ctx(http({ url: 'https://hooks.example.com/x' }), { live: true }));
    expect((result.vars?.webhook as string).length).toBe(20_000);
  });

  it('fails the step with the error message when the call throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Automation webhook is unreachable'));
    const failed = await executeNode(ctx(http({ url: 'https://hooks.example.com/x' }), { live: true }));
    expect(failed).toEqual({ handle: 'next', status: 'FAILED', detail: 'Automation webhook is unreachable' });

    mockFetch.mockRejectedValueOnce('socket hang up');
    const raw = await executeNode(ctx(http({ url: 'https://hooks.example.com/x' }), { live: true }));
    expect(raw.detail).toBe('socket hang up');
  });
});
