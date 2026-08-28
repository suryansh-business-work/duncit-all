/**
 * Conversations first, then the directory: search, the team filter, and
 * opening a peer from either the thread list or the rest of the directory.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CoworkerList from '../src/staff-chat/CoworkerList';
import type { Coworker, StaffThread } from '../src/staff-chat/queries';

const PEER: Coworker = { id: 'u-peer', name: 'Vikram N', email: '', photo: '', roles: ['CRM_MANAGER'] } as Coworker;
const OTHER: Coworker = { id: 'u-other', name: 'Asha Rao', email: '', photo: '', roles: ['TECH_MANAGER'] } as Coworker;

const baseProps = () => ({
  search: '',
  onSearch: vi.fn(),
  role: '',
  onRole: vi.fn(),
  threads: [] as StaffThread[],
  coworkers: [] as Coworker[],
  statusOf: () => 'OFFLINE' as const,
  onOpen: vi.fn(),
});

describe('CoworkerList', () => {
  it('reports what is typed into the search box', () => {
    const onSearch = vi.fn();
    const { getByPlaceholderText } = render(<CoworkerList {...baseProps()} onSearch={onSearch} />);

    fireEvent.change(getByPlaceholderText('Search coworkers'), { target: { value: 'Vikram' } });

    expect(onSearch).toHaveBeenCalledWith('Vikram');
  });

  it('reports a team chosen from the filter', () => {
    const onRole = vi.fn();
    const { getByRole, getAllByRole } = render(<CoworkerList {...baseProps()} onRole={onRole} />);

    fireEvent.mouseDown(getByRole('combobox', { name: 'Team' }));
    fireEvent.click(getAllByRole('option').find((option) => option.textContent === 'Tech') as HTMLElement);

    expect(onRole).toHaveBeenCalledWith('TECH_MANAGER');
  });

  it('opens a conversation already in the thread list', () => {
    const onOpen = vi.fn();
    const thread: StaffThread = { peer: PEER, last_text: 'hi', last_from_me: false, unread: 0 };
    const { getByText } = render(<CoworkerList {...baseProps()} threads={[thread]} onOpen={onOpen} />);

    fireEvent.click(getByText('Vikram N'));

    expect(onOpen).toHaveBeenCalledWith(PEER);
  });

  it('marks your own last message with the you-prefix', () => {
    const thread: StaffThread = { peer: PEER, last_text: 'On my way', last_from_me: true, unread: 0 };
    const { container } = render(<CoworkerList {...baseProps()} threads={[thread]} />);

    expect(container.textContent).toContain('You: On my way');
  });

  it('opens someone from the wider directory, beyond existing threads', () => {
    const onOpen = vi.fn();
    const { getByText } = render(<CoworkerList {...baseProps()} coworkers={[OTHER]} onOpen={onOpen} />);

    fireEvent.click(getByText('Asha Rao'));

    expect(onOpen).toHaveBeenCalledWith(OTHER);
  });
});
