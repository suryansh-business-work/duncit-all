/**
 * Ask AI against a real database: the context reads every source of a lead's
 * history, questions and answers persist per agent, proposals are validated
 * against the lead, and a failed model call leaves the thread untouched.
 * Only the model and the prompt library are replaced.
 */
jest.mock('@services/openai/openai.client', () => ({
  ...jest.requireActual('@services/openai/openai.client'),
  openaiChat: jest.fn(),
}));
jest.mock('@modules/ai/prompt/prompt.service', () => ({
  ...jest.requireActual('@modules/ai/prompt/prompt.service'),
  resolvePrompt: jest.fn(),
}));

import { Types } from 'mongoose';
import { openaiChat } from '@services/openai/openai.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { VenueLeadModel, EcommLeadModel } from '@modules/crm/crm/crm.model';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import { ReminderModel } from '@modules/crm/reminder/reminder.model';
import { WebsitePageModel } from '@modules/crm/websitePage/websitePage.model';
import { buildLeadAiContext } from '../../leadAi.context';
import { leadAiService, MAX_QUESTION_CHARS } from '../../leadAi.service';
import { LEAD_AI_THREAD_CAP, LeadAiThreadModel } from '../../leadAi.model';

const chat = openaiChat as jest.Mock;
const prompt = resolvePrompt as jest.Mock;

const answer = (body: unknown) => chat.mockResolvedValueOnce({ ok: true, content: JSON.stringify(body), model: 'gpt-4o-mini' });

const errorOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as { message: string; extensions?: { code?: string } };
  }
  throw new Error('expected a rejection');
};

async function seedVenue() {
  const lead = await VenueLeadModel.create({
    venue_name: 'Cafe Mocha',
    city: 'Pune',
    full_address: '12 FC Road',
    contacts: [{ name: 'Priya', email: 'priya@mocha.test', mobile_number: '9876543210' }],
    next_follow_up_date: new Date('2026-11-25T05:30:00Z'),
    activity_log: [
      { type: 'NOTE', summary: 'First visit', body_html: '<p>Owner wants weekend <b>jazz</b> nights</p>', created_at: new Date('2026-11-01') },
      { type: 'EMAIL', summary: 'Intro deck', status: 'SENT', target: 'priya@mocha.test', created_at: new Date('2026-11-02') },
    ],
  });
  const id = lead._id;
  await CommunicationLogModel.create([
    { type: 'EMAIL', entity_type: 'VENUE_LEAD', entity_id: id, contact_value: 'priya@mocha.test', subject: 'Intro deck', body: '<p>Here is our deck</p>', status: 'SENT' },
    { type: 'CALL', entity_type: 'VENUE_LEAD', entity_id: id, contact_value: '9876543210', status: 'COMPLETED', duration_seconds: 95, transcript: 'She asked about the revenue split.' },
  ]);
  const reminder = await ReminderModel.create({ entity_type: 'VENUE_LEAD', lead_id: id, title: 'Send revenue sheet', due_at: new Date('2026-11-23T04:30:00Z') });
  await WebsitePageModel.create({ entity_type: 'VENUE_LEAD', lead_id: id, url: 'https://mocha.test', title: 'Mocha', status: 'FETCHED', content_text: 'Open 8am to 11pm' });
  return { leadId: String(id), reminderId: String(reminder._id) };
}

beforeEach(() => {
  chat.mockReset();
  prompt.mockReset();
  prompt.mockResolvedValue({ content: 'LEAD ASSISTANT', model: 'gpt-4o-mini' });
});

describe('buildLeadAiContext', () => {
  it('reads profile, notes, activity, emails, calls, reminders and website for a venue lead', async () => {
    const { leadId, reminderId } = await seedVenue();

    const ctx = await buildLeadAiContext('VENUE_LEAD', leadId);

    const items = Object.fromEntries(ctx.sources.map((s) => [s.key, s.items]));
    expect(items).toEqual({ profile: 1, notes: 1, activity: 1, emails: 1, calls: 1, reminders: 2, website: 1 });
    expect(ctx.text).toContain('Cafe Mocha');
    expect(ctx.text).toContain('Owner wants weekend jazz nights');
    expect(ctx.text).toContain('She asked about the revenue split.');
    expect(ctx.text).toContain(`id=${reminderId} [PENDING]`);
    expect(ctx.text).toContain('Next follow-up date on the lead');
    expect(ctx.text).toContain('Open 8am to 11pm');
    expect(ctx.text).not.toContain('activity_log');
    expect(ctx.lead).toEqual({ display_name: 'Cafe Mocha', primary_email: 'priya@mocha.test' });
    expect(ctx.reminders).toEqual([{ id: reminderId, title: 'Send revenue sheet', status: 'PENDING' }]);
    for (const s of ctx.sources) expect(s.tokens > 0).toBe(s.chars > 0);
  });

  it('works for an ecommerce lead and reports empty sources as zero', async () => {
    const lead = await EcommLeadModel.create({ seller_name: 'Loom & Thread' });

    const ctx = await buildLeadAiContext('ECOMM_LEAD', String(lead._id));

    expect(ctx.lead.display_name).toBe('Loom & Thread');
    expect(ctx.sources.find((s) => s.key === 'emails')).toMatchObject({ items: 0, chars: 0, tokens: 0, truncated: false });
    expect(ctx.text).toContain('(No emails.)');
  });

  it('marks a source truncated when its budget runs out', async () => {
    const notes = Array.from({ length: 30 }, (_, i) => ({ type: 'NOTE', body_text: `Note ${i} ${'detail '.repeat(150)}` }));
    const lead = await VenueLeadModel.create({ venue_name: 'Big Hall', city: 'Pune', full_address: 'x', activity_log: notes });

    const ctx = await buildLeadAiContext('VENUE_LEAD', String(lead._id));

    const source = ctx.sources.find((s) => s.key === 'notes');
    expect(source?.truncated).toBe(true);
    expect(source?.chars).toBeLessThanOrEqual(6001);
  });

  it('answers NOT_FOUND for an unknown or malformed id', async () => {
    expect((await errorOf(buildLeadAiContext('VENUE_LEAD', new Types.ObjectId().toString()))).extensions?.code).toBe('NOT_FOUND');
    expect((await errorOf(buildLeadAiContext('HOST_LEAD', 'not-an-id'))).extensions?.code).toBe('NOT_FOUND');
  });
});

describe('leadAiService.ask and thread', () => {
  it('saves the question and the answer, and returns validated proposals', async () => {
    const { leadId, reminderId } = await seedVenue();
    answer({
      reply: '<p>Drafted below.</p>',
      actions: [
        { type: 'EMAIL_DRAFT', subject: 'Revenue split', body_html: '<p>Hi Priya</p>' },
        { type: 'UPDATE_REMINDER', reminder_id: reminderId, status: 'DONE' },
        { type: 'UPDATE_REMINDER', reminder_id: new Types.ObjectId().toString(), status: 'DONE' },
      ],
    });

    const reply = await leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', '  Draft the revenue email  ');

    expect(reply.user_message).toMatchObject({ role: 'user', content: 'Draft the revenue email' });
    expect(reply.assistant_message.content).toBe('<p>Drafted below.</p>');
    expect(reply.assistant_message.actions.map((a: any) => a.type)).toEqual(['EMAIL_DRAFT', 'UPDATE_REMINDER']);
    expect(reply.assistant_message.actions[0]).toMatchObject({ to: 'priya@mocha.test', status: 'PROPOSED' });
    expect(prompt).toHaveBeenCalledWith('crm.lead_assistant', expect.objectContaining({ lead_kind: 'venue', lead_name: 'Cafe Mocha' }));
    const sent = chat.mock.calls[0][0];
    expect(sent).toMatchObject({ task: 'crm.lead_chat', json: true });
    expect(sent.messages.at(-1)).toEqual({ role: 'user', content: 'Draft the revenue email' });

    const thread = await leadAiService.thread('VENUE_LEAD', leadId, 'agent-1');
    expect(thread.messages.map((m: any) => m.role)).toEqual(['user', 'assistant']);
    expect(thread.context.sources.find((s: any) => s.key === 'conversation')).toMatchObject({ items: 2 });
    expect(thread.context.total_tokens).toBe(thread.context.sources.reduce((n: number, s: any) => n + s.tokens, 0));
  });

  it('replays earlier turns, with each proposal’s outcome, on the next question', async () => {
    const { leadId } = await seedVenue();
    answer({ reply: '<p>Here is a draft.</p>', actions: [{ type: 'EMAIL_DRAFT', subject: 'Hello', body_html: '<p>x</p>' }] });
    const first = await leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Write an intro email');
    await leadAiService.setActionStatus('VENUE_LEAD', leadId, 'agent-1', { message_id: first.assistant_message.id, action_index: 0, status: 'DONE' });
    answer({ reply: '<p>Done earlier.</p>', actions: [] });

    await leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Did I send it?');

    const history = chat.mock.calls[1][0].messages.slice(1);
    expect(history).toEqual([
      { role: 'user', content: 'Write an intro email' },
      { role: 'assistant', content: '<p>Here is a draft.</p>\n[email draft "Hello": DONE]' },
      { role: 'user', content: 'Did I send it?' },
    ]);
  });

  it('keeps each agent’s thread to themselves', async () => {
    const { leadId } = await seedVenue();
    answer({ reply: '<p>Hi</p>', actions: [] });
    await leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Hello');

    expect((await leadAiService.thread('VENUE_LEAD', leadId, 'agent-2')).messages).toEqual([]);
  });

  it('saves nothing when the model call fails or returns no reply', async () => {
    const { leadId } = await seedVenue();
    chat.mockResolvedValueOnce({ ok: false, code: 'DISABLED', status: 0, message: 'off', model: 'x' });
    const failed = await errorOf(leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Hello'));
    expect(failed.extensions?.code).toBe('AI_FEATURE_DISABLED');

    chat.mockResolvedValueOnce({ ok: true, content: 'not json', model: 'x' });
    expect((await errorOf(leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Hello'))).extensions?.code).toBe('AI_INVALID_JSON');

    answer({ reply: '   ', actions: [] });
    expect((await errorOf(leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Hello'))).extensions?.code).toBe('AI_INVALID_JSON');

    expect(await LeadAiThreadModel.countDocuments({ user_id: 'agent-1' })).toBe(0);
  });

  it('refuses an empty or oversized question before calling the model', async () => {
    const { leadId } = await seedVenue();
    expect((await errorOf(leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', '   '))).extensions?.code).toBe('BAD_USER_INPUT');
    const long = 'x'.repeat(MAX_QUESTION_CHARS + 1);
    expect((await errorOf(leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', long))).extensions?.code).toBe('BAD_USER_INPUT');
    expect(chat).not.toHaveBeenCalled();
  });

  it(`keeps only the newest ${LEAD_AI_THREAD_CAP} messages`, async () => {
    const { leadId } = await seedVenue();
    const old = Array.from({ length: LEAD_AI_THREAD_CAP - 1 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `old ${i}` }));
    await LeadAiThreadModel.create({ entity_type: 'VENUE_LEAD', lead_id: leadId, user_id: 'agent-1', messages: old });
    answer({ reply: '<p>New</p>', actions: [] });

    await leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Newest');

    const doc: any = await LeadAiThreadModel.findOne({ user_id: 'agent-1' }).lean();
    expect(doc.messages).toHaveLength(LEAD_AI_THREAD_CAP);
    expect(doc.messages[0].content).toBe('old 1');
    expect(doc.messages.at(-1).content).toBe('<p>New</p>');
  });
});

describe('leadAiService.setActionStatus and clear', () => {
  it('records an outcome, and refuses an unknown message or index', async () => {
    const { leadId } = await seedVenue();
    answer({ reply: '<p>x</p>', actions: [{ type: 'CREATE_REMINDER', title: 'Call', due_at: '2026-12-01T09:00:00Z' }] });
    const { assistant_message } = await leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'Remind me');

    const updated = await leadAiService.setActionStatus('VENUE_LEAD', leadId, 'agent-1', {
      message_id: assistant_message.id,
      action_index: 0,
      status: 'DISMISSED',
    });
    expect(updated.actions[0].status).toBe('DISMISSED');

    const unknown = await errorOf(
      leadAiService.setActionStatus('VENUE_LEAD', leadId, 'agent-1', { message_id: new Types.ObjectId().toString(), action_index: 0, status: 'DONE' })
    );
    expect(unknown.extensions?.code).toBe('NOT_FOUND');
    const badIndex = await errorOf(
      leadAiService.setActionStatus('VENUE_LEAD', leadId, 'agent-1', { message_id: assistant_message.id, action_index: 5, status: 'DONE' })
    );
    expect(badIndex.extensions?.code).toBe('NOT_FOUND');
    const negative = await errorOf(
      leadAiService.setActionStatus('VENUE_LEAD', leadId, 'agent-1', { message_id: assistant_message.id, action_index: -1, status: 'DONE' })
    );
    expect(negative.extensions?.code).toBe('BAD_USER_INPUT');
    // Another agent cannot touch it.
    const foreign = await errorOf(
      leadAiService.setActionStatus('VENUE_LEAD', leadId, 'agent-2', { message_id: assistant_message.id, action_index: 0, status: 'DONE' })
    );
    expect(foreign.extensions?.code).toBe('NOT_FOUND');
  });

  it('clears only the caller’s thread and leaves the lead’s records alone', async () => {
    const { leadId } = await seedVenue();
    answer({ reply: '<p>a</p>', actions: [] });
    await leadAiService.ask('VENUE_LEAD', leadId, 'agent-1', 'A');
    answer({ reply: '<p>b</p>', actions: [] });
    await leadAiService.ask('VENUE_LEAD', leadId, 'agent-2', 'B');

    await expect(leadAiService.clear('VENUE_LEAD', leadId, 'agent-1')).resolves.toBe(true);

    expect(await LeadAiThreadModel.countDocuments({ lead_id: leadId })).toBe(1);
    expect(await ReminderModel.countDocuments({ lead_id: leadId })).toBe(1);
    await expect(leadAiService.clear('VENUE_LEAD', 'not-an-id', 'agent-1')).resolves.toBe(true);
  });
});
