/**
 * The docked panel itself: its own header, its errors, and its middle —
 * ChatBody and PanelHeader are stubbed here so this file is only about the
 * error banner ChatSidebar itself owns.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/staff-chat/ChatBody', () => ({ default: () => <div data-testid="chat-body" /> }));
vi.mock('../src/staff-chat/PanelHeader', () => ({ default: () => <div data-testid="panel-header" /> }));

import ChatSidebar from '../src/staff-chat/ChatSidebar';
import type { ChatFormats, ChatSettings } from '../src/staff-chat/useChatSettings';

const SETTINGS: ChatSettings = {
  density: 'COMFORTABLE',
  bubbleColor: 'primary',
  fontSize: 14,
  timeZone: '',
  enterToSend: true,
};
const FORMATS: ChatFormats = { time: 'h:mm a', full: 'PPpp', day: 'EEE' } as unknown as ChatFormats;

const baseProps = (setError = vi.fn()) => ({
  data: {
    error: null as { message: string; detail: string } | null,
    setError,
    presence: { mine: 'ONLINE' as const, choose: vi.fn() },
  } as never,
  meId: 'u-me',
  peer: null,
  onOpenPeer: vi.fn(),
  search: '',
  onSearch: vi.fn(),
  role: '',
  onRole: vi.fn(),
  settings: SETTINGS,
  onSettingChange: vi.fn(),
  formats: FORMATS,
  spacing: 1,
  replyTo: null,
  onReplyTo: vi.fn(),
  onCall: vi.fn(),
  onPlayRecording: vi.fn(),
  busy: false,
  onClose: vi.fn(),
  settingsOpen: false,
  onOpenSettings: vi.fn(),
  onCloseSettings: vi.fn(),
  canSeeEditHistory: false,
});

describe('ChatSidebar', () => {
  it('shows no error banner at all with nothing wrong', () => {
    const { container } = render(<ChatSidebar {...baseProps()} />);
    expect(container.querySelector('.MuiAlert-root')).toBeNull();
  });

  it("shows the panel's own failure, and dismisses it back to null", () => {
    const setError = vi.fn();
    const props = baseProps(setError);
    props.data.error = { message: 'Could not clear the conversation.', detail: '' };
    const { container } = render(<ChatSidebar {...props} />);

    expect(container.textContent).toContain('Could not clear the conversation.');

    fireEvent.click(container.querySelector('[aria-label="Close"]') as HTMLElement);

    expect(setError).toHaveBeenCalledWith(null);
  });
});
