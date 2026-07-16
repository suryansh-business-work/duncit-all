import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import LiveChatPage from '../../src/pages/live-chat/LiveChatPage';
import { renderWithProviders } from '../testkit';
import { publicAppSettingsMock } from '../mocks/common.mock';
import { anySessionsMock, session } from '../mocks/supportChat.mock';

vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: () => ({ current: { emit: vi.fn() } }),
}));

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
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/create user account/i)).toBeInTheDocument();

    // Closing it runs the parent's onClose handler.
    fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
