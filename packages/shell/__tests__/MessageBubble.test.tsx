/**
 * One line of the conversation — pure wiring between the reader's actions and
 * the parent's handlers. Badges, body and footer are stubbed here so this file
 * can prove every prop reaches the right call without depending on their own
 * rendering, which is covered where each of them is tested directly.
 */
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MessageBubble from '../src/staff-chat/message-bubble';
import type { StaffMessage } from '../src/staff-chat/queries';
import { DEFAULT_CHAT_SETTINGS, type ChatFormats } from '../src/staff-chat/useChatSettings';

let bodyProps: Record<string, any> | null = null;
let footerProps: Record<string, any> | null = null;

vi.mock('../src/staff-chat/message-bubble/BubbleBadges', () => ({ default: () => <div /> }));
vi.mock('../src/staff-chat/message-bubble/BubbleBody', () => ({
  default: (props: Record<string, any>) => {
    bodyProps = props;
    return <div />;
  },
}));
vi.mock('../src/staff-chat/message-bubble/BubbleFooter', () => ({
  default: (props: Record<string, any>) => {
    footerProps = props;
    return <div />;
  },
}));
vi.mock('../src/staff-chat/MessageReactions', () => ({ default: () => <div /> }));

const message = (over: Partial<StaffMessage> = {}): StaffMessage =>
  ({
    id: 'm1',
    from_user_id: 'u1',
    to_user_id: 'u2',
    text: 'See you at seven',
    ...over,
  }) as StaffMessage;

const formats: ChatFormats = {
  time: { format: (d: Date) => d.toISOString() } as never,
  full: { format: (d: Date) => d.toISOString() } as never,
  day: { format: (d: Date) => d.toISOString() } as never,
};

const bubble = (over: Partial<Parameters<typeof MessageBubble>[0]> = {}) => {
  const spies = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReact: vi.fn(),
    onReply: vi.fn(),
    onForward: vi.fn(),
    onPin: vi.fn(),
  };
  return render(
    <MessageBubble
      message={message()}
      mine
      meId="u2"
      settings={DEFAULT_CHAT_SETTINGS}
      formats={formats}
      nameOf={() => 'Vikram N'}
      {...spies}
      {...over}
    />
  );
};

describe('MessageBubble', () => {
  it('saves an edit that actually changed the text, and stops editing either way', () => {
    const onEdit = vi.fn();
    bubble({ onEdit });

    act(() => {
      footerProps?.onEdit();
    });
    expect(bodyProps?.editing).toBe(true);

    act(() => {
      bodyProps?.onDraft('A new plan for seven');
    });
    act(() => {
      bodyProps?.onSave();
    });

    expect(onEdit).toHaveBeenCalledWith('m1', 'A new plan for seven');
  });

  it('does not call onEdit when the edit is saved unchanged or blank', () => {
    const onEdit = vi.fn();
    bubble({ onEdit, message: message({ text: 'Unchanged' }) });

    footerProps?.onEdit();
    bodyProps?.onSave();
    expect(onEdit).not.toHaveBeenCalled();

    footerProps?.onEdit();
    bodyProps?.onDraft('   ');
    bodyProps?.onSave();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('cancels an edit through the body, without saving anything', () => {
    bubble();

    act(() => {
      footerProps?.onEdit();
    });
    expect(bodyProps?.editing).toBe(true);

    act(() => {
      bodyProps?.onCancel();
    });
    expect(bodyProps?.editing).toBe(false);
  });

  it('wires reply, forward and pin straight to the message', () => {
    const spies = { onReply: vi.fn(), onForward: vi.fn(), onPin: vi.fn() };
    bubble(spies);

    footerProps?.onReply();
    footerProps?.onForward();
    footerProps?.onPin();

    expect(spies.onReply).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    expect(spies.onForward).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    expect(spies.onPin).toHaveBeenCalledWith('m1');
  });

  it('deletes for me or for everyone, by the flag the menu passed along', () => {
    const onDelete = vi.fn();
    bubble({ onDelete });

    footerProps?.onDelete(true);
    footerProps?.onDelete(false);

    expect(onDelete).toHaveBeenCalledWith('m1', true);
    expect(onDelete).toHaveBeenCalledWith('m1', false);
  });

  it('copies the text to the clipboard, and swallows a browser that refuses', async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error('no permission')).mockResolvedValueOnce(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
    bubble();

    await act(async () => {
      footerProps?.onCopy();
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith('See you at seven');

    await act(async () => {
      footerProps?.onCopy();
      await Promise.resolve();
    });
  });

  it('does nothing when copying without a clipboard API at all', () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: undefined });
    bubble();

    expect(() => footerProps?.onCopy()).not.toThrow();
  });

  it('starts bulk selection only when the caller offered it', () => {
    const onStartSelect = vi.fn();
    bubble({ onStartSelect });

    footerProps?.onStartSelect();

    expect(onStartSelect).toHaveBeenCalledWith('m1');
  });

  it('leaves edit history and retry undefined when the caller did not offer them', () => {
    bubble();

    expect(footerProps?.onEditHistory).toBeUndefined();
    expect(footerProps?.onRetry).toBeUndefined();
  });

  it('wires edit history and retry through to the message, when offered', () => {
    const onEditHistory = vi.fn();
    const onRetry = vi.fn();
    bubble({ onEditHistory, onRetry });

    footerProps?.onEditHistory();
    footerProps?.onRetry();

    expect(onEditHistory).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });
});
