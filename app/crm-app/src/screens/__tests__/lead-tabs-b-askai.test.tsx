import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Lead } from '@/features/leads/useLead';
import * as tabsA from '@/graphql/leadTabs';
import * as docs from '@/graphql/leadTabsB';
import { CrmAppCreateReminderDocument } from '@/graphql/reminders';
import { CrmAppUpdateReminderDocument } from '@/graphql/remindersExtra';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { AskAiTab } from '../lead/tabs/AskAiTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Lead › Ask AI: a conversation about the lead whose drafts and reminders the agent confirms. */

const request = gqlRequest as jest.Mock;
const DUE = '2026-11-26T10:00:00.000Z';
const action = (over: Record<string, unknown>) => ({
  type: 'CREATE_REMINDER',
  status: 'PROPOSED',
  to: null,
  subject: null,
  body_html: null,
  reminder_id: null,
  title: null,
  due_at: null,
  notes: null,
  reminder_status: null,
  result_message: null,
  ...over,
});
const ASSISTANT = {
  id: 'm2',
  role: 'assistant',
  content: '<p>Here is a <b>draft</b>.</p>',
  actions: [
    action({
      type: 'EMAIL_DRAFT',
      to: 'rohit@cafe.in',
      subject: 'Sunday slots',
      body_html: '<p>Hi Rohit,</p><p>Sunday works.</p>',
    }),
    action({ title: 'Call back', due_at: DUE, notes: 'Ask about pricing' }),
    action({ type: 'UPDATE_REMINDER', reminder_id: 'r1', reminder_status: 'DONE' }),
    action({ status: 'DONE', title: 'Old', result_message: 'Saved earlier' }),
    action({ status: 'DISMISSED', title: 'Nope' }),
  ],
};
const MESSAGES = [{ id: 'm1', role: 'user', content: 'Draft an email', actions: [] }, ASSISTANT];
const CONTEXT = {
  total_tokens: 1234,
  total_chars: 2048,
  sources: [
    { key: 'profile', items: 1, chars: 500, tokens: 125, truncated: false },
    { key: 'emails', items: 3, chars: 0, tokens: 0, truncated: false },
    { key: 'custom', items: 2, chars: 10, tokens: 3, truncated: true },
  ],
};
const LEAD: Lead = {
  id: 'v1',
  name: 'Smash Arena',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Medium',
  assigned_to: null,
  next_follow_up_date: null,
  contacts: [
    {
      name: 'Rohit',
      role: 'Owner',
      mobile_number: null,
      whatsapp_number: null,
      email: ' rohit@cafe.in ',
    },
  ],
  activity_log: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const withStatus = (vars: Record<string, unknown>) => ({
  setCrmLeadAiActionStatus: {
    ...ASSISTANT,
    actions: ASSISTANT.actions.map((a, i) =>
      i === vars.action_index
        ? { ...a, status: vars.status, result_message: vars.result_message }
        : a,
    ),
  },
});
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadAiThreadDocument)
      return { crmLeadAiThread: { messages: MESSAGES, context: CONTEXT } };
    if (doc === docs.CrmAppSetLeadAiActionDocument) return withStatus(vars);
    if (doc === docs.CrmAppClearLeadAiDocument) return { clearCrmLeadAiThread: true };
    if (doc === CrmAppCreateReminderDocument) return { createCrmReminder: { id: 'r9' } };
    if (doc === CrmAppUpdateReminderDocument) return { updateCrmReminder: { id: 'r1' } };
    if (doc === tabsA.CrmAppComposeProvidersDocument)
      return { commsProviderOptions: [{ id: 'p1', name: 'Zoho', is_default: true }] };
    if (doc === tabsA.CrmAppComposeTemplatesDocument) return { crmEmailTemplates: [] };
    if (doc === tabsA.CrmAppComposeVenueEmailDocument)
      return { emailVenueLeadContact: { ok: true, message: 'Email sent' } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const first = (testID: string) => {
  const [node] = screen.getAllByTestId(testID);
  if (!node) throw new Error(`no ${testID}`);
  return node;
};
const onChanged = jest.fn();
const renderTab = () =>
  renderWithTheme(<AskAiTab kind="VENUE_LEAD" id="v1" lead={LEAD} onChanged={onChanged} />);

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('AskAiTab', () => {
  it('offers starter questions, asks one, and starts the conversation over', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppLeadAiThreadDocument,
          () => ({ crmLeadAiThread: { messages: [], context: CONTEXT } }),
        ],
        [
          docs.CrmAppAskLeadAiDocument,
          (vars) => ({
            askCrmLeadAi: {
              user_message: { id: 'u9', role: 'user', content: vars.message, actions: [] },
              assistant_message: {
                id: 'a9',
                role: 'assistant',
                content: '<p>All good.</p>',
                actions: [],
              },
              context: CONTEXT,
            },
          }),
        ],
      ]),
    );
    renderTab();
    expect(await screen.findByText('Ask anything about this lead. Try:')).toBeOnTheScreen();
    expect(screen.getByText('About Smash Arena')).toBeOnTheScreen();
    await act(async () => fireEvent.press(first('crm-ask-ai-suggestion')));
    expect(callsTo(docs.CrmAppAskLeadAiDocument)[0]?.[1]).toEqual({
      entity: 'VENUE_LEAD',
      lead_id: 'v1',
      message: 'Summarise this lead and where we stand',
    });
    expect(await screen.findByText('All good.')).toBeOnTheScreen();
    expect(screen.getByText('Summarise this lead and where we stand')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('crm-ask-ai-clear')));
    expect(callsTo(docs.CrmAppClearLeadAiDocument)[0]?.[1]).toEqual({
      entity: 'VENUE_LEAD',
      lead_id: 'v1',
    });
    expect(await screen.findByText('Ask anything about this lead. Try:')).toBeOnTheScreen();
  });

  it('lists what the assistant read, by source, when opened', async () => {
    renderTab();
    expect(await screen.findByText('1,234 tokens · 2.0 KB from 2 sources')).toBeOnTheScreen();
    expect(screen.queryByText('Lead profile')).toBeNull();
    fireEvent.press(screen.getByText('What the assistant knows'));
    expect(screen.getByText('Lead profile')).toBeOnTheScreen();
    expect(screen.getByText('Emails')).toBeOnTheScreen();
    expect(screen.getByText('custom')).toBeOnTheScreen();
    expect(screen.getByText('Trimmed')).toBeOnTheScreen();
    expect(screen.getByText('1 items · 125 tokens')).toBeOnTheScreen();
  });

  it('shows each proposal and carries out a reminder, a reminder change and a dismissal', async () => {
    renderTab();
    expect(await screen.findByText('Here is a draft.')).toBeOnTheScreen();
    expect(screen.getByText('To: rohit@cafe.in')).toBeOnTheScreen();
    expect(screen.getByText('Subject: Sunday slots')).toBeOnTheScreen();
    expect(screen.getByText('Hi Rohit, Sunday works.')).toBeOnTheScreen();
    expect(screen.getByText('Title: Call back')).toBeOnTheScreen();
    expect(screen.getByText(/^Due: /)).toBeOnTheScreen();
    expect(screen.getByText('Status: Mark done')).toBeOnTheScreen();
    expect(screen.getByText('Saved earlier')).toBeOnTheScreen();
    expect(screen.getByText('Dismissed')).toBeOnTheScreen();

    await act(async () => fireEvent.press(screen.getByTestId('ask-ai-create')));
    expect(callsTo(CrmAppCreateReminderDocument)[0]?.[1]).toEqual({
      input: {
        entity_type: 'VENUE_LEAD',
        lead_id: 'v1',
        title: 'Call back',
        due_at: DUE,
        notes: 'Ask about pricing',
      },
    });
    expect(callsTo(docs.CrmAppSetLeadAiActionDocument)[0]?.[1]).toMatchObject({
      message_id: 'm2',
      action_index: 1,
      status: 'DONE',
      result_message: null,
    });
    expect(onChanged).toHaveBeenCalled();

    await act(async () => fireEvent.press(screen.getByTestId('ask-ai-apply')));
    expect(callsTo(CrmAppUpdateReminderDocument)[0]?.[1]).toEqual({
      id: 'r1',
      input: { status: 'DONE' },
    });

    await act(async () => fireEvent.press(first('ask-ai-dismiss')));
    expect(callsTo(docs.CrmAppSetLeadAiActionDocument).at(-1)?.[1]).toMatchObject({
      action_index: 0,
      status: 'DISMISSED',
    });
  });

  it('reviews an email draft in the composer and sends it as written, recording the answer', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('ask-ai-review'));
    expect(screen.getByTestId('compose-to').props.value).toBe('rohit@cafe.in');
    expect(screen.getByTestId('compose-subject').props.value).toBe('Sunday slots');
    expect(screen.getByTestId('compose-message').props.value).toBe('Hi Rohit,\nSunday works.');
    // The composer picks the default provider once the list has loaded.
    expect(await screen.findByText(/^Zoho/)).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('ask-ai-email-send')));
    expect(callsTo(tabsA.CrmAppComposeVenueEmailDocument)[0]?.[1]).toMatchObject({
      id: 'v1',
      contact_email: 'rohit@cafe.in',
      subject: 'Sunday slots',
      body: '<p>Hi Rohit,</p><p>Sunday works.</p>',
      provider_id: 'p1',
    });
    expect(callsTo(docs.CrmAppSetLeadAiActionDocument)[0]?.[1]).toMatchObject({
      action_index: 0,
      status: 'DONE',
      result_message: 'Email sent',
    });
    await waitFor(() => expect(screen.queryByTestId('ask-ai-email')).toBeNull());
  });

  it('sends an edited draft as typed, and keeps it proposed when the send is refused', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          tabsA.CrmAppComposeVenueEmailDocument,
          () => ({ emailVenueLeadContact: { ok: false, message: 'SMTP is down' } }),
        ],
      ]),
    );
    renderTab();
    fireEvent.press(await screen.findByTestId('ask-ai-review'));
    fireEvent.changeText(screen.getByTestId('compose-message'), 'See you <Sunday>');
    await act(async () => fireEvent.press(screen.getByTestId('ask-ai-email-send')));
    expect(callsTo(tabsA.CrmAppComposeVenueEmailDocument)[0]?.[1]).toMatchObject({
      body: 'See you &lt;Sunday&gt;',
    });
    expect(await screen.findByText('SMTP is down')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppSetLeadAiActionDocument)).toHaveLength(0);
    expect(screen.getByTestId('ask-ai-review')).toBeOnTheScreen();
  });

  it('edits a proposed reminder in the lead’s reminder form before saving it', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('ask-ai-edit'));
    expect(screen.getByTestId('reminder-title').props.value).toBe('Call back');
    serve(
      new Map<unknown, Handler>([
        [CrmAppCreateReminderDocument, () => Promise.reject(new Error('Quota exceeded'))],
      ]),
    );
    await act(async () => fireEvent.press(screen.getByTestId('reminder-save')));
    expect(await screen.findByText('Quota exceeded')).toBeOnTheScreen();

    serve();
    fireEvent.changeText(screen.getByTestId('reminder-title'), 'Call Rohit back');
    await act(async () => fireEvent.press(screen.getByTestId('reminder-save')));
    expect(callsTo(CrmAppCreateReminderDocument).at(-1)?.[1]).toEqual({
      input: {
        entity_type: 'VENUE_LEAD',
        lead_id: 'v1',
        title: 'Call Rohit back',
        due_at: DUE,
        notes: 'Ask about pricing',
      },
    });
    expect(callsTo(docs.CrmAppSetLeadAiActionDocument)[0]?.[1]).toMatchObject({
      action_index: 1,
      status: 'DONE',
    });
    await waitFor(() => expect(screen.queryByTestId('ask-ai-reminder')).toBeNull());
  });

  it('puts a failed question back in the box with the reason, and says when a proposal fails', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppAskLeadAiDocument, () => Promise.reject(new Error('Assistant busy'))],
        [CrmAppUpdateReminderDocument, () => Promise.reject(new Error('Reminder not found'))],
      ]),
    );
    renderTab();
    await screen.findByText('Here is a draft.');
    fireEvent.changeText(screen.getByTestId('crm-ask-ai-input'), '  Any news?  ');
    await act(async () => fireEvent.press(screen.getByTestId('crm-ask-ai-send')));
    expect(callsTo(docs.CrmAppAskLeadAiDocument)[0]?.[1]).toMatchObject({ message: 'Any news?' });
    expect(await screen.findByText('Assistant busy')).toBeOnTheScreen();
    expect(screen.getByTestId('crm-ask-ai-input').props.value).toBe('Any news?');
    fireEvent.press(screen.getByTestId('crm-ask-ai-error-close'));
    await act(async () => fireEvent.press(screen.getByTestId('ask-ai-apply')));
    expect(await screen.findByText('Reminder not found')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppSetLeadAiActionDocument)).toHaveLength(0);
  });

  it('says when the conversation cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadAiThreadDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderTab();
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
  });
});
