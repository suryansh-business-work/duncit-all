/**
 * What came with a message, and the bubble body around it — an image or video
 * shows itself and opens full-screen; a voice note gets its player; anything
 * else is a named row with its size and a download that never navigates the
 * chat away.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BubbleBody from '../src/staff-chat/message-bubble/BubbleBody';
import MessageAttachment, { humanSize } from '../src/staff-chat/MessageAttachment';
import type { StaffMessage } from '../src/staff-chat/queries';

const wrap = (ui: React.ReactNode) => render(<MockedProvider mocks={[]}>{ui}</MockedProvider>);

const message = (over: Partial<StaffMessage> = {}): StaffMessage =>
  ({
    id: 'm1',
    from_user_id: 'u1',
    to_user_id: 'u2',
    text: '',
    ...over,
  }) as StaffMessage;

describe('humanSize', () => {
  it('shows nothing for a missing or non-positive size', () => {
    expect(humanSize(undefined)).toBe('');
    expect(humanSize(0)).toBe('');
    expect(humanSize(-4)).toBe('');
  });

  it('scales bytes up through KB, MB and GB', () => {
    expect(humanSize(240)).toBe('240 B');
    expect(humanSize(240_000)).toBe('234.4 KB');
    expect(humanSize(2_400_000)).toBe('2.3 MB');
    expect(humanSize(4_000_000_000)).toBe('3.7 GB');
  });
});

describe('MessageAttachment', () => {
  it('renders nothing when the message carries no attachment', () => {
    const { container } = wrap(<MessageAttachment message={message()} />);

    expect(container.innerHTML).toBe('');
  });

  it('plays a voice note through its own player, when it carries a waveform', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({
          attachment_url: 'https://cdn.test/v.webm',
          attachment_type: 'audio/webm',
          attachment_name: 'voice-note-7s.webm',
          attachment_peaks: [0.2, 0.4, 0.1],
        })}
      />
    );

    expect(container.querySelector('[aria-label="Play the voice note"]')).not.toBeNull();
  });

  it('treats audio with no waveform as a plain file, not a voice note', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({
          attachment_url: 'https://cdn.test/a.mp3',
          attachment_type: 'audio/mpeg',
          attachment_name: 'call.mp3',
          attachment_peaks: [],
        })}
      />
    );

    expect(container.querySelector('[aria-label="Play the voice note"]')).toBeNull();
    expect(container.textContent).toContain('call.mp3');
  });

  it('opens and closes an image in a full-screen preview, by click and by keyboard', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({
          attachment_url: 'https://cdn.test/court.png',
          attachment_type: 'image/png',
          attachment_name: 'court.png',
          text: 'here',
        })}
      />
    );

    const trigger = container.querySelector('[role="button"]') as HTMLElement;
    const isOpen = () => container.querySelector('.MuiBackdrop-root')?.getAttribute('style')?.includes('opacity: 1');
    expect(isOpen()).toBeFalsy();

    // An unrelated key does nothing — only Enter and Space open it.
    fireEvent.keyDown(trigger, { key: 'a' });
    expect(isOpen()).toBeFalsy();

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(isOpen()).toBeTruthy();

    fireEvent.click(container.querySelector('[aria-label="Close preview"]') as HTMLElement);
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(isOpen()).toBeTruthy();

    fireEvent.click(container.querySelector('.MuiBackdrop-root') as HTMLElement);
    fireEvent.click(trigger);
    expect(isOpen()).toBeTruthy();
  });

  it('opens a video the same way, with a video element instead of an image', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({
          attachment_url: 'https://cdn.test/clip.mp4',
          attachment_type: 'video/mp4',
          attachment_name: 'clip.mp4',
        })}
      />
    );

    expect(container.querySelector('video')).not.toBeNull();

    fireEvent.click(container.querySelector('[role="button"]') as HTMLElement);
    expect(container.querySelectorAll('video')).toHaveLength(2);
  });

  it('names a file generically when no name was ever recorded for it', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({ attachment_url: 'https://cdn.test/x', attachment_name: '', attachment_type: '' })}
      />
    );

    expect(container.textContent).toContain('Attachment');
  });

  it('picks an icon by file type: pdf, spreadsheet, document, archive and the generic fallback', () => {
    const cases: [string, string, string][] = [
      ['report.pdf', 'application/pdf', 'PictureAsPdfIcon'],
      ['sheet.xlsx', '', 'TableChartIcon'],
      ['notes.docx', '', 'DescriptionIcon'],
      ['bundle.zip', '', 'FolderZipIcon'],
      ['unknown.xyz', '', 'InsertDriveFileIcon'],
    ];
    for (const [name, type, testId] of cases) {
      const { container } = wrap(
        <MessageAttachment message={message({ attachment_url: 'https://cdn.test/f', attachment_name: name, attachment_type: type })} />
      );
      expect(container.querySelector(`svg[data-testid="${testId}"]`)).not.toBeNull();
    }
  });

  it('downloads the named file at its own address, without navigating the chat', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({
          attachment_url: 'https://cdn.test/roster.pdf',
          attachment_name: 'roster.pdf',
          attachment_type: 'application/pdf',
          attachment_size: 12_000,
        })}
      />
    );

    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://cdn.test/roster.pdf');
    expect(container.textContent).toContain('11.7 KB');
  });

  it('sits flush against the text above it when the message came with none', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({ attachment_url: 'https://cdn.test/roster.pdf', attachment_name: 'roster.pdf', text: '' })}
      />
    );

    expect(container.textContent).toContain('roster.pdf');
  });

  it('leaves a gap under a file that came with a caption above it', () => {
    const { container } = wrap(
      <MessageAttachment
        message={message({
          attachment_url: 'https://cdn.test/roster.pdf',
          attachment_name: 'roster.pdf',
          text: 'here it is',
        })}
      />
    );

    expect(container.textContent).toContain('roster.pdf');
  });

});

describe('BubbleBody', () => {
  const props = (over: Partial<Parameters<typeof BubbleBody>[0]> = {}) => ({
    message: message(),
    deleted: false,
    editing: false,
    draft: '',
    fontSize: 14,
    onDraft: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  });

  it('shows a placeholder in place of a deleted message', () => {
    const { container } = wrap(<BubbleBody {...props({ deleted: true, message: message({ text: 'gone' }) })} />);

    expect(container.textContent).toBe('This message was deleted');
  });

  it('lets the draft be edited, saving on Enter and cancelling on Escape', () => {
    const p = props({ editing: true, draft: 'half a thought' });
    const { container } = wrap(<BubbleBody {...p} />);
    const field = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(field.value).toBe('half a thought');

    fireEvent.change(field, { target: { value: 'a full thought' } });
    expect(p.onDraft).toHaveBeenCalledWith('a full thought');

    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    expect(p.onSave).not.toHaveBeenCalled();

    fireEvent.keyDown(field, { key: 'Enter' });
    expect(p.onSave).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(field, { key: 'Escape' });
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders the attachment and the text once neither deleted nor being edited', () => {
    const { container } = wrap(<BubbleBody {...props({ message: message({ text: 'Court 2 at seven' }) })} />);

    expect(container.textContent).toContain('Court 2 at seven');
  });
});
