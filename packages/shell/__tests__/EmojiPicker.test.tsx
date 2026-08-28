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

describe('EmojiPicker', () => {
  it('picks an emoji, closing the popover behind it', async () => {
    const onPick = vi.fn();
    const { getByLabelText } = render(<EmojiPicker onPick={onPick} />);

    fireEvent.click(getByLabelText('Insert emoji'));
    expect(document.body.querySelector('[role="presentation"]')).not.toBeNull();

    fireEvent.click(document.body.querySelector('[aria-label="👍"]') as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('👍');

    await waitForExit();
    expect(document.body.querySelector('[aria-label="👎"]')).toBeNull();
  });

  it('closes from outside without picking anything', async () => {
    const { getByLabelText } = render(<EmojiPicker onPick={vi.fn()} />);

    fireEvent.click(getByLabelText('Insert emoji'));
    const backdrop = document.body.querySelector('[role="presentation"]') as HTMLElement;
    fireEvent.keyDown(backdrop, { key: 'Escape', code: 'Escape' });
    await waitForExit();

    expect(document.body.querySelector('[aria-label="👍"]')).toBeNull();
  });

  it('disables the button while sending', () => {
    const { getByLabelText } = render(<EmojiPicker onPick={vi.fn()} disabled />);
    expect(getByLabelText('Insert emoji')).toBeDisabled();
  });
});
