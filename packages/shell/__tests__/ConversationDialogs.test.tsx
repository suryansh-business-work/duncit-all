/**
 * Everything a conversation opens over itself: edit history, the location
 * picker and the clear-conversation confirm — grouped here only because none
 * of it belongs to the thread's own layout.
 */
import { MockedProvider } from '@apollo/client/testing';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConversationDialogs from '../src/staff-chat/ConversationDialogs';
import type { StaffMessage } from '../src/staff-chat/queries';
import type { ChatFormats } from '../src/staff-chat/useChatSettings';

const FORMATS: ChatFormats = { time: 'h:mm a', full: 'PPpp', day: 'EEE' } as unknown as ChatFormats;

const baseProps = () => ({
  historyFor: null as StaffMessage | null,
  onCloseHistory: vi.fn(),
  locationOpen: false,
  onCloseLocation: vi.fn(),
  formats: FORMATS,
  onSend: vi.fn(),
  confirmClear: false,
  peerName: 'Vikram N',
  onCancelClear: vi.fn(),
  onConfirmClear: vi.fn(),
});

const mount = (props: Partial<ReturnType<typeof baseProps>> = {}) =>
  render(
    <MockedProvider mocks={[]}>
      <ConversationDialogs {...baseProps()} {...props} />
    </MockedProvider>,
  );

describe('ConversationDialogs', () => {
  it('opens no edit history dialog at all with nothing to show history for', () => {
    mount();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the edit history dialog once a message is passed in', () => {
    const message = { id: 'm-1', text: 'hello' } as StaffMessage;
    mount({ historyFor: message });

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
