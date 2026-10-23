import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VenueChatThreadList, type VenueChatThreadListRow } from '../src/venue-chat/VenueChatThreadList';

const labels = {
  empty: 'No chats yet',
  photo: 'Photo',
  noMessagesYet: 'No messages yet',
  unread: (count: number) => `${count} unread`,
};
const formatWhen = (iso: string) => `at ${iso.slice(11, 16)}`;

const row = (over: Partial<VenueChatThreadListRow> = {}): VenueChatThreadListRow => ({
  pod_id: 'p1',
  pod_title: 'Board Game Night',
  venue_name: 'The Loft',
  host_name: 'Asha',
  host_photo: null,
  last_message: 'See you at 7',
  last_message_is_photo: false,
  last_message_at: '2026-10-23T18:30:00.000Z',
  unread_count: 0,
  ...over,
});

describe('VenueChatThreadList', () => {
  it('says there are no chats when the list is empty', () => {
    render(<VenueChatThreadList rows={[]} onOpen={vi.fn()} labels={labels} formatWhen={formatWhen} />);
    expect(screen.getByText('No chats yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the pod, host, newest line and its time, and opens the thread on click', () => {
    const onOpen = vi.fn();
    render(<VenueChatThreadList rows={[row()]} onOpen={onOpen} labels={labels} formatWhen={formatWhen} />);
    expect(screen.getByText('Board Game Night')).toBeInTheDocument();
    expect(screen.getByText('Asha · See you at 7')).toBeInTheDocument();
    expect(screen.getByText('at 18:30')).toBeInTheDocument();
    // One venue only: its name is not repeated on every row.
    expect(screen.queryByText(/The Loft/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Board Game Night/ }));
    expect(onOpen).toHaveBeenCalledWith('p1');
  });

  it('marks unread threads with their count, and reads a photo as the caller’s word', () => {
    render(
      <VenueChatThreadList
        rows={[row({ unread_count: 3, last_message: '', last_message_is_photo: true })]}
        onOpen={vi.fn()}
        labels={labels}
        formatWhen={formatWhen}
      />
    );
    expect(screen.getByText('3 unread')).toBeInTheDocument();
    expect(screen.getByText('Asha · Photo')).toBeInTheDocument();
  });

  it('names the venue across venues, and says nobody has written yet on an untouched upcoming pod', () => {
    render(
      <VenueChatThreadList
        rows={[row({ host_photo: 'https://img.test/a.jpg', last_message: null, last_message_at: null })]}
        onOpen={vi.fn()}
        labels={labels}
        formatWhen={formatWhen}
        showVenue
      />
    );
    expect(screen.getByText('Board Game Night · The Loft')).toBeInTheDocument();
    expect(screen.getByText('Asha · No messages yet')).toBeInTheDocument();
    expect(screen.queryByText(/^at /)).not.toBeInTheDocument();
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });
});
