/**
 * A call, in the thread where it happened: whether it connected, how long it
 * ran, and whether there is a recording to play or download.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CallRow from '../src/staff-chat/CallRow';
import type { StaffCall } from '../src/staff-chat/queries';
import type { ChatFormats } from '../src/staff-chat/useChatSettings';

const FORMATS: ChatFormats = {
  time: { format: () => 'time' },
  full: { format: (value) => `full:${value.toISOString()}` },
  day: { format: () => 'day' },
};

const CALL: StaffCall = {
  id: 'c-1',
  from_user_id: 'u-1',
  to_user_id: 'u-2',
  kind: 'AUDIO',
  outcome: 'ANSWERED',
  duration_seconds: 65,
};

describe('CallRow', () => {
  it('shows the video icon for an answered video call', () => {
    const { container } = render(
      <CallRow call={{ ...CALL, kind: 'VIDEO' }} meId="u-1" formats={FORMATS} onPlay={vi.fn()} />,
    );
    expect(container.querySelector('svg[data-testid="VideocamIcon"]')).not.toBeNull();
  });

  it('shows the plain call icon for an answered audio call', () => {
    const { container } = render(<CallRow call={CALL} meId="u-1" formats={FORMATS} onPlay={vi.fn()} />);
    expect(container.querySelector('svg[data-testid="CallIcon"]')).not.toBeNull();
  });

  it('shows no time at all for a call with no timestamp yet', () => {
    const { container } = render(
      <CallRow call={{ ...CALL, started_at: undefined }} meId="u-1" formats={FORMATS} onPlay={vi.fn()} />,
    );
    expect(container.textContent).not.toContain('full:');
  });

  it('shows the exact time for a call that carries one', () => {
    const call = { ...CALL, started_at: '2026-08-28T10:00:00.000Z' };
    const { container } = render(<CallRow call={call} meId="u-1" formats={FORMATS} onPlay={vi.fn()} />);
    expect(container.textContent).toContain('full:2026-08-28T10:00:00.000Z');
  });

  it('plays the recording from its own chip', () => {
    const onPlay = vi.fn();
    const call = { ...CALL, recording_url: 'https://ik.duncit.com/call.mp4' };
    const { getByLabelText } = render(<CallRow call={call} meId="u-1" formats={FORMATS} onPlay={onPlay} />);

    fireEvent.click(getByLabelText('Play the recording'));

    expect(onPlay).toHaveBeenCalledWith('https://ik.duncit.com/call.mp4');
  });

  it('offers neither a play chip nor a download with no recording at all', () => {
    const { container } = render(<CallRow call={CALL} meId="u-1" formats={FORMATS} onPlay={vi.fn()} />);
    expect(container.querySelector('.MuiChip-root')).toBeNull();
  });
});
