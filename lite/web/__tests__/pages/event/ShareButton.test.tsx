import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareButton } from '../../../pages/event/ShareButton';
import { captureNotifications, renderWithProviders } from '../../test-utils';

/** Gives jsdom (which has none) a device share sheet for one test. */
function installShare(share: (data: ShareData) => Promise<void>) {
  Object.defineProperty(globalThis.navigator, 'share', { value: share, configurable: true, writable: true });
}

describe('ShareButton', () => {
  let toasts: ReturnType<typeof captureNotifications>;
  beforeEach(() => {
    toasts = captureNotifications();
  });
  afterEach(() => {
    toasts.stop();
    Reflect.deleteProperty(globalThis.navigator, 'share');
    vi.restoreAllMocks();
  });

  it('opens the device share sheet with the event’s title and link, and stays quiet', async () => {
    const share = vi.fn((_data: ShareData) => Promise.resolve());
    installShare(share);
    const { user } = renderWithProviders(<ShareButton title="Garden Party" slug="garden-party" />);

    await user.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith({ title: 'Garden Party', url: expect.stringMatching(/\/e\/garden-party$/) });
    expect(toasts.seen).toEqual([]);
  });

  it('copies the link instead when the reader closes the share sheet', async () => {
    installShare(vi.fn((_data: ShareData) => Promise.reject(new Error('AbortError'))));
    const { user } = renderWithProviders(<ShareButton title="Garden Party" slug="garden-party" />);
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    await user.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(toasts.seen).toEqual([{ message: 'Link copied', severity: 'success' }]));
    expect(write).toHaveBeenCalledWith(expect.stringMatching(/\/e\/garden-party$/));
  });

  it('copies the link where there is no share sheet', async () => {
    const { user } = renderWithProviders(<ShareButton title="Garden Party" slug="garden-party" />);
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    await user.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(toasts.seen).toEqual([{ message: 'Link copied', severity: 'success' }]));
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('asks the reader to copy by hand when the clipboard refuses', async () => {
    const { user } = renderWithProviders(<ShareButton title="Garden Party" slug="garden-party" />);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'));

    await user.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(toasts.seen).toEqual([{ message: 'Could not copy. Select the text and copy it by hand.', severity: 'error' }]));
  });
});
