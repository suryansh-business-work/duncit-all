/**
 * What `@` and `:` offer while typing — one list, since only one trigger can
 * sit under the caret at a time, with the keyboard handling that comes with
 * owning the arrows and Enter while it is open.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useComposerSuggestions } from '../src/staff-chat/useComposerSuggestions';

const NAMES = ['Vikram N', 'Vikas Shah', 'Asha Rao'];

const key = (k: string): React.KeyboardEvent =>
  ({ key: k, preventDefault: vi.fn() }) as unknown as React.KeyboardEvent;

const setup = (draft = '', mentionNames: string[] = NAMES) => {
  const onDraft = vi.fn();
  const { result, rerender } = renderHook(
    ({ text, names }: { text: string; names: string[] }) =>
      useComposerSuggestions({ mentionNames: names, draft: text, onDraft }),
    { initialProps: { text: draft, names: mentionNames } }
  );
  return { result, rerender, onDraft };
};

describe('useComposerSuggestions', () => {
  it('offers nothing when neither trigger is under the caret', () => {
    const { result } = setup();

    act(() => {
      result.current.read('just talking', 12);
    });

    expect(result.current.items).toEqual([]);
  });

  it('lists mentions starting with what was typed after the @', () => {
    const { result } = setup('@Vik');

    act(() => {
      result.current.read('@Vik', 4);
    });

    expect(result.current.items.map((item) => item.label)).toEqual(['@Vikram N', '@Vikas Shah']);
  });

  it('lists emoji shortcodes starting with what was typed after the :', () => {
    const { result } = setup(':thu');

    act(() => {
      result.current.read(':thu', 4);
    });

    expect(result.current.items.map((item) => item.label)).toEqual(['👍  :thumbsup', '👎  :thumbsdown']);
  });

  it('shows nothing when the shortcode typed matches no emoji at all', () => {
    const { result } = setup(':zzz');

    act(() => {
      result.current.read(':zzz', 4);
    });

    expect(result.current.items).toEqual([]);
  });

  it('picks a mention, writing the name and moving the caret past it', () => {
    const { result, onDraft } = setup('@Vik');
    act(() => {
      result.current.read('@Vik', 4);
    });

    act(() => {
      result.current.pick(result.current.items[0], 4);
    });

    expect(onDraft).toHaveBeenCalledWith('@Vikram N ', 10);
  });

  it('picks an emoji, replacing the shortcode with the character itself', () => {
    const { result, onDraft } = setup(':thu');
    act(() => {
      result.current.read(':thu', 4);
    });

    act(() => {
      result.current.pick(result.current.items[0], 4);
    });

    expect(onDraft).toHaveBeenCalledWith('👍', '👍'.length);
  });

  it('closes the list once something has been picked', () => {
    const { result } = setup('@Vik');
    act(() => {
      result.current.read('@Vik', 4);
    });

    act(() => {
      result.current.pick(result.current.items[0], 4);
    });

    expect(result.current.items).toEqual([]);
  });

  it('does nothing on any key when the list is not open', () => {
    const { result } = setup();

    const handled = result.current.handleKey(key('ArrowDown'), 0);

    expect(handled).toBe(false);
  });

  it('cycles the highlight forward on ArrowDown and back on ArrowUp, wrapping both ways', () => {
    const { result } = setup('@Vi');
    act(() => {
      result.current.read('@Vi', 3);
    });
    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.handleKey(key('ArrowDown'), 3);
    });
    expect(result.current.active).toBe(1);

    act(() => {
      result.current.handleKey(key('ArrowUp'), 3);
    });
    expect(result.current.active).toBe(0);

    // Wrapping the other way: back from the first item lands on the last.
    act(() => {
      result.current.handleKey(key('ArrowUp'), 3);
    });
    expect(result.current.active).toBe(1);
  });

  it('prevents the default arrow behaviour while the list owns the keys', () => {
    const { result } = setup('@Vi');
    act(() => {
      result.current.read('@Vi', 3);
    });
    const event = key('ArrowDown');

    act(() => {
      result.current.handleKey(event, 3);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('picks the highlighted item on Enter, and the first one again on Tab', () => {
    const { result, onDraft } = setup('@Vi');
    act(() => {
      result.current.read('@Vi', 3);
    });
    act(() => {
      result.current.handleKey(key('ArrowDown'), 3);
    });

    act(() => {
      result.current.handleKey(key('Enter'), 3);
    });
    expect(onDraft).toHaveBeenCalledWith('@Vikas Shah ', 12);

    onDraft.mockClear();
    act(() => {
      result.current.read('@Vi', 3);
    });
    act(() => {
      result.current.handleKey(key('Tab'), 3);
    });
    expect(onDraft).toHaveBeenCalledWith('@Vikram N ', 10);
  });

  it('falls back to the first item when the highlighted index no longer exists', () => {
    const { result, onDraft, rerender } = setup('@Vi');
    act(() => {
      result.current.read('@Vi', 3);
    });
    act(() => {
      result.current.handleKey(key('ArrowDown'), 3);
    });
    expect(result.current.active).toBe(1);

    // The mentionable list itself narrows — someone left the thread — without
    // the query changing, so the highlighted index can point past the end.
    rerender({ text: '@Vi', names: ['Vikram N'] });
    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.handleKey(key('Enter'), 3);
    });
    expect(onDraft).toHaveBeenCalledWith('@Vikram N ', 10);
  });

  it('closes the list on Escape, without picking anything', () => {
    const { result, onDraft } = setup('@Vi');
    act(() => {
      result.current.read('@Vi', 3);
    });

    let handled = false;
    act(() => {
      handled = result.current.handleKey(key('Escape'), 3);
    });

    expect(handled).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(onDraft).not.toHaveBeenCalled();
  });

  it('leaves any other key alone while the list is open', () => {
    const { result } = setup('@Vi');
    act(() => {
      result.current.read('@Vi', 3);
    });

    const handled = result.current.handleKey(key('a'), 3);

    expect(handled).toBe(false);
  });

  it('closes the list directly, the same way blurring the box does', () => {
    const { result } = setup('@Vi');
    act(() => {
      result.current.read('@Vi', 3);
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.items).toEqual([]);
  });
});
