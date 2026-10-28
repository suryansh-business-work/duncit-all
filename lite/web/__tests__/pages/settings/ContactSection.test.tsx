import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactSection } from '../../../pages/settings/ContactSection';
import { meFixture, renderWithProviders } from '../../test-utils';

describe('ContactSection', () => {
  it('shows the account email as primary, with a Change button named after it', () => {
    renderWithProviders(<ContactSection me={meFixture()} />);

    const row = screen.getByTestId('contact-email');
    expect(within(row).getByText('Email')).toBeInTheDocument();
    expect(within(row).getByText('asha@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Primary')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Change Email' })).toHaveTextContent('Change');
    expect(screen.getByText('Hosts see these when you register for their events. Each one is checked with a code.')).toBeInTheDocument();
  });

  it('offers to add an email to a phone-only account, without the primary mark', () => {
    renderWithProviders(<ContactSection me={meFixture({ email: '', phone: '+919876543210' })} />);

    const row = screen.getByTestId('contact-email');
    expect(within(row).getByText('Not added')).toBeInTheDocument();
    expect(within(row).queryByText('Primary')).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Add Email' })).toBeInTheDocument();
  });

  it('hides the phone row while phone sign-in is off and no phone is on the account', () => {
    renderWithProviders(<ContactSection me={meFixture()} />, { settings: { phone_sign_in: false } });

    expect(screen.queryByTestId('contact-phone')).not.toBeInTheDocument();
  });

  it('offers to add a phone once phone sign-in is on', () => {
    renderWithProviders(<ContactSection me={meFixture()} />, { settings: { phone_sign_in: true } });

    const row = screen.getByTestId('contact-phone');
    expect(within(row).getByText('Not added')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Add Phone number' })).toBeInTheDocument();
  });

  it('still shows a phone already on the account when phone sign-in is off', () => {
    renderWithProviders(<ContactSection me={meFixture({ phone: '+919876543210' })} />, { settings: { phone_sign_in: false } });

    const row = screen.getByTestId('contact-phone');
    expect(within(row).getByText('+919876543210')).toBeInTheDocument();
    expect(within(row).queryByText('Primary')).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Change Phone number' })).toBeInTheDocument();
  });

  it('notes an account linked to Duncit', () => {
    renderWithProviders(<ContactSection me={meFixture({ duncit_linked: true })} />);

    expect(screen.getByText('Signed in with your Duncit account')).toBeInTheDocument();
  });

  it('does not mention Duncit for a Lite-only account', () => {
    renderWithProviders(<ContactSection me={meFixture()} />);

    expect(screen.queryByText('Signed in with your Duncit account')).not.toBeInTheDocument();
  });

  it('opens the change dialog for the email, and closes it again', async () => {
    const { user } = renderWithProviders(<ContactSection me={meFixture()} />, { me: meFixture() });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Change Email' }));

    const dialog = screen.getByRole('dialog', { name: 'Email address' });
    expect(within(dialog).getByRole('textbox', { name: 'Email' })).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the change dialog for the phone', async () => {
    const { user } = renderWithProviders(<ContactSection me={meFixture()} />, { me: meFixture(), settings: { phone_sign_in: true } });

    await user.click(screen.getByRole('button', { name: 'Add Phone number' }));

    const dialog = screen.getByRole('dialog', { name: 'Phone number' });
    expect(within(dialog).getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument();
  });
});
