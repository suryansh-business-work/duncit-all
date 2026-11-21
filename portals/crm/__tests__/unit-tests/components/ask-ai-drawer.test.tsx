import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import AskAiDrawer from '@/components/ask-ai/AskAiDrawer';
import {
  ASK_CRM_LEAD_AI,
  CLEAR_CRM_LEAD_AI_THREAD,
  CRM_LEAD_AI_THREAD,
  SET_CRM_LEAD_AI_ACTION_STATUS,
} from '@/api/askAi.gql';
import { CREATE_CRM_REMINDER, CRM_REMINDERS, UPDATE_CRM_REMINDER } from '@/api/reminders.gql';
import { tokens } from '@duncit/theme';
import { renderWithApollo } from '../helpers/renderWithApollo';

// The Tiptap editor has its own suite; read-only replies show their stored text.
vi.mock('@duncit/rich-text', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/rich-text')>()),
  DuncitRichTextInput: ({ value }: Readonly<{ value: string }>) => <div data-testid="ai-reply">{value}</div>,
}));

// The lead page's composer and reminder dialog have their own suites. Here they
// are doubles that show what they were opened with and report back like the real ones.
vi.mock('@/components/ContactComposeDialog', () => ({
  default: ({ open, draft, lead, onResult, onClose }: any) =>
    open ? (
      <div data-testid="composer">
        <p data-testid="composer-to">{draft?.to ?? lead.primary_email}</p>
        <p data-testid="composer-subject">{draft?.subject}</p>
        <button type="button" onClick={() => { onResult('Email sent', true); onClose(); }}>composer sent</button>
        <button type="button" onClick={() => { onResult('SMTP refused', false); onClose(); }}>composer failed</button>
      </div>
    ) : null,
}));
vi.mock('@/components/reminders-tab/ReminderFormDialog', () => ({
  default: ({ open, draft, onSaved }: any) =>
    open ? (
      <div data-testid="reminder-dialog">
        <p data-testid="reminder-title">{draft?.title}</p>
        <button type="button" onClick={onSaved}>reminder saved</button>
      </div>
    ) : null,
}));

const LEAD = { id: 'venue-1', display_name: 'Grand Hall', primary_email: 'meera@grandhall.in', primary_mobile: '9812345678' };
const vars = { entity: 'VENUE_LEAD', lead_id: 'venue-1' };

const source = (key: string, items: number, chars: number, tokens: number, truncated = false) => ({
  __typename: 'CrmLeadAiContextSource', key, items, chars, tokens, truncated,
});
const context = (tokens = 700) => ({
  __typename: 'CrmLeadAiContext',
  total_tokens: tokens,
  total_chars: 2048,
  built_at: '2026-11-21T10:00:00.000Z',
  sources: [source('profile', 1, 1024, 300), source('notes', 2, 1024, tokens - 300), source('emails', 0, 0, 0)],
});
const action = (over: Record<string, unknown>) => ({
  __typename: 'CrmLeadAiAction',
  type: 'EMAIL_DRAFT', status: 'PROPOSED', to: null, subject: null, body_html: null, reminder_id: null,
  title: null, due_at: null, notes: null, reminder_status: null, result_message: null,
  ...over,
});
const message = (id: string, role: 'user' | 'assistant', content: string, actions: unknown[] = []) => ({
  __typename: 'CrmLeadAiMessage', id, role, content, created_at: '2026-11-21T10:00:00.000Z', actions,
});

const threadMock = (messages: unknown[], ctx = context()): MockedResponse => ({
  request: { query: CRM_LEAD_AI_THREAD, variables: vars },
  result: { data: { crmLeadAiThread: { __typename: 'CrmLeadAiThread', messages, context: ctx } } },
});
const askMock = (text: string, reply: unknown, opts: { delay?: number; error?: Error } = {}): MockedResponse => ({
  request: { query: ASK_CRM_LEAD_AI, variables: { ...vars, message: text } },
  ...(opts.delay ? { delay: opts.delay } : {}),
  ...(opts.error
    ? { error: opts.error }
    : {
        result: {
          data: {
            askCrmLeadAi: { __typename: 'CrmLeadAiReply', user_message: message('u-9', 'user', text), assistant_message: reply, context: context(900) },
          },
        },
      }),
});
const statusMock = (messageId: string, index: number, status: string, updated: unknown, resultMessage: string | null = null): MockedResponse => ({
  request: {
    query: SET_CRM_LEAD_AI_ACTION_STATUS,
    variables: { ...vars, message_id: messageId, action_index: index, status, result_message: resultMessage },
  },
  result: { data: { setCrmLeadAiActionStatus: updated } },
});
const remindersMock: MockedResponse = {
  request: { query: CRM_REMINDERS, variables: { filter: { entity_type: 'VENUE_LEAD', lead_id: 'venue-1' } } },
  result: { data: { crmReminders: [] } },
  maxUsageCount: 5,
};

const renderDrawer = (mocks: MockedResponse[]) => {
  const onClose = vi.fn();
  renderWithApollo(<AskAiDrawer open entity="VENUE_LEAD" lead={LEAD} variableValues={{ city: 'Pune' }} onClose={onClose} />, mocks);
  return { onClose };
};

const input = () => screen.getByRole('textbox', { name: 'Ask about this lead…' });
const sendButton = () => screen.getByRole('button', { name: 'Send' });

let scrollSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
});
afterEach(() => {
  scrollSpy.mockRestore();
});

describe('AskAiDrawer — thread and context', () => {
  it('opens on the saved conversation with a summary of what the assistant read', async () => {
    const { onClose } = renderDrawer([threadMock([message('m1', 'user', 'Who owns it?'), message('m2', 'assistant', 'Meera Shah.')])]);

    expect(screen.getByRole('complementary', { name: 'Ask AI' })).toBeInTheDocument();
    expect(screen.getByText('About Grand Hall')).toBeInTheDocument();
    expect(await screen.findByText('700 tokens · 2.0 KB from 2 sources')).toBeInTheDocument();
    expect(screen.getByText('Who owns it?')).toBeInTheDocument();
    expect(screen.getByTestId('ai-reply')).toHaveTextContent('Meera Shah.');
    expect(screen.queryAllByTestId('crm-ask-ai-suggestion')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sits between the header and the taskbar so the question box is never covered', async () => {
    renderDrawer([threadMock([])]);
    await screen.findAllByTestId('crm-ask-ai-suggestion');

    const { headerHeight, taskbarHeight } = tokens.size;
    expect(screen.getByRole('complementary', { name: 'Ask AI' })).toHaveStyle({
      top: `${headerHeight}px`,
      height: `calc(100% - ${headerHeight + taskbarHeight}px)`,
    });
    // The conversation is the part that gives up room and scrolls; the composer keeps its size.
    expect(screen.getByRole('log')).toHaveStyle({ minHeight: '0px', overflowY: 'auto' });
  });

  it('offers starter questions on an empty thread and asks one', async () => {
    renderDrawer([
      threadMock([]),
      askMock('Summarise this lead and where we stand', message('a-9', 'assistant', 'A banquet venue in Pune.'), { delay: 300 }),
    ]);
    const starters = await screen.findAllByTestId('crm-ask-ai-suggestion');
    expect(starters.map((b) => b.textContent)).toEqual([
      'Summarise this lead and where we stand',
      'Draft a follow-up email',
      'Schedule a follow-up reminder',
    ]);

    fireEvent.click(starters[0]);

    expect(await screen.findByText('Thinking…')).toBeInTheDocument();
    expect(screen.getByText('Summarise this lead and where we stand')).toBeInTheDocument();
    expect(await screen.findByText('A banquet venue in Pune.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText('Thinking…')).toBeNull();
    expect(screen.getByText('900 tokens · 2.0 KB from 2 sources')).toBeInTheDocument();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('sends a typed question on Enter, not on Shift+Enter, and ignores a blank one', async () => {
    renderDrawer([threadMock([]), askMock('Any events booked?', message('a-1', 'assistant', 'Two in October.'))]);
    await screen.findByText('700 tokens · 2.0 KB from 2 sources');

    fireEvent.change(input(), { target: { value: '   ' } });
    expect(sendButton()).toBeDisabled();

    fireEvent.change(input(), { target: { value: 'Any events booked?' } });
    fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true });
    expect(input()).toHaveValue('Any events booked?');

    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(await screen.findByText('Two in October.')).toBeInTheDocument();
    expect(input()).toHaveValue('');
  });

  it('reports a failed question and puts it back in the box', async () => {
    renderDrawer([threadMock([]), askMock('Who owns it?', null, { error: new Error('AI assistant unavailable') })]);
    await screen.findByText('700 tokens · 2.0 KB from 2 sources');

    fireEvent.change(input(), { target: { value: 'Who owns it?' } });
    fireEvent.click(sendButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('AI assistant unavailable');
    expect(input()).toHaveValue('Who owns it?');
    expect(screen.queryByTestId('ai-reply')).toBeNull();
  });

  it('starts a new conversation', async () => {
    renderDrawer([
      threadMock([message('m1', 'user', 'Old question'), message('m2', 'assistant', 'Old answer')]),
      { request: { query: CLEAR_CRM_LEAD_AI_THREAD, variables: vars }, result: { data: { clearCrmLeadAiThread: true } } },
      threadMock([]),
    ]);
    await screen.findByText('Old question');

    fireEvent.click(screen.getByRole('button', { name: 'Start a new conversation' }));

    await waitFor(() => expect(screen.queryByText('Old question')).toBeNull());
    expect(await screen.findAllByTestId('crm-ask-ai-suggestion')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Start a new conversation' })).toBeDisabled();
  });
});

describe('AskAiDrawer — proposals', () => {
  const reminderAction = action({ type: 'CREATE_REMINDER', title: 'Send the rate card', due_at: '2026-11-24T04:30:00.000Z', notes: 'Weekend rates' });

  it('creates a proposed reminder and records it as done', async () => {
    const proposed = message('a1', 'assistant', 'I planned a reminder.', [reminderAction]);
    const done = message('a1', 'assistant', 'I planned a reminder.', [{ ...reminderAction, status: 'DONE' }]);
    renderDrawer([
      threadMock([proposed]),
      remindersMock,
      {
        request: {
          query: CREATE_CRM_REMINDER,
          variables: { input: { entity_type: 'VENUE_LEAD', lead_id: 'venue-1', title: 'Send the rate card', due_at: '2026-11-24T04:30:00.000Z', notes: 'Weekend rates' } },
        },
        result: { data: { createCrmReminder: { __typename: 'CrmReminder', id: 'r1', entity_type: 'VENUE_LEAD', lead_id: 'venue-1', title: 'Send the rate card', due_at: '2026-11-24T04:30:00.000Z', notes: 'Weekend rates', status: 'PENDING', assigned_to: null } } },
      },
      statusMock('a1', 0, 'DONE', done),
      threadMock([done]),
    ]);
    const card = within(await screen.findByTestId('crm-ask-ai-action'));
    expect(card.getByText('New reminder')).toBeInTheDocument();
    expect(card.getByText('Send the rate card')).toBeInTheDocument();

    fireEvent.click(card.getByRole('button', { name: 'Create reminder' }));

    expect(await card.findByText('Done')).toBeInTheDocument();
    expect(card.queryByRole('button', { name: 'Create reminder' })).toBeNull();
  });

  it('opens the reminder dialog with the proposal to edit before saving', async () => {
    const proposed = message('a1', 'assistant', 'I planned a reminder.', [reminderAction]);
    const done = message('a1', 'assistant', 'I planned a reminder.', [{ ...reminderAction, status: 'DONE' }]);
    renderDrawer([threadMock([proposed]), statusMock('a1', 0, 'DONE', done), threadMock([done])]);
    const card = within(await screen.findByTestId('crm-ask-ai-action'));

    fireEvent.click(card.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('reminder-title')).toHaveTextContent('Send the rate card');
    fireEvent.click(screen.getByRole('button', { name: 'reminder saved' }));

    expect(await card.findByText('Done')).toBeInTheDocument();
    expect(screen.queryByTestId('reminder-dialog')).toBeNull();
  });

  it('applies only the proposed change to an existing reminder', async () => {
    const change = action({ type: 'UPDATE_REMINDER', reminder_id: 'rem-4', reminder_status: 'DONE' });
    const proposed = message('a2', 'assistant', 'Marking it done.', [change]);
    const done = message('a2', 'assistant', 'Marking it done.', [{ ...change, status: 'DONE' }]);
    renderDrawer([
      threadMock([proposed]),
      remindersMock,
      {
        request: { query: UPDATE_CRM_REMINDER, variables: { id: 'rem-4', input: { status: 'DONE' } } },
        result: { data: { updateCrmReminder: { __typename: 'CrmReminder', id: 'rem-4', entity_type: 'VENUE_LEAD', lead_id: 'venue-1', title: 'Call', due_at: '2026-11-24T04:30:00.000Z', notes: null, status: 'DONE', assigned_to: null } } },
      },
      statusMock('a2', 0, 'DONE', done),
      threadMock([done]),
    ]);
    const card = within(await screen.findByTestId('crm-ask-ai-action'));
    expect(card.getByText('Reminder change')).toBeInTheDocument();
    expect(card.getByText('Mark done')).toBeInTheDocument();

    fireEvent.click(card.getByRole('button', { name: 'Apply change' }));

    expect(await card.findByText('Done')).toBeInTheDocument();
  });

  it('dismisses a proposal without running it', async () => {
    const proposed = message('a1', 'assistant', 'I planned a reminder.', [reminderAction]);
    const dismissed = message('a1', 'assistant', 'I planned a reminder.', [{ ...reminderAction, status: 'DISMISSED' }]);
    renderDrawer([threadMock([proposed]), statusMock('a1', 0, 'DISMISSED', dismissed)]);
    const card = within(await screen.findByTestId('crm-ask-ai-action'));

    fireEvent.click(card.getByRole('button', { name: 'Dismiss' }));

    expect(await card.findByText('Dismissed')).toBeInTheDocument();
    expect(card.queryByRole('button', { name: 'Create reminder' })).toBeNull();
  });

  const draft = action({ type: 'EMAIL_DRAFT', to: 'meera@grandhall.in', subject: 'Weekend rates', body_html: '<p>Hi Meera, here are the <b>weekend</b> rates.</p>' });

  it('reviews an email draft in the composer and records the send', async () => {
    const proposed = message('a3', 'assistant', 'Drafted below.', [draft]);
    const sent = message('a3', 'assistant', 'Drafted below.', [{ ...draft, status: 'DONE', result_message: 'Email sent' }]);
    renderDrawer([threadMock([proposed]), statusMock('a3', 0, 'DONE', sent, 'Email sent'), threadMock([sent])]);
    const card = within(await screen.findByTestId('crm-ask-ai-action'));
    expect(card.getByText('Email draft')).toBeInTheDocument();
    expect(card.getByText('Hi Meera, here are the weekend rates.')).toBeInTheDocument();

    fireEvent.click(card.getByRole('button', { name: 'Review and send' }));
    expect(screen.getByTestId('composer-to')).toHaveTextContent('meera@grandhall.in');
    expect(screen.getByTestId('composer-subject')).toHaveTextContent('Weekend rates');
    fireEvent.click(screen.getByRole('button', { name: 'composer sent' }));

    expect(await card.findByText('Done')).toBeInTheDocument();
    expect(card.getByText('Email sent')).toBeInTheDocument();
    expect(screen.queryByTestId('composer')).toBeNull();
  });

  it('keeps a draft proposed when the send fails, and says why', async () => {
    renderDrawer([threadMock([message('a3', 'assistant', 'Drafted below.', [draft])])]);
    const card = within(await screen.findByTestId('crm-ask-ai-action'));

    fireEvent.click(card.getByRole('button', { name: 'Review and send' }));
    fireEvent.click(screen.getByRole('button', { name: 'composer failed' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('SMTP refused');
    expect(card.getByRole('button', { name: 'Review and send' })).toBeEnabled();
  });

  it('flags a draft that has no recipient yet', async () => {
    renderDrawer([threadMock([message('a3', 'assistant', 'Drafted below.', [{ ...draft, to: null }])])]);
    const card = within(await screen.findByTestId('crm-ask-ai-action'));

    expect(card.getByText('No email on file. Add one before sending.')).toBeInTheDocument();
  });
});
