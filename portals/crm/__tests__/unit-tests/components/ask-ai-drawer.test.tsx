import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import AskAiDrawer from '@/components/ask-ai/AskAiDrawer';
import { renderWithApollo } from '../helpers/renderWithApollo';

// The Tiptap editor has its own suite; read-only replies show their stored text.
vi.mock('@duncit/rich-text', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/rich-text')>()),
  DuncitRichTextInput: ({ value }: Readonly<{ value: string }>) => <div data-testid="ai-reply">{value}</div>,
}));

// The drawer's own document (not exported); Apollo's mock link matches on the printed query.
const CRM_LEAD_AI_CHAT = gql`
  mutation CrmLeadAiChat($entity: CrmAiEntity!, $lead_id: ID!, $messages: [CrmChatMessageInput!]!) {
    crmLeadAiChat(entity: $entity, lead_id: $lead_id, messages: $messages)
  }
`;

type Msg = { role: 'user' | 'assistant'; content: string };

const chatMock = (messages: Msg[], outcome: { reply?: string | null; error?: Error; delay?: number }): MockedResponse => ({
  request: { query: CRM_LEAD_AI_CHAT, variables: { entity: 'VENUE_LEAD', lead_id: 'venue-1', messages } },
  ...(outcome.delay ? { delay: outcome.delay } : {}),
  ...(outcome.error ? { error: outcome.error } : { result: { data: { crmLeadAiChat: outcome.reply ?? null } } }),
});

const renderDrawer = (mocks: MockedResponse[]) => {
  const onClose = vi.fn();
  renderWithApollo(<AskAiDrawer open entity="VENUE_LEAD" leadId="venue-1" leadName="Grand Hall" onClose={onClose} />, mocks);
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

describe('AskAiDrawer', () => {
  it('introduces itself for the lead and offers starter questions', () => {
    const { onClose } = renderDrawer([]);

    expect(screen.getByRole('complementary', { name: 'Ask AI' })).toBeInTheDocument();
    expect(screen.getByText('About Grand Hall')).toBeInTheDocument();
    expect(screen.getAllByTestId('crm-ask-ai-suggestion').map((b) => b.textContent)).toEqual([
      'Summarise this lead',
      'Draft a follow-up email',
      'Any upcoming reminders?',
    ]);
    expect(sendButton()).toBeDisabled();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks a starter question, shows it is thinking, then shows the answer', async () => {
    renderDrawer([chatMock([{ role: 'user', content: 'Summarise this lead' }], { reply: 'Grand Hall is a banquet venue.', delay: 20 })]);

    fireEvent.click(screen.getByRole('button', { name: 'Summarise this lead' }));

    expect((await screen.findByText('Thinking…')).closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText('Summarise this lead')).toBeInTheDocument();
    expect(screen.queryAllByTestId('crm-ask-ai-suggestion')).toHaveLength(0);

    expect(await screen.findByTestId('ai-reply')).toHaveTextContent('Grand Hall is a banquet venue.');
    expect(screen.queryByText('Thinking…')).toBeNull();
  });

  it('sends the whole conversation on a follow-up typed question', async () => {
    renderDrawer([
      chatMock([{ role: 'user', content: 'Summarise this lead' }], { reply: 'A banquet venue.' }),
      chatMock(
        [
          { role: 'user', content: 'Summarise this lead' },
          { role: 'assistant', content: 'A banquet venue.' },
          { role: 'user', content: 'Who owns it?' },
        ],
        { reply: 'Meera Shah.' },
      ),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Summarise this lead' }));
    await screen.findByText('A banquet venue.');

    fireEvent.change(input(), { target: { value: '  Who owns it?  ' } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(screen.getAllByTestId('ai-reply').map((r) => r.textContent)).toEqual(['A banquet venue.', 'Meera Shah.']));
    expect(screen.getByText('Who owns it?')).toBeInTheDocument();
    expect(input()).toHaveValue('');
  });

  it('sends on Enter but treats Shift+Enter as a new line', async () => {
    renderDrawer([chatMock([{ role: 'user', content: 'Any events booked?' }], { reply: 'Two in October.' })]);

    fireEvent.change(input(), { target: { value: 'Any events booked?' } });
    fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true });
    expect(input()).toHaveValue('Any events booked?');
    expect(screen.queryByText('Thinking…')).toBeNull();

    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(await screen.findByText('Two in October.')).toBeInTheDocument();
    expect(input()).toHaveValue('');
  });

  it('ignores a blank question', () => {
    renderDrawer([]);

    fireEvent.change(input(), { target: { value: '   ' } });
    expect(sendButton()).toBeDisabled();
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(input()).toHaveValue('   ');
    expect(screen.getAllByTestId('crm-ask-ai-suggestion')).toHaveLength(3);
  });

  it('holds a new question back while the assistant is still answering', async () => {
    renderDrawer([chatMock([{ role: 'user', content: 'Summarise this lead' }], { reply: 'A banquet venue.', delay: 30 })]);
    fireEvent.click(screen.getByRole('button', { name: 'Summarise this lead' }));
    await screen.findByText('Thinking…');

    fireEvent.change(input(), { target: { value: 'Who owns it?' } });
    expect(sendButton()).toBeDisabled();
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(input()).toHaveValue('Who owns it?');
    expect(await screen.findByText('A banquet venue.')).toBeInTheDocument();
    expect(screen.queryByText('Who owns it?', { selector: 'p' })).toBeNull();
  });

  it('shows an empty answer when the assistant returns nothing', async () => {
    renderDrawer([chatMock([{ role: 'user', content: 'Draft a follow-up email' }], { reply: null })]);

    fireEvent.click(screen.getByRole('button', { name: 'Draft a follow-up email' }));

    expect(await screen.findByTestId('ai-reply')).toHaveTextContent('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports a failed request and keeps the question on screen', async () => {
    renderDrawer([chatMock([{ role: 'user', content: 'Any upcoming reminders?' }], { error: new Error('AI assistant unavailable') })]);

    fireEvent.click(screen.getByRole('button', { name: 'Any upcoming reminders?' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('AI assistant unavailable');
    expect(screen.getByText('Any upcoming reminders?')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-reply')).toBeNull();
  });
});
