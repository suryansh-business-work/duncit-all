/**
 * One search hit: a real, disable-able button so a result older than the page
 * currently loaded looks (and behaves) unclickable instead of doing nothing.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SearchResultRow from '../src/staff-chat/SearchResultRow';
import type { StaffMessage } from '../src/staff-chat/queries';
import type { ChatFormats } from '../src/staff-chat/useChatSettings';

const FORMATS: ChatFormats = {
  time: { format: () => 'time' },
  full: { format: (value) => `full:${value.toISOString()}` },
  day: { format: () => 'day' },
};

const MESSAGE: StaffMessage = {
  id: 'm-1',
  from_user_id: 'u-1',
  to_user_id: 'u-2',
  text: 'Hello there',
  last_from_me: false,
} as unknown as StaffMessage;

describe('SearchResultRow', () => {
  it('jumps to the message when a loaded hit is pressed', () => {
    const onJump = vi.fn();
    const { getByRole } = render(
      <SearchResultRow message={MESSAGE} who="Vikram N" formats={FORMATS} loaded onJump={onJump} />,
    );

    fireEvent.click(getByRole('button'));

    expect(onJump).toHaveBeenCalledWith('m-1');
  });

  it('disables the row and explains why for a hit outside the loaded page', () => {
    const { getByRole } = render(
      <SearchResultRow message={MESSAGE} who="Vikram N" formats={FORMATS} loaded={false} onJump={vi.fn()} />,
    );

    expect(getByRole('button')).toBeDisabled();
  });

  it('shows the message time when the message carries one', () => {
    const message = { ...MESSAGE, created_at: '2026-08-28T10:00:00.000Z' } as StaffMessage;
    const { container } = render(
      <SearchResultRow message={message} who="Vikram N" formats={FORMATS} loaded onJump={vi.fn()} />,
    );

    expect(container.textContent).toContain('full:2026-08-28T10:00:00.000Z');
  });

  it('shows no time at all for a message with no timestamp yet', () => {
    const message = { ...MESSAGE, created_at: undefined } as StaffMessage;
    const { container } = render(
      <SearchResultRow message={message} who="Vikram N" formats={FORMATS} loaded onJump={vi.fn()} />,
    );

    expect(container.textContent).not.toContain('full:');
  });

  it("previews the attachment's name when the message itself has no text", () => {
    const message = { ...MESSAGE, text: '', attachment_name: 'photo.png', attachment_url: 'https://x/photo.png' } as StaffMessage;
    const { container } = render(
      <SearchResultRow message={message} who="Vikram N" formats={FORMATS} loaded onJump={vi.fn()} />,
    );

    expect(container.textContent).toContain('photo.png');
    expect(container.querySelector('svg[data-testid="AttachFileIcon"]')).not.toBeNull();
  });

  it('falls back to a generic attachment label with neither text nor a name', () => {
    const message = { ...MESSAGE, text: '', attachment_name: undefined } as StaffMessage;
    const { container } = render(
      <SearchResultRow message={message} who="Vikram N" formats={FORMATS} loaded onJump={vi.fn()} />,
    );

    expect(container.textContent).toContain('Attachment');
    expect(container.querySelector('svg[data-testid="AttachFileIcon"]')).toBeNull();
  });
});
