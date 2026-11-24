import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { liveStore } from '../../src/components/ChatStream';
import { INTEL_COUNTS, INTEL_SEND, INTEL_THREAD } from '../../src/graphql/chat';
import ChatPage from '../../src/pages/chat';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('../../src/pages/chat/composer/MicButton', () => ({ default: () => null }));

const now = new Date().toISOString();
const conversation = { __typename: 'IntelConversation', id: 'c1', title: 'Pod revenue', pinned: false, archived: false, model: 'gpt-4o', environment: 'STAGING', sources: [], message_count: 2, last_message_at: now, created_at: now, updated_at: now };
const msg = (id: string, role: string, content: string, status = 'COMPLETE') => ({ __typename: 'IntelMessage', id, conversation_id: 'c1', role, content, status, model: 'gpt-4o', error_code: null, error_message: null, edited: false, approval_ids: [], attachments: [], created_at: now, citations: [], tool_calls: [] });
const counts = { request: { query: INTEL_COUNTS }, result: { data: { intelConversationCounts: { __typename: 'IntelConversationCounts', recent: 1, pinned: 0, archived: 0, all: 1 } } }, maxUsageCount: 5 };
const routes = (
  <>
    <Route path="/" element={<ChatPage />} />
    <Route path="/c/:conversationId" element={<ChatPage />} />
  </>
);

beforeEach(() => {
  boot.value = bootstrap();
  liveStore.reset();
});

describe('ChatPage', () => {
  it('starts on the start screen and sends the first question with the composer settings, then opens the new conversation', async () => {
    const send = {
      request: { query: INTEL_SEND, variables: { input: { model: 'gpt-4o', environment: 'STAGING', sources: [], message: 'How did pods do?', conversation_id: null } } },
      result: { data: { intelSend: { __typename: 'IntelSendResult', conversation_id: 'c1', user_message_id: 'u1', assistant_message_id: 'a1' } } },
    };
    const thread = { request: { query: INTEL_THREAD, variables: { id: 'c1' } }, result: { data: { intelConversation: conversation, intelMessages: [msg('u1', 'USER', 'How did pods do?'), msg('a1', 'ASSISTANT', '', 'STREAMING')] } }, maxUsageCount: 5 };
    renderWithProviders(<></>, { mocks: [send, counts, thread], routes });
    expect(screen.getByText('intel.start.heading')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'intel.composer.placeholder' }), { target: { value: 'How did pods do?' } });
    fireEvent.click(screen.getByRole('button', { name: 'intel.composer.send' }));
    expect(await screen.findByRole('heading', { name: 'Pod revenue' }, { timeout: 15_000 })).toBeInTheDocument();
    act(() => liveStore.delta('a1', 'Pods grew 12%'));
    expect(await screen.findByText('Pods grew 12%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.composer.stop' })).toBeInTheDocument();
  });

  it('opens an existing conversation with its messages and lets the last answer be regenerated', async () => {
    const thread = { request: { query: INTEL_THREAD, variables: { id: 'c1' } }, result: { data: { intelConversation: conversation, intelMessages: [msg('u1', 'USER', 'Q'), msg('a1', 'ASSISTANT', 'An answer')] } }, maxUsageCount: 5 };
    const regenerate = { request: { query: INTEL_SEND, variables: { input: { model: 'gpt-4o', environment: 'STAGING', sources: [], regenerate: true, conversation_id: 'c1' } } }, result: { data: { intelSend: { __typename: 'IntelSendResult', conversation_id: 'c1', user_message_id: 'u1', assistant_message_id: 'a2' } } } };
    renderWithProviders(<></>, { mocks: [thread, regenerate, counts], initialEntries: ['/c/c1'], routes });
    expect(await screen.findByText('An answer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.chat.regenerate' }));
    await waitFor(() => expect(screen.getByText('An answer')).toBeInTheDocument());
  });

  it('shows a retry when the conversation cannot be loaded', async () => {
    const failing = { request: { query: INTEL_THREAD, variables: { id: 'gone' } }, error: new Error('Conversation not found') };
    renderWithProviders(<></>, { mocks: [failing], initialEntries: ['/c/gone'], routes });
    expect(await screen.findByText('intel.chat.loadFailed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.common.retry' })).toBeInTheDocument();
  });
});
