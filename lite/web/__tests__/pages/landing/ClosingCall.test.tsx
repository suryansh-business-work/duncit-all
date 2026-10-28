import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClosingCall } from '../../../pages/landing/ClosingCall';
import { captureNotifications, renderWithProviders } from '../../test-utils';

/** The browser's install offer, as Chromium fires it. */
function offerInstall(prompt: () => Promise<void>, outcome: 'accepted' | 'dismissed' = 'accepted'): Event {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => {
    globalThis.dispatchEvent(event);
  });
  return event;
}

describe('ClosingCall', () => {
  let notifications: ReturnType<typeof captureNotifications>;
  beforeEach(() => {
    notifications = captureNotifications();
  });
  afterEach(() => notifications.stop());

  it('closes the page with its line and a way to Discover', () => {
    renderWithProviders(<ClosingCall />);
    expect(screen.getByRole('heading', { level: 2, name: 'Your next unforgettable memory awaits.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discover events' })).toHaveAttribute('href', '/discover');
  });

  it('offers no install button where the browser offers no install prompt', () => {
    renderWithProviders(<ClosingCall />);
    expect(screen.queryByRole('button', { name: 'Get the app' })).not.toBeInTheDocument();
  });

  it('shows Get the app once the browser can install, and hides it after an accepted install', async () => {
    const prompt = vi.fn(async () => undefined);
    const { user } = renderWithProviders(<ClosingCall />);
    const event = offerInstall(prompt);
    expect(event.defaultPrevented).toBe(true);

    await user.click(await screen.findByRole('button', { name: 'Get the app' }));
    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Get the app' })).not.toBeInTheDocument());
    expect(notifications.seen).toEqual([]);
  });

  it('tells the reader when the install could not start', async () => {
    const prompt = vi.fn(async () => {
      throw new Error('prompt refused');
    });
    const { user } = renderWithProviders(<ClosingCall />);
    offerInstall(prompt);

    await user.click(await screen.findByRole('button', { name: 'Get the app' }));
    await waitFor(() =>
      expect(notifications.seen).toContainEqual({ message: 'The app could not be installed. Try again from your browser menu.', severity: 'error' }),
    );
  });
});
