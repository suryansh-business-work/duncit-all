/**
 * One row of the thread, whichever kind it is — a call and a message are
 * different things that share a position in time, and either can be the
 * first entry of a new day.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ThreadEntry from '../src/staff-chat/ThreadEntry';
import type { StaffCall } from '../src/staff-chat/queries';
import type { ChatFormats, ChatSettings } from '../src/staff-chat/useChatSettings';

const SETTINGS: ChatSettings = {
  density: 'COMFORTABLE',
  bubbleColor: 'primary',
  fontSize: 14,
  timeZone: '',
  enterToSend: true,
};
const FORMATS: ChatFormats = {
  time: { format: () => 'time' },
  full: { format: () => 'full' },
  day: { format: () => 'day' },
};

const CALL: StaffCall = {
  id: 'c-1',
  from_user_id: 'u-1',
  to_user_id: 'u-2',
  kind: 'AUDIO',
  outcome: 'ANSWERED',
  duration_seconds: 60,
};

const handlers = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onReact: vi.fn(),
  onReply: vi.fn(),
  onForward: vi.fn(),
  onPin: vi.fn(),
  onPlayRecording: vi.fn(),
  onNode: vi.fn(),
};

const baseProps = (dayLabel: string) => ({
  entry: { kind: 'CALL' as const, id: 'call-c-1', at: 0, call: CALL },
  meId: 'u-1',
  settings: SETTINGS,
  formats: FORMATS,
  nameOf: (id: string) => id,
  dayLabel,
  firstUnread: false,
  highlighted: false,
  selected: false,
  repliedTo: null,
  ...handlers,
});

describe('ThreadEntry — a call row', () => {
  it('shows no day chip when it is not the first entry of a new day', () => {
    const { container } = render(<ThreadEntry {...baseProps('')} />);
    expect(container.textContent).not.toContain('day');
  });

  it("shows the day chip above a call that opens a new day's thread", () => {
    const { container } = render(<ThreadEntry {...baseProps('Today')} />);
    expect(container.textContent).toContain('Today');
  });
});
