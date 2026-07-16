import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LiveChatPage from '../../src/pages/live-chat/LiveChatPage';
import {
  SUPPORT_CHAT_SESSIONS,
  type SupportChatSession,
} from '../../src/graphql/supportChat';
import { renderWithProviders, publicAppSettingsMock } from './testkit';

vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: () => ({ current: { emit: vi.fn() } }),
}));

const session = (id: string, name: string, over: Partial<SupportChatSession> = {}): SupportChatSession => ({
  id,
  ticket_no: `CH-${id}`,
  status: 'OPEN',
  last_message_at: new Date().toISOString(),
  last_message_preview: 'hi',
  unread_for_agent: 0,
  agent_id: 'a1',
  user_last_read_at: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  resolved_at: null,
  user: { id: `u-${id}`, name, phone: null, avatar_url: null },
  ...over,
});

// A single mock that answers every SUPPORT_CHAT_SESSIONS request regardless of
// the page/search/page_size variables the inbox mutates.
const anySessionsMock = (items: SupportChatSession[], total: number) => ({
  request: { query: SUPPORT_CHAT_SESSIONS },
  variableMatcher: () => true,
  result: { data: { supportChatSessions: { items, total, page: 1, page_size: 25 } } },
  maxUsageCount: 50,
});

describe('SessionInbox interactions (via LiveChatPage)', () => {
  it('drives search, pagination, page-size and the create-user launcher', async () => {
    // One session has an empty name so the avatar falls back to "?" (SessionList).
    const items = [session('a', 'Riya'), session('b', '')];
    renderWithProviders(<LiveChatPage />, {
      mocks: [publicAppSettingsMock(), anySessionsMock(items, 60)],
    });

    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    // Empty-name session renders the "?" avatar fallback.
    expect(screen.getByText('?')).toBeInTheDocument();

    // Search box drives onSearchChange (debounced into a new query).
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Riya' } });
    await waitFor(() => expect(screen.getByLabelText('Search')).toHaveValue('Riya'));

    // Next page → onPageChange.
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled(),
    );

    // Rows-per-page → onPageSizeChange (resets to page 0).
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: '50' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled(),
    );

    // Create-user launcher opens the dialog.
    fireEvent.click(screen.getByRole('button', { name: /create user account/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/create user account/i)).toBeInTheDocument();
  });
});
