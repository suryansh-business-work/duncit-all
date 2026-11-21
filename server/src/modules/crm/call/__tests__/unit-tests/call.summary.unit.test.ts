/**
 * The call summary runs after every transcribed call and costs a model call,
 * so: one run per log at a time (the claim), no run without a transcript, a
 * failure is stored for the portal to show and retry, and a dated follow-up
 * becomes exactly one reminder — never a second one on a re-run.
 */
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));
jest.mock('@modules/crm/communicationLog/communicationLog.service', () => ({
  communicationLogService: {
    claimSummary: jest.fn(),
    get: jest.fn(),
    saveSummary: jest.fn(),
    setSummaryReminder: jest.fn(),
    failSummary: jest.fn(),
  },
}));
jest.mock('@modules/crm/reminder/reminder.service', () => ({ reminderService: { create: jest.fn() } }));
jest.mock('@modules/crm/leadAi/leadAi.context', () => ({ LEAD_KIND_LABEL: { VENUE_LEAD: 'venue' } }));
jest.mock('./../../call.socket', () => ({ emitCallStatus: jest.fn() }));

import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { logs } from '@observability/log';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { reminderService } from '@modules/crm/reminder/reminder.service';
import { emitCallStatus } from '../../call.socket';
import { summarizeCall, summarizeCallInBackground } from '../../call.summary';

const store = communicationLogService as unknown as Record<string, jest.Mock>;
const chat = openaiChat as jest.Mock;
const prompt = resolvePrompt as jest.Mock;
const reminders = reminderService as unknown as { create: jest.Mock };
const emit = emitCallStatus as jest.Mock;

const ID = '6560f1f1f1f1f1f1f1f1f1f1';
const log = (over: Record<string, unknown> = {}) => ({
  id: ID,
  type: 'CALL',
  status: 'COMPLETED',
  entity_type: 'VENUE_LEAD',
  entity_id: 'lead1',
  contact_name: 'Meera',
  contact_value: '+919800000000',
  created_by: 'agent1',
  transcript: 'Agent: Hello\nLead: Call me Monday',
  transcript_segments: [],
  summary: { status: 'PENDING', reminder_id: null },
  ...over,
});
const future = () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
const modelAnswer = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ summary: 'Wants a call back.', key_points: [], sentiment: 'NEUTRAL', outcome: 'Call back', follow_ups: [], follow_up_reminder: null, ...over });

beforeEach(() => {
  store.claimSummary.mockResolvedValue(log());
  store.get.mockResolvedValue(log({ summary: { status: 'READY' } }));
  prompt.mockResolvedValue({ content: 'SYSTEM', model: 'gpt-4o-mini' });
  chat.mockResolvedValue({ ok: true, content: modelAnswer() });
  reminders.create.mockResolvedValue({ id: 'rem1' });
});

describe('summarizeCall', () => {
  it('summarises the transcript with the catalog prompt and stores the answer', async () => {
    const result = await summarizeCall(ID, { force: false });

    expect(store.claimSummary).toHaveBeenCalledWith(ID, { force: false });
    expect(prompt).toHaveBeenCalledWith(
      'crm.call_summary',
      expect.objectContaining({ lead_kind: 'venue', lead_name: 'Meera', transcript: 'Agent: Hello\nLead: Call me Monday' })
    );
    expect(chat).toHaveBeenCalledWith(expect.objectContaining({ task: 'crm.call_summary', json: true, model: 'gpt-4o-mini' }));
    expect(store.saveSummary).toHaveBeenCalledWith(ID, expect.objectContaining({ text: 'Wants a call back.', sentiment: 'NEUTRAL' }));
    expect(store.failSummary).not.toHaveBeenCalled();
    expect(reminders.create).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('agent1', expect.objectContaining({ log_id: ID, summary_status: 'READY' }));
    expect(result?.summary.status).toBe('READY');
  });

  it('builds the transcript from the live segments and names the lead by number when unnamed', async () => {
    store.claimSummary.mockResolvedValue(
      log({
        transcript: '',
        contact_name: '',
        transcript_segments: [
          { speaker: 'AGENT', text: 'Hi' },
          { speaker: 'LEAD', text: 'Hello' },
        ],
      })
    );

    await summarizeCall(ID, { force: true });

    expect(prompt).toHaveBeenCalledWith(
      'crm.call_summary',
      expect.objectContaining({ lead_name: '+919800000000', transcript: 'Agent: Hi\nLead: Hello' })
    );
  });

  it('sends only the most recent part of a very long call', async () => {
    store.claimSummary.mockResolvedValue(log({ transcript: `${'a'.repeat(30000)}END` }));

    await summarizeCall(ID, { force: true });

    const sent = prompt.mock.calls[0][1].transcript as string;
    expect(sent).toHaveLength(24000);
    expect(sent.endsWith('END')).toBe(true);
  });

  it('creates one follow-up reminder for the agent who placed the call', async () => {
    const due = future();
    chat.mockResolvedValue({ ok: true, content: modelAnswer({ follow_up_reminder: { title: 'Call Meera', due_at: due, notes: 'Pricing' } }) });

    await summarizeCall(ID, { force: false });

    expect(reminders.create).toHaveBeenCalledWith(
      { entity_type: 'VENUE_LEAD', lead_id: 'lead1', title: 'Call Meera', due_at: new Date(due).toISOString(), notes: 'Pricing', assigned_to: 'agent1' },
      'agent1'
    );
    expect(store.setSummaryReminder).toHaveBeenCalledWith(ID, 'rem1');
  });

  it('passes no notes when the follow-up has none', async () => {
    chat.mockResolvedValue({ ok: true, content: modelAnswer({ follow_up_reminder: { title: 'Call Meera', due_at: future() } }) });
    await summarizeCall(ID, { force: false });
    expect(reminders.create).toHaveBeenCalledWith(expect.objectContaining({ notes: null }), 'agent1');
  });

  it('never adds a second reminder when the call already has one', async () => {
    store.claimSummary.mockResolvedValue(log({ summary: { status: 'PENDING', reminder_id: 'rem0' } }));
    chat.mockResolvedValue({ ok: true, content: modelAnswer({ follow_up_reminder: { title: 'Again', due_at: future() } }) });

    await summarizeCall(ID, { force: true });

    expect(reminders.create).not.toHaveBeenCalled();
  });

  it('records nothing when the reminder came back without an id', async () => {
    reminders.create.mockResolvedValue(null);
    chat.mockResolvedValue({ ok: true, content: modelAnswer({ follow_up_reminder: { title: 'Call', due_at: future() } }) });

    await summarizeCall(ID, { force: false });

    expect(store.setSummaryReminder).not.toHaveBeenCalled();
  });

  it('does nothing for an id that is not one', async () => {
    await expect(summarizeCall('nope', { force: true })).resolves.toBeNull();
    expect(store.claimSummary).not.toHaveBeenCalled();
  });

  it('hands back the log untouched when another run holds the claim (or it is already done)', async () => {
    store.claimSummary.mockResolvedValue(null);

    await summarizeCall(ID, { force: false });

    expect(chat).not.toHaveBeenCalled();
    expect(store.get).toHaveBeenCalledWith(ID);
  });

  it('fails without calling the model when there is no transcript', async () => {
    store.claimSummary.mockResolvedValue(log({ transcript: '  ' }));

    await summarizeCall(ID, { force: true });

    expect(chat).not.toHaveBeenCalled();
    expect(store.failSummary).toHaveBeenCalledWith(ID, 'There is no transcript to summarise yet.');
  });

  it("stores the model's own failure (for example, switched off in AI Features)", async () => {
    chat.mockResolvedValue({ ok: false, code: 'DISABLED', message: 'Call summary is switched off' });
    await summarizeCall(ID, { force: true });
    expect(store.failSummary).toHaveBeenCalledWith(ID, 'Call summary is switched off');
  });

  it('stores a generic failure when the model failed without saying why', async () => {
    chat.mockResolvedValue({ ok: false, code: 'UPSTREAM', message: '' });
    await summarizeCall(ID, { force: true });
    expect(store.failSummary).toHaveBeenCalledWith(ID, 'The AI summary could not be generated.');
  });

  it('stores a failure when the answer cannot be read', async () => {
    chat.mockResolvedValue({ ok: true, content: 'not json' });
    await summarizeCall(ID, { force: true });
    expect(store.saveSummary).not.toHaveBeenCalled();
    expect(store.failSummary).toHaveBeenCalledWith(ID, 'The AI answer could not be read. Try again.');
  });

  it('logs and stores a failure when the run throws', async () => {
    prompt.mockRejectedValue(new Error('prompt missing'));

    await summarizeCall(ID, { force: true });

    expect(logs.server.error).toHaveBeenCalledWith('crm', 'call-summary', expect.objectContaining({ log_id: ID }));
    expect(store.failSummary).toHaveBeenCalledWith(ID, 'The AI summary could not be generated. Try again.');
  });

  it('notifies nobody when the log is gone by the time the run ends', async () => {
    store.get.mockResolvedValue(null);
    await expect(summarizeCall(ID, { force: true })).resolves.toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });

  it('notifies nobody when the call has no owner', async () => {
    store.get.mockResolvedValue(log({ created_by: null, summary: { status: 'READY' } }));
    await summarizeCall(ID, { force: true });
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('summarizeCallInBackground', () => {
  it('runs the automatic (non-forced) summary', async () => {
    summarizeCallInBackground(ID);
    await new Promise((resolve) => setImmediate(resolve));
    expect(store.claimSummary).toHaveBeenCalledWith(ID, { force: false });
  });

  it('logs a run that rejects instead of throwing into the webhook', async () => {
    store.claimSummary.mockRejectedValue(new Error('db down'));

    summarizeCallInBackground(ID);
    await new Promise((resolve) => setImmediate(resolve));

    expect(logs.server.error).toHaveBeenCalledWith('crm', 'call-summary', expect.objectContaining({ msg: 'Background call summary failed' }));
  });
});
