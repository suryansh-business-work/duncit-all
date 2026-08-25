/**
 * Attaching a picture of what went wrong.
 *
 * The most useful thing a reporter can send and the least likely thing they
 * will type: a screenshot carries the error text, the address bar and the state
 * of the page at once. So what matters here is that the control is reachable,
 * that it stops offering itself once the limit is reached, and that picking the
 * SAME file twice still registers — a browser fires no change event for an
 * unchanged input value, which is why the input is cleared after every pick.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScreenshotField from './ScreenshotField';
import { MAX_SCREENSHOTS } from './report-issue.types';
import type { ScreenshotDraft } from './useScreenshots';

const shot = (id: string, name = `${id}.png`): ScreenshotDraft => ({
  id,
  file_name: name,
  data: `data:image/png;base64,${id}`,
  mime_type: 'image/png',
});

const props = (over: Partial<Parameters<typeof ScreenshotField>[0]> = {}) => ({
  shots: [],
  error: '',
  disabled: false,
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  ...over,
});

/** Whether the named control is switched off. */
const disabledState = (name: string) =>
  (screen.getByRole('button', { name }) as HTMLButtonElement).disabled;

/** The hidden file input the button clicks for the reader. */
const filePicker = () => document.querySelector('input[type="file"]') as HTMLInputElement;

describe('ScreenshotField', () => {
  it('explains what a screenshot buys, and offers the picker', () => {
    render(<ScreenshotField {...props()} />);

    expect(screen.getByText('Screenshots')).toBeTruthy();
    expect(screen.getByText(/Up to 3 images, 5 MB each/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add an image' })).toBeTruthy();
  });

  it('opens the file picker from the button, since the input itself is hidden', () => {
    render(<ScreenshotField {...props()} />);
    const click = vi.spyOn(filePicker(), 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Add an image' }));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it('hands the picked files up, then clears the input so the same file can be picked again', () => {
    const onAdd = vi.fn();
    render(<ScreenshotField {...props({ onAdd })} />);

    fireEvent.change(filePicker(), { target: { files: [] } });

    expect(onAdd).toHaveBeenCalledTimes(1);
    // A browser fires no change event when the value did not change, so an
    // input left holding the last pick silently ignores a re-pick.
    expect(filePicker().value).toBe('');
  });

  it('shows each attachment with its own name, and a way to take it back', () => {
    const onRemove = vi.fn();
    render(<ScreenshotField {...props({ shots: [shot('a'), shot('b')], onRemove })} />);

    expect(screen.getByAltText('a.png')).toBeTruthy();
    expect(screen.getByAltText('b.png')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this image' })[1]!);

    expect(onRemove).toHaveBeenCalledWith('b');
  });

  it('stops offering the picker once the limit is reached', () => {
    const full = Array.from({ length: MAX_SCREENSHOTS }, (_, i) => shot(`s${i}`));
    render(<ScreenshotField {...props({ shots: full })} />);

    expect(disabledState('Add an image')).toBe(true);
  });

  it('locks everything while the report is being sent', () => {
    render(<ScreenshotField {...props({ shots: [shot('a')], disabled: true })} />);

    expect(disabledState('Add an image')).toBe(true);
    expect(disabledState('Remove this image')).toBe(true);
  });

  it('replaces the hint with the reason a file was turned away', () => {
    render(<ScreenshotField {...props({ error: 'That image is over 5 MB.' })} />);

    expect(screen.getByText('That image is over 5 MB.')).toBeTruthy();
    expect(screen.queryByText(/Up to 3 images, 5 MB each/)).toBeNull();
  });
});
