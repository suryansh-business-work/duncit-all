/**
 * The composer's own emoji button and its popover: a short, hand-picked set
 * rather than a full picker package.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import EmojiPicker from '../src/staff-chat/EmojiPicker';

/** MUI's exit transition needs real wall-clock time in jsdom to unmount. */
const waitForExit = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });

/** And its ENTER transition needs one too: the popover's children are not in
 * the document on the tick the click lands. */
const waitForEnter = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

/** jsdom 30 will not match an astral character in an attribute selector, so
 * the label is compared rather than queried. */
const byAriaLabel = (label: string) =>
  ([...document.body.querySelectorAll('[aria-label]')].find(
    (node) => node.getAttribute('aria-label') === label
    // A miss answers null, the same as querySelector did.
  ) ?? null) as HTMLElement;

describe('EmojiPicker', () => {
  it('picks an emoji, closing the popover behind it', async () => {
    const onPick = vi.fn();
    const { getByLabelText } = render(<EmojiPicker onPick={onPick} />);

    fireEvent.click(getByLabelText('Insert emoji'));
    await waitForEnter();
    expect(document.body.querySelector('[role="presentation"]')).not.toBeNull();

    fireEvent.click(byAriaLabel('👍') as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('👍');

    await waitForExit();
    expect(byAriaLabel('👎')).toBeNull();
  });

  it('closes from outside without picking anything', async () => {
    const { getByLabelText } = render(<EmojiPicker onPick={vi.fn()} />);

    fireEvent.click(getByLabelText('Insert emoji'));
    const backdrop = document.body.querySelector('[role="presentation"]') as HTMLElement;
    fireEvent.keyDown(backdrop, { key: 'Escape', code: 'Escape' });
    await waitForExit();

    expect(byAriaLabel('👍')).toBeNull();
  });

  it('disables the button while sending', () => {
    const { getByLabelText } = render(<EmojiPicker onPick={vi.fn()} disabled />);
    expect(getByLabelText('Insert emoji')).toBeDisabled();
  });
});
