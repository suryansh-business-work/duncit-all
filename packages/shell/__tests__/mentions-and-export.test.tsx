/**
 * Mentions in the composer, the exported transcript, message selection, and
 * the floating window that hosts a call.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

import {
  applyEmoji,
  applyMention,
  emojiQuery,
  mentionQuery,
  splitMentions,
} from '../src/staff-chat/mentions';
import { buildChatExport, downloadChatExport } from '../src/staff-chat/export-chat';
import { useMessageSelection } from '../src/staff-chat/useMessageSelection';
import type { Coworker, StaffCall, StaffMessage } from '../src/staff-chat/queries';
import FloatingWindow from '../src/floating-window';
import { useWindowDrag } from '../src/floating-window/useWindowDrag';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ------------------------------------------------------------- mentions ----

describe('mentionQuery', () => {
  it('reads the name fragment being typed under the caret', () => {
    expect(mentionQuery('Hey @as', 7)).toBe('as');
  });

  it('is null when the caret is not inside a mention', () => {
    expect(mentionQuery('Hey Asha, are you there?', 24)).toBeNull();
  });

  it('reads only up to the caret, not the whole message', () => {
    expect(mentionQuery('Hey @asha and @vikram', 9)).toBe('asha');
  });
});

describe('applyMention', () => {
  it('replaces the half-typed word with the full name and a trailing space', () => {
    expect(applyMention('Hey @as', 7, 'Asha Rao')).toEqual({
      text: 'Hey @Asha Rao ',
      caret: 14,
    });
  });

  // Mentioning somebody halfway through a message must not disturb what was
  // already written after it.
  it('leaves the text after the caret untouched', () => {
    expect(applyMention('Hey @as, see you then', 7, 'Asha Rao')).toEqual({
      text: 'Hey @Asha Rao , see you then'.replace(' ,', ' ,'),
      caret: 14,
    });
  });

  it('adds no double space when the text already continues with one', () => {
    expect(applyMention('Hey @as there', 7, 'Asha Rao')).toEqual({
      text: 'Hey @Asha Rao there',
      caret: 13,
    });
  });

  it('changes nothing when the caret is not inside a mention', () => {
    expect(applyMention('Hey Asha', 8, 'Asha Rao')).toEqual({ text: 'Hey Asha', caret: 8 });
  });
});

describe('splitMentions', () => {
  it('splits a run of text into plain and mention pieces, in order', () => {
    expect(splitMentions('Hey @asha, meet @vikram here')).toEqual([
      { text: 'Hey ', mention: false },
      { text: '@asha', mention: true },
      { text: ', meet ', mention: false },
      { text: '@vikram', mention: true },
      { text: ' here', mention: false },
    ]);
  });

  it('returns the whole string as one plain piece with no mentions', () => {
    expect(splitMentions('nothing to see here')).toEqual([
      { text: 'nothing to see here', mention: false },
    ]);
  });

  it('is empty for an empty message', () => {
    expect(splitMentions('')).toEqual([]);
  });

  it('reads a mention that starts the text', () => {
    expect(splitMentions('@asha, are you there?')).toEqual([
      { text: '@asha', mention: true },
      { text: ', are you there?', mention: false },
    ]);
  });
});

describe('emojiQuery', () => {
  it('reads the shortcode being typed', () => {
    expect(emojiQuery('Ready to ship :roc', 19)).toBe('roc');
  });

  // A bare `:` is punctuation far more often than the start of an emoji.
  it('is null with nothing typed after the colon', () => {
    expect(emojiQuery('Ready to ship:', 14)).toBeNull();
  });

  it('is null when the caret is not after a colon at all', () => {
    expect(emojiQuery('no colon here', 13)).toBeNull();
  });
});

describe('applyEmoji', () => {
  it('replaces the shortcode with the emoji', () => {
    expect(applyEmoji('Ready to ship :roc', 19, '🚀')).toEqual({
      text: 'Ready to ship 🚀',
      caret: 16,
    });
  });

  it('changes nothing when there is no shortcode under the caret', () => {
    expect(applyEmoji('Ready to ship', 13, '🚀')).toEqual({ text: 'Ready to ship', caret: 13 });
  });
});

// ---------------------------------------------------------- export-chat ----

describe('buildChatExport', () => {
  const me = { id: 'me', name: 'Asha Rao' };
  const peer: Coworker = {
    id: 'u1',
    name: 'Vikram S',
    email: 'vikram@duncit.com',
    photo: '',
    roles: ['FINANCE_MANAGER'],
  };

  const message = (over: Partial<StaffMessage> = {}): StaffMessage =>
    ({
      id: 'm1',
      from_user_id: 'me',
      to_user_id: 'u1',
      text: 'See you at the door',
      created_at: '2026-08-30T10:00:00.000Z',
      ...over,
    }) as StaffMessage;

  const call = (over: Partial<StaffCall> = {}): StaffCall => ({
    id: 'c1',
    from_user_id: 'me',
    to_user_id: 'u1',
    kind: 'AUDIO',
    outcome: 'ANSWERED',
    duration_seconds: 95,
    started_at: '2026-08-30T09:00:00.000Z',
    ...over,
  });

  it('names both people and counts what is in it', () => {
    const text = buildChatExport({ me, peer, messages: [message()], calls: [] });

    expect(text).toContain('Conversation between Asha Rao and Vikram S');
    expect(text).toContain('1 messages · 0 calls');
    expect(text).toContain('See you at the door');
  });

  // The record of a call belongs where it happened in the conversation.
  it('weaves calls in among the messages, in the order they happened', () => {
    const text = buildChatExport({
      me,
      peer,
      messages: [message({ created_at: '2026-08-30T09:30:00.000Z' })],
      calls: [call()],
    });
    const lines = text.split('\n').filter((line) => line.startsWith('['));

    expect(lines[0]).toContain('audio call Asha Rao → Vikram S');
    expect(lines[1]).toContain('See you at the door');
  });

  it('says how long an answered call ran', () => {
    const text = buildChatExport({ me, peer, messages: [], calls: [call({ duration_seconds: 125 })] });

    expect(text).toContain('answered, 2m 5s');
  });

  it('drops the minutes for a call under a minute long', () => {
    const text = buildChatExport({ me, peer, messages: [], calls: [call({ duration_seconds: 45 })] });

    expect(text).toContain('answered, 45s');
  });

  it('reads an unknown time rather than crashing on a call with no timestamp', () => {
    const text = buildChatExport({ me, peer, messages: [], calls: [call({ started_at: undefined })] });

    expect(text).toContain('[unknown time]');
  });

  it('names any other outcome without a duration', () => {
    const text = buildChatExport({ me, peer, messages: [], calls: [call({ outcome: 'MISSED' })] });

    expect(text).toContain('— missed');
  });

  it('marks a deleted message rather than printing what it said', () => {
    const text = buildChatExport({
      me,
      peer,
      messages: [message({ deleted_at: '2026-08-30T10:05:00.000Z', text: 'oops' })],
      calls: [],
    });

    expect(text).toContain('(message deleted)');
    expect(text).not.toContain('oops');
  });

  it('names the file on a message that carries an attachment', () => {
    const text = buildChatExport({
      me,
      peer,
      messages: [
        message({ text: '', attachment_url: 'https://cdn.duncit.com/roster.pdf', attachment_name: 'roster.pdf' }),
      ],
      calls: [],
    });

    expect(text).toContain('[file: roster.pdf — https://cdn.duncit.com/roster.pdf]');
  });

  it('names an attachment generically when it has no filename', () => {
    const text = buildChatExport({
      me,
      peer,
      messages: [message({ text: '', attachment_url: 'https://cdn.duncit.com/x', attachment_name: undefined })],
      calls: [],
    });

    expect(text).toContain('[file: attachment — https://cdn.duncit.com/x]');
  });

  it('marks an edited message', () => {
    const text = buildChatExport({
      me,
      peer,
      messages: [message({ edited_at: '2026-08-30T10:10:00.000Z' })],
      calls: [],
    });

    expect(text).toContain('Asha Rao (edited):');
  });

  it('reads an unknown time rather than crashing on a message with no timestamp', () => {
    const text = buildChatExport({ me, peer, messages: [message({ created_at: undefined })], calls: [] });

    expect(text).toContain('[unknown time]');
  });
});

describe('downloadChatExport', () => {
  it('hands the browser a download named for the conversation and the day', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:x');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const anchor = { href: '', download: '', click };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as never);

    downloadChatExport('the transcript', 'Vikram S');

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toMatch(/^chat-vikram-s-\d{4}-\d{2}-\d{2}\.txt$/);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});

// ---------------------------------------------------- useMessageSelection ----

describe('useMessageSelection', () => {
  const messages: StaffMessage[] = [
    { id: 'm1', from_user_id: 'me', to_user_id: 'u1', text: 'one' } as StaffMessage,
    { id: 'm2', from_user_id: 'u1', to_user_id: 'me', text: 'two' } as StaffMessage,
  ];

  const hook = (onDelete = vi.fn(), nameOf = (id: string) => (id === 'me' ? 'Me' : 'Them')) =>
    renderHook(() => useMessageSelection({ messages, meId: 'me', nameOf, onDelete }));

  // Selection is a MODE, not a permanent affordance.
  it('is inactive with nothing picked', () => {
    const { result } = hook();

    expect(result.current.active).toBe(false);
    expect(result.current.selected).toEqual([]);
  });

  it('starts a selection on one message', () => {
    const { result } = hook();

    act(() => result.current.start('m1'));

    expect(result.current.active).toBe(true);
    expect(result.current.selected.map((m) => m.id)).toEqual(['m1']);
  });

  it('toggles a message in and out of the selection', () => {
    const { result } = hook();
    act(() => result.current.start('m1'));

    act(() => result.current.toggle('m2'));
    expect(result.current.selected.map((m) => m.id).sort()).toEqual(['m1', 'm2']);

    act(() => result.current.toggle('m1'));
    expect(result.current.selected.map((m) => m.id)).toEqual(['m2']);
  });

  it('clears the whole selection', () => {
    const { result } = hook();
    act(() => result.current.start('m1'));

    act(() => result.current.clear());

    expect(result.current.active).toBe(false);
  });

  // Taking a message back reaches the other person's copy, so it needs all mine.
  it('is only allMine when every selected message was written by the viewer', () => {
    const { result } = hook();
    act(() => result.current.start('m1'));
    expect(result.current.allMine).toBe(true);

    act(() => result.current.toggle('m2'));
    expect(result.current.allMine).toBe(false);
  });

  it('copies what was picked, in thread order, and clears the selection', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: { writeText } });
    const { result } = hook();
    act(() => result.current.start('m1'));
    act(() => result.current.toggle('m2'));

    await act(async () => result.current.copy());
    await settle();

    expect(writeText).toHaveBeenCalledWith('Me: one\nThem: two');
    expect(result.current.active).toBe(false);
  });

  it('deletes each selected message and clears the selection', () => {
    const onDelete = vi.fn();
    const { result } = hook(onDelete);
    act(() => result.current.start('m1'));

    act(() => result.current.remove(true));

    expect(onDelete).toHaveBeenCalledWith('m1', true);
    expect(result.current.active).toBe(false);
  });
});

// ------------------------------------------------------------ useWindowDrag ----

describe('useWindowDrag', () => {
  const pointerEvent = (over: Partial<React.PointerEvent> = {}) =>
    ({
      preventDefault: vi.fn(),
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
      ...over,
    }) as unknown as React.PointerEvent;

  it('starts inside the viewport, clamped to it', () => {
    const { result } = renderHook(() =>
      useWindowDrag({ x: 0, y: 0, width: 400, height: 300 })
    );

    expect(result.current.rect).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  it('moves the window by the drag distance', () => {
    const { result } = renderHook(() =>
      useWindowDrag({ x: 100, y: 100, width: 400, height: 300 })
    );

    act(() => result.current.begin('MOVE')(pointerEvent()));
    act(() => result.current.move(pointerEvent({ clientX: 50, clientY: 20 })));

    expect(result.current.rect.x).toBe(150);
    expect(result.current.rect.y).toBe(120);
  });

  it('resizes the window by the drag distance, never below the floor', () => {
    const { result } = renderHook(() =>
      useWindowDrag({ x: 0, y: 0, width: 400, height: 300 })
    );

    act(() => result.current.begin('RESIZE')(pointerEvent()));
    act(() => result.current.move(pointerEvent({ clientX: -1000, clientY: -1000 })));

    expect(result.current.rect.width).toBeGreaterThanOrEqual(320);
    expect(result.current.rect.height).toBeGreaterThanOrEqual(220);
  });

  it('moves nothing before a gesture has begun', () => {
    const { result } = renderHook(() =>
      useWindowDrag({ x: 10, y: 10, width: 400, height: 300 })
    );

    act(() => result.current.move(pointerEvent({ clientX: 500 })));

    expect(result.current.rect).toEqual({ x: 10, y: 10, width: 400, height: 300 });
  });

  it('ends the gesture, so a further move does nothing', () => {
    const { result } = renderHook(() =>
      useWindowDrag({ x: 0, y: 0, width: 400, height: 300 })
    );
    act(() => result.current.begin('MOVE')(pointerEvent()));
    act(() => result.current.end(pointerEvent()));

    act(() => result.current.move(pointerEvent({ clientX: 100 })));

    expect(result.current.rect.x).toBe(0);
  });

  it('re-clamps when the window shrinks under it', () => {
    const { result } = renderHook(() =>
      useWindowDrag({ x: 900, y: 700, width: 400, height: 300 })
    );

    act(() => {
      vi.stubGlobal('innerWidth', 500);
      vi.stubGlobal('innerHeight', 400);
      globalThis.dispatchEvent(new Event('resize'));
    });

    expect(result.current.rect.x).toBeLessThanOrEqual(500);
  });
});

// -------------------------------------------------------- FloatingWindow ----

describe('FloatingWindow', () => {
  const initial = { x: 20, y: 20, width: 400, height: 300 };

  it('renders nothing while closed', () => {
    render(
      <FloatingWindow id="w1" open={false} title="Call with Vikram" initial={initial} onClose={vi.fn()}>
        <div>content</div>
      </FloatingWindow>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with its title and content, with no taskbar to dock to', () => {
    render(
      <FloatingWindow id="w1" open title="Call with Vikram" initial={initial} onClose={vi.fn()}>
        <div>content</div>
      </FloatingWindow>
    );

    expect(screen.getByRole('dialog', { name: 'Call with Vikram' })).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  // Closing asks first when the caller says it should, because the close
  // button on a call window ends the call.
  it('asks before closing when a warning was configured', () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow
        id="w1"
        open
        title="Call with Vikram"
        initial={initial}
        onClose={onClose}
        closeWarning={{ title: 'End call?', message: 'This ends the call for both of you.', confirmLabel: 'End call' }}
      >
        <div>content</div>
      </FloatingWindow>
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.getByText('End call?')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'End call' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes straight away with no warning configured', () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow id="w1" open title="Call with Vikram" initial={initial} onClose={onClose}>
        <div>content</div>
      </FloatingWindow>
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('maximises and restores', () => {
    render(
      <FloatingWindow id="w1" open title="Call with Vikram" initial={initial} onClose={vi.fn()}>
        <div>content</div>
      </FloatingWindow>
    );

    fireEvent.click(screen.getByRole('button', { name: /maximi/i }));
    fireEvent.click(screen.getByRole('button', { name: /maximi|restore/i }));

    expect(screen.getByText('content')).toBeInTheDocument();
  });

  // Rendered outside the shell — a test — there is no taskbar, so minimising
  // falls back to rolling up to its own title bar.
  it('rolls up to its own title bar when minimised with no taskbar to dock to', () => {
    render(
      <FloatingWindow id="w1" open title="Call with Vikram" initial={initial} onClose={vi.fn()}>
        <div>content</div>
      </FloatingWindow>
    );

    fireEvent.click(screen.getByRole('button', { name: /minimi/i }));

    expect(screen.queryByText('content')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Call with Vikram' })).toBeInTheDocument();
  });
});
