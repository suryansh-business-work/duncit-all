/**
 * The row under a message: existing reactions grouped by emoji, the quick
 * six, and the wider picker behind "more".
 */
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MessageReactions from '../src/staff-chat/MessageReactions';
import type { StaffReaction } from '../src/staff-chat/queries';

const waitForExit = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });

/** jsdom 30 will not match an astral character in an attribute selector, so
 * the label is compared rather than queried. */
const byAriaLabel = (label: string) =>
  ([...document.body.querySelectorAll('[aria-label]')].find(
    (node) => node.getAttribute('aria-label') === label
    // A miss answers null, the same as querySelector did.
  ) ?? null) as HTMLElement;

describe('MessageReactions', () => {
  it('groups existing reactions by emoji, marking your own as pressed', () => {
    const reactions: StaffReaction[] = [
      { emoji: '👍', user_id: 'u-1' },
      { emoji: '👍', user_id: 'u-2' },
      { emoji: '🔥', user_id: 'u-3' },
    ] as StaffReaction[];
    const { getByLabelText } = render(
      <MessageReactions reactions={reactions} meId="u-2" nameOf={(id) => id} onReact={vi.fn()} />,
    );

    const thumbsUp = getByLabelText(/^👍 from/);
    expect(thumbsUp).toHaveAttribute('aria-pressed', 'true');
    const fire = getByLabelText(/^🔥 from/);
    expect(fire).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles your own reaction by clicking an existing one', () => {
    const onReact = vi.fn();
    const reactions: StaffReaction[] = [{ emoji: '👍', user_id: 'u-1' }] as StaffReaction[];
    const { getByLabelText } = render(
      <MessageReactions reactions={reactions} meId="u-1" nameOf={(id) => id} onReact={onReact} />,
    );

    fireEvent.click(getByLabelText(/^👍 from/));

    expect(onReact).toHaveBeenCalledWith('👍');
  });

  it('reacts from one of the six quick emoji', () => {
    const onReact = vi.fn();
    const { getByLabelText } = render(
      <MessageReactions reactions={[]} meId="u-1" nameOf={(id) => id} onReact={onReact} />,
    );

    fireEvent.click(getByLabelText('React 👍'));

    expect(onReact).toHaveBeenCalledWith('👍');
  });

  it('opens the wider picker, reacts from it, and closes it behind the pick', async () => {
    const onReact = vi.fn();
    const { getByLabelText } = render(
      <MessageReactions reactions={[]} meId="u-1" nameOf={(id) => id} onReact={onReact} />,
    );

    fireEvent.click(getByLabelText('More reactions'));
    const partyPopper = byAriaLabel('React 🎉') as HTMLElement;
    expect(partyPopper).not.toBeNull();

    fireEvent.click(partyPopper);
    expect(onReact).toHaveBeenCalledWith('🎉');

    await waitForExit();
    expect(byAriaLabel('React 🎉')).toBeNull();
  });

  it('closes the wider picker from outside without reacting', async () => {
    const { getByLabelText } = render(
      <MessageReactions reactions={[]} meId="u-1" nameOf={(id) => id} onReact={vi.fn()} />,
    );

    fireEvent.click(getByLabelText('More reactions'));
    const backdrop = document.body.querySelector('[role="presentation"]') as HTMLElement;
    fireEvent.keyDown(backdrop, { key: 'Escape', code: 'Escape' });
    await waitForExit();

    expect(byAriaLabel('React 🎉')).toBeNull();
  });
});
