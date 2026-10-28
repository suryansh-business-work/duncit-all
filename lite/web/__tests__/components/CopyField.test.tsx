import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyField } from '../../components/CopyField';
import { captureNotifications, renderWithProviders } from '../test-utils';

describe('CopyField', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
    vi.restoreAllMocks();
  });

  it('shows the value read-only under its label, with a copy button named after the label', () => {
    renderWithProviders(<CopyField label="Event page" value="https://lite.example/e/garden-party" testId="event-link" />);

    const input = screen.getByRole('textbox', { name: 'Event page' });
    expect(input).toHaveValue('https://lite.example/e/garden-party');
    expect(input).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Copy Event page' })).toHaveAttribute('data-testid', 'event-link-copy');
  });

  it('copies the value to the clipboard and says so', async () => {
    const { user } = renderWithProviders(<CopyField label="UPI ID" value="asha@okaxis" />);

    await user.click(screen.getByRole('button', { name: 'Copy UPI ID' }));

    await expect(globalThis.navigator.clipboard.readText()).resolves.toBe('asha@okaxis');
    expect(toasts.seen).toEqual([{ message: 'Copied', severity: 'success' }]);
  });

  it('tells the reader to copy by hand when the browser refuses the clipboard', async () => {
    const { user } = renderWithProviders(<CopyField label="UPI ID" value="asha@okaxis" />);
    vi.spyOn(globalThis.navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await user.click(screen.getByRole('button', { name: 'Copy UPI ID' }));

    expect(toasts.seen).toEqual([{ message: 'Could not copy. Select the text and copy it by hand.', severity: 'error' }]);
  });

  it('falls back to the default test id when none is given', () => {
    renderWithProviders(<CopyField label="Code" value="ABC123" />);

    expect(screen.getByTestId('copy-field')).toHaveValue('ABC123');
    expect(screen.getByTestId('copy-field-copy')).toBeInTheDocument();
  });
});
