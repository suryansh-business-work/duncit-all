import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelpTip } from '../src/guide/HelpTip';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** jsdom never matches `:focus-visible`, which is the one thing MUI's Tooltip checks before opening on focus. */
function letFocusCountAsVisible() {
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
    return selector === ':focus-visible' ? this === document.activeElement : matches.call(this, selector);
  });
}

describe('HelpTip', () => {
  it('is a small button named by the shared label; the sentence describes it once open, never renames it', async () => {
    render(<HelpTip title="Seats held by paid bookings, one per ticket." />);
    const button = screen.getByRole('button', { name: 'More about this' });
    expect(button).toHaveClass('MuiIconButton-sizeSmall');
    expect(button.querySelector('svg')).toHaveClass('MuiSvgIcon-fontSizeSmall');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseOver(button);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Seats held by paid bookings, one per ticket.');
    // The MUI trap: without describeChild the title becomes the button's aria-label.
    expect(screen.getByRole('button', { name: 'More about this' })).toBe(button);
    const describedBy = String(button.getAttribute('aria-describedby'));
    expect(document.getElementById(describedBy)).toHaveTextContent('Seats held by paid bookings, one per ticket.');
  });

  it('takes a specific name, a medium glyph with its own sx, and a placement', async () => {
    render(<HelpTip title="Only scanned seats are paid out." label="About scanned seats" size="medium" placement="right" iconSx={{ opacity: 0.5 }} />);
    const button = screen.getByRole('button', { name: 'About scanned seats' });
    const glyph = button.querySelector('svg');
    expect(glyph).toHaveClass('MuiSvgIcon-fontSizeMedium');
    expect(glyph).toHaveStyle({ opacity: '0.5' });
    fireEvent.mouseOver(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Only scanned seats are paid out.');
  });

  it('opens on keyboard focus and closes on blur', async () => {
    letFocusCountAsVisible();
    render(<HelpTip title="Hosts see this split on their own share." />);
    const button = screen.getByRole('button', { name: 'More about this' });
    act(() => button.focus());
    expect(button).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Hosts see this split on their own share.');
    act(() => button.blur());
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('opens on the first touch without the default 700ms touch delay', () => {
    vi.useFakeTimers();
    render(<HelpTip title="Tap to read." />);
    const button = screen.getByRole('button', { name: 'More about this' });
    fireEvent.touchStart(button);
    // Only the hover enterDelay (100ms) remains; 700ms would still be waiting.
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tap to read.');
  });
});
