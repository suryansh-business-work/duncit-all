/**
 * The support satisfaction dialog.
 *
 * It is safe to auto-open whenever a chat or ticket is resolved, and the thing
 * that makes it safe is that feedback is ONE-TIME: once a rating exists the
 * dialog renders a read-only summary and a thank-you instead of the form. A
 * dialog that re-asked would collect a second, worse rating from somebody
 * annoyed at being asked twice — and support's numbers would measure the
 * annoyance rather than the help.
 *
 * The scale itself is shared with the mobile app and the support portal (rule
 * 27), so the five points are asserted from the shared list rather than written
 * here; a sixth face on one surface would make the averages meaningless.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EmojiFeedbackDialog from '../EmojiFeedbackDialog';
import { FEEDBACK_OPTIONS, feedbackOptionFor } from '../feedbackScale';

const testTheme = createTheme();

const dialog = (over: Partial<Parameters<typeof EmojiFeedbackDialog>[0]> = {}) => {
  const spies = { onSubmit: vi.fn(), onClose: vi.fn() };
  const result = render(
    <ThemeProvider theme={testTheme}>
      <EmojiFeedbackDialog
        open
        existingRating={null}
        existingComment={null}
        {...spies}
        {...over}
      />
    </ThemeProvider>
  );
  return { ...result, spies };
};

/** The emoji buttons, which is what a rating is chosen with. */
const faces = () =>
  [...document.body.querySelectorAll<HTMLElement>('button')].filter((button) =>
    FEEDBACK_OPTIONS.some((option) => button.textContent?.includes(option.emoji))
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('feedbackOptionFor', () => {
  it('finds the face and label for every point on the scale', () => {
    for (const option of FEEDBACK_OPTIONS) {
      expect(feedbackOptionFor(option.value)).toEqual(option);
    }
  });

  it('finds nothing for a rating outside the scale, rather than guessing', () => {
    expect(feedbackOptionFor(0)).toBeNull();
    expect(feedbackOptionFor(6)).toBeNull();
    expect(feedbackOptionFor(null)).toBeNull();
    expect(feedbackOptionFor(undefined)).toBeNull();
  });

  it('is a five-point scale, shared with the app and the portal', () => {
    // A sixth face on one surface makes every average meaningless.
    expect(FEEDBACK_OPTIONS).toHaveLength(5);
    expect(FEEDBACK_OPTIONS.map((option) => option.value)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('EmojiFeedbackDialog', () => {
  it('renders nothing while it is closed', () => {
    dialog({ open: false });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('offers every point on the scale', () => {
    dialog();

    expect(faces()).toHaveLength(5);
  });

  it('will not submit before a face has been chosen', () => {
    const { spies } = dialog();

    for (const control of document.body.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      if (!faces().includes(control)) fireEvent.click(control);
    }

    expect(spies.onSubmit).not.toHaveBeenCalled();
  });

  it('submits the rating that was chosen, with whatever was typed', () => {
    const { spies } = dialog();

    const [, , , , best] = faces();
    fireEvent.click(best as HTMLElement);
    const comment = document.body.querySelector('textarea') as HTMLTextAreaElement;
    if (comment) fireEvent.change(comment, { target: { value: 'Sorted in minutes.' } });

    for (const control of document.body.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      if (!faces().includes(control)) fireEvent.click(control);
    }

    for (const [rating, text] of spies.onSubmit.mock.calls) {
      expect(rating).toBe(5);
      expect(text).toBe('Sorted in minutes.');
    }
  });

  it('submits a rating with no comment, since the comment is optional', () => {
    const { spies } = dialog();

    const [worst] = faces();
    fireEvent.click(worst as HTMLElement);
    for (const control of document.body.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      if (!faces().includes(control)) fireEvent.click(control);
    }

    for (const [rating] of spies.onSubmit.mock.calls) expect(rating).toBe(1);
  });

  it('shows a thank-you instead of the form once a rating already exists', () => {
    dialog({ existingRating: 4, existingComment: 'Quick and clear.' });

    // Re-asking collects a second, worse rating from somebody annoyed at being
    // asked twice.
    expect(faces()).toHaveLength(0);
    expect(document.body.textContent).toContain('Quick and clear.');
  });

  it('shows the face they picked back to them', () => {
    dialog({ existingRating: 5, existingComment: null });

    expect(document.body.textContent).toContain('😍');
  });

  it('shows the thank-you for a rating left without a comment', () => {
    dialog({ existingRating: 3, existingComment: null });

    expect(faces()).toHaveLength(0);
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('offers the form again for a rating outside the scale, rather than a blank summary', () => {
    dialog({ existingRating: 9 });

    expect(faces()).toHaveLength(5);
  });

  it('renders while the rating is being sent, with nothing submittable twice', () => {
    const { spies } = dialog({ busy: true });

    const [face] = faces();
    if (face) fireEvent.click(face);
    for (const control of document.body.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      if (!faces().includes(control)) fireEvent.click(control);
    }

    expect(spies.onSubmit).not.toHaveBeenCalled();
  });

  it('says why a rating did not save rather than closing over it', () => {
    dialog({ error: 'That chat is no longer open' });

    expect(document.body.textContent).toContain('That chat is no longer open');
  });

  it('closes through the caller rather than on its own', () => {
    const { spies } = dialog();

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });

    expect(spies.onSubmit).not.toHaveBeenCalled();
  });
});
