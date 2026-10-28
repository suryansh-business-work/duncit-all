import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsPage } from '../../../pages/settings';
import { meFixture, renderWithProviders } from '../../test-utils';

const renderPage = (route = '/settings', signedIn = true) => renderWithProviders(<SettingsPage />, { me: signedIn ? meFixture() : null, path: '/settings', route });

describe('SettingsPage', () => {
  afterEach(() => {
    globalThis.localStorage.clear();
  });

  it('titles the page and offers Account, Preferences and Payment, Account first', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('tablist'))
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Account', 'Preferences', 'Payment']);
    expect(screen.getByRole('tab', { name: 'Account' })).toHaveAttribute('aria-selected', 'true');
    expect(document.title).toBe('Settings | Duncit Lite');
  });

  it('shows the profile and the contact details on Account', () => {
    renderPage();

    const panel = screen.getByRole('tabpanel', { name: 'Account' });
    expect(within(panel).getByRole('heading', { level: 2, name: 'Your profile' })).toBeInTheDocument();
    expect(within(panel).getByTestId('profile-form')).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { level: 2, name: 'Email and phone' })).toBeInTheDocument();
    expect(within(panel).getByTestId('contact-email')).toHaveTextContent('asha@example.com');
  });

  it('shows the UPI details on Payment', () => {
    renderPage('/settings?selectedtab=payment');

    const panel = screen.getByRole('tabpanel', { name: 'Payment' });
    expect(within(panel).getByRole('heading', { level: 2, name: 'Getting paid' })).toBeInTheDocument();
    expect(within(panel).getByTestId('payment-form')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
  });

  it('switches tabs and keeps the choice in the URL', async () => {
    const { user, router } = renderPage();

    await user.click(screen.getByRole('tab', { name: 'Payment' }));

    expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    expect(new URLSearchParams(router.state.location.search).get('selectedtab')).toBe('payment');
  });

  it('asks a signed-out reader to sign in for the account tabs', () => {
    renderPage('/settings', false);

    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to edit your profile.');
    expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
  });

  it('keeps the payment tab behind sign-in too', () => {
    renderPage('/settings?selectedtab=payment', false);

    expect(screen.getByTestId('signed-in-gate')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-form')).not.toBeInTheDocument();
  });

  it('lets anyone, signed in or not, pick the display mode on Preferences', () => {
    renderPage('/settings?selectedtab=preferences', false);

    const panel = screen.getByRole('tabpanel', { name: 'Preferences' });
    expect(within(panel).getByRole('heading', { level: 2, name: 'Display' })).toBeInTheDocument();
    expect(within(panel).getByRole('group', { name: 'Display' })).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { level: 2, name: 'Language' })).toBeInTheDocument();
    expect(screen.queryByTestId('signed-in-gate')).not.toBeInTheDocument();
  });
});
