/**
 * Who you are talking to, and what you can start from the header — the
 * presence line answers "is it worth waiting for a reply", which is a time,
 * not a bare online/offline word.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConversationHeader from '../src/staff-chat/ConversationHeader';
import type { Coworker } from '../src/staff-chat/queries';
import type { PresenceStatus } from '../src/staff-chat/usePresence';

const PEER: Coworker = { id: 'u-peer', name: 'Vikram N', email: '', photo: '', roles: [] } as Coworker;

const header = (status: PresenceStatus, lastSeen: string | null, over: Record<string, unknown> = {}) => {
  const spies = {
    onBack: vi.fn(),
    onToggleSearch: vi.fn(),
    onCall: vi.fn(),
    onExport: vi.fn(),
    onClear: vi.fn(),
    onSettings: vi.fn(),
  };
  return {
    spies,
    ...render(
      <ConversationHeader
        peer={PEER}
        status={status}
        lastSeen={lastSeen}
        searchOpen={false}
        {...spies}
        {...over}
      />
    ),
  };
};

describe('ConversationHeader', () => {
  it('says online, plainly, for someone at their desk', () => {
    const { container } = header('ONLINE', null);

    expect(container.textContent).toContain('Online');
  });

  it('says away for someone the idle timer moved, without a last-seen time', () => {
    const { container } = header('AWAY', '2026-08-28T10:00:00.000Z');

    expect(container.textContent).toMatch(/away/i);
  });

  it('says busy for someone who set that themselves', () => {
    const { container } = header('BUSY', null);

    expect(container.textContent).toMatch(/busy/i);
  });

  it('says plainly offline when there is no last-seen time to give a shape to', () => {
    const { container } = header('OFFLINE', null);

    expect(container.textContent).toMatch(/offline/i);
  });

  it('gives a relative time for someone offline with a last-seen instant', () => {
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { container } = header('OFFLINE', anHourAgo);

    expect(container.textContent).toMatch(/hour/i);
  });

  it('starts an audio call and a video call from their own buttons', () => {
    const { container, spies } = header('ONLINE', null);

    fireEvent.click(container.querySelector('[aria-label="Start audio call"]') as HTMLElement);
    fireEvent.click(container.querySelector('[aria-label="Start video call"]') as HTMLElement);

    expect(spies.onCall).toHaveBeenCalledWith('AUDIO');
    expect(spies.onCall).toHaveBeenCalledWith('VIDEO');
  });
});
