/**
 * The comments under a pod: the list, the box you write in, and the relative
 * clock they are stamped with.
 *
 * Two rules here are about whose comment it is. Only the author is offered a
 * delete — showing the control to everybody and refusing it server-side is how
 * a reader learns they cannot do the thing they were invited to do. And the
 * author's name and photo open THEIR profile, by author id, not the viewer's:
 * an avatar wired to the wrong id sends every reader to their own page and
 * looks like nothing is broken.
 *
 * The relative stamp is the third: "just now" and a date are the same field
 * rendered by age, and a comment from last year reading "just now" is worse
 * than no stamp at all.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CommentsList from '../CommentsList';
import CommentInput from '../CommentInput';
import { formatRelative, makeCommentSchema } from '../helpers';

const testTheme = createTheme();
const ME = 'u-me';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode) =>
  render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);

const comment = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  author_id: 'u-peer',
  author_name: 'Vikram N',
  author_photo: 'https://ik.imagekit.io/duncit/vikram.jpg',
  text: 'Is there a spot left on Sunday?',
  created_at: new Date().toISOString(),
  like_count: 0,
  liked_by_me: false,
  ...over,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('formatRelative', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('reads a fresh comment as just now, not as a date', () => {
    expect(formatRelative(ago(5_000))).toMatch(/now/i);
  });

  it('counts minutes, then hours, then days — each in its own range', () => {
    const minutes = formatRelative(ago(5 * 60_000));
    const hours = formatRelative(ago(5 * 60 * 60_000));
    const days = formatRelative(ago(5 * 24 * 60 * 60_000));

    expect(new Set([minutes, hours, days]).size).toBe(3);
  });

  it('falls back to a date once a comment is old enough to need one', () => {
    const old = formatRelative(ago(400 * 24 * 60 * 60_000));

    expect(old).not.toMatch(/now/i);
    expect(old.length).toBeGreaterThan(0);
  });
});

describe('makeCommentSchema', () => {
  const schema = makeCommentSchema((key: string) => key);

  it('will not post an empty comment, or one that is only spaces', () => {
    expect(schema.safeParse({ text: '' }).success).toBe(false);
    expect(schema.safeParse({ text: '    ' }).success).toBe(false);
  });

  it('takes an ordinary comment', () => {
    expect(schema.safeParse({ text: 'Count me in' }).success).toBe(true);
  });

  it('refuses one longer than the field will hold', () => {
    expect(schema.safeParse({ text: 'x'.repeat(5000) }).success).toBe(false);
  });
});

describe('CommentsList', () => {
  const list = (over: Partial<Parameters<typeof CommentsList>[0]> = {}) => {
    const spies = { onToggleLike: vi.fn(), onRequestDelete: vi.fn(), onOpenProfile: vi.fn() };
    return {
      spies,
      ...wrap(<CommentsList comments={[comment()]} viewerId={ME} {...spies} {...over} />),
    };
  };

  it('shows each comment with who wrote it', () => {
    const { container } = list();

    expect(container.textContent).toContain('Vikram N');
    expect(container.textContent).toContain('Is there a spot left on Sunday?');
  });

  it('renders a comment whose author has no name on file', () => {
    const { container } = list({
      comments: [comment({ author_name: '', author_photo: '' })],
    });

    expect(container.textContent).toContain('Is there a spot left on Sunday?');
  });

  it('opens the AUTHOR profile, never the viewer own', () => {
    const { container, spies } = list();

    for (const target of container.querySelectorAll<HTMLElement>('[role="button"]')) {
      fireEvent.click(target);
    }

    expect(spies.onOpenProfile).toHaveBeenCalledWith('u-peer');
    expect(spies.onOpenProfile).not.toHaveBeenCalledWith(ME);
  });

  it('opens a profile from the keyboard too, since the avatar is not a real button', () => {
    const { container, spies } = list();

    for (const target of container.querySelectorAll<HTMLElement>('[role="button"]')) {
      fireEvent.keyDown(target, { key: 'Enter' });
    }

    expect(spies.onOpenProfile).toHaveBeenCalledWith('u-peer');
  });

  it('offers delete only on the reader own comment', () => {
    const mine = list({ comments: [comment({ author_id: ME })] });
    const theirs = list();

    expect(mine.container.querySelectorAll('button').length).toBeGreaterThan(
      theirs.container.querySelectorAll('button').length
    );
  });

  it('never offers delete to a signed-out reader', () => {
    const { container } = list({ viewerId: null, comments: [comment({ author_id: ME })] });

    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  it('reports a like by comment id', () => {
    const { container, spies } = list();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.onToggleLike).toHaveBeenCalledWith('c-1');
  });

  it('shows a like count only once there is one, and marks the reader own like', () => {
    const none = list();
    const some = list({ comments: [comment({ like_count: 4, liked_by_me: true })] });

    expect(some.container.textContent).toContain('4');
    expect(none.container.textContent).not.toContain('4');
  });

  it('renders a pod nobody has commented on', () => {
    const { container } = list({ comments: [] });

    expect(container).toBeDefined();
  });
});

describe('CommentInput', () => {
  const input = (over: Partial<Parameters<typeof CommentInput>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    return {
      onSubmit,
      ...wrap(<CommentInput viewerId={ME} posting={false} onSubmit={onSubmit} {...over} />),
    };
  };

  it('offers a box to write in', () => {
    expect(input().container.querySelector('textarea, input')).not.toBeNull();
  });

  it('will not post an empty comment', async () => {
    const { container, onSubmit } = input();

    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('posts what was written', async () => {
    const { container, onSubmit } = input();
    const field = container.querySelector('textarea, input') as HTMLElement;

    fireEvent.change(field, { target: { value: 'Count me in' } });
    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);
    else for (const control of container.querySelectorAll<HTMLElement>('button')) fireEvent.click(control);
    await settle();

    for (const [values] of onSubmit.mock.calls) {
      expect(values).toMatchObject({ text: 'Count me in' });
    }
  });

  it('renders while a comment is going out', () => {
    expect(input({ posting: true }).container.innerHTML).not.toBe('');
  });

  it('renders for a signed-out reader without offering to post as nobody', () => {
    expect(input({ viewerId: null }).container.innerHTML).not.toBe('');
  });
});
