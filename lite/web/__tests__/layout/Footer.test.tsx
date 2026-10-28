import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Footer } from '../../layout/Footer';
import { captureNotifications, renderWithProviders } from '../test-utils';

/** The browser saying the page can be installed, with the reader's eventual answer. */
const offerInstall = (prompt: () => Promise<void>, outcome: 'accepted' | 'dismissed' = 'accepted') => {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => {
    globalThis.dispatchEvent(event);
  });
};

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
});

describe('Footer', () => {
  it('is a labelled footer navigation with the mark, Discover and Help', () => {
    renderWithProviders(<Footer />, { settings: { site_name: 'Lite Events', support_email: 'help@lite.example' } });

    const nav = within(screen.getByRole('navigation', { name: 'Footer' }));
    expect(nav.getByRole('img', { name: 'Lite Events' })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Discover' })).toHaveAttribute('href', '/discover');
    expect(nav.getByRole('link', { name: 'Help' })).toHaveAttribute('href', 'mailto:help@lite.example');
  });

  it('leaves Help out when no support address is configured', () => {
    renderWithProviders(<Footer />, { settings: { support_email: '' } });
    expect(screen.queryByRole('link', { name: 'Help' })).not.toBeInTheDocument();
  });

  it('offers "Get the app" only where the browser can install it', () => {
    renderWithProviders(<Footer />);
    expect(screen.queryByRole('button', { name: 'Get the app' })).not.toBeInTheDocument();

    offerInstall(vi.fn().mockResolvedValue(undefined));

    expect(screen.getByRole('button', { name: 'Get the app' })).toBeInTheDocument();
  });

  it("shows the browser's install prompt and hides the button once installed", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithProviders(<Footer />);
    offerInstall(prompt);

    await user.click(screen.getByRole('button', { name: 'Get the app' }));

    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Get the app' })).not.toBeInTheDocument());
    expect(toasts.seen).toEqual([]);
  });

  it('says what to do when the browser refuses to install', async () => {
    const { user } = renderWithProviders(<Footer />);
    offerInstall(vi.fn().mockRejectedValue(new Error('NotAllowedError')));

    await user.click(screen.getByRole('button', { name: 'Get the app' }));

    await waitFor(() =>
      expect(toasts.seen).toEqual([{ message: 'The app could not be installed. Try again from your browser menu.', severity: 'error' }]),
    );
  });
});
