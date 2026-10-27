import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignInPanel } from '../../../components/auth/SignInPanel';
import { renderWithProviders } from '../../test-utils';

/** Google's own button needs Google's script and provider; a placeholder stands in. */
vi.mock('@react-oauth/google', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@react-oauth/google')>()),
  GoogleLogin: () => <button type="button">Google button</button>,
}));

describe('SignInPanel', () => {
  it('always offers the code form', () => {
    renderWithProviders(<SignInPanel />);
    expect(screen.getByTestId('sign-in-email-form')).toBeInTheDocument();
  });

  it('adds Google, after an "or", only when a client id is configured', () => {
    const { unmount } = renderWithProviders(<SignInPanel />, { settings: { google_client_id: '' } });
    expect(screen.queryByTestId('google-sign-in')).not.toBeInTheDocument();
    expect(screen.queryByText('or')).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<SignInPanel />, { settings: { google_client_id: 'client-123.apps.example' } });
    expect(screen.getByText('or')).toBeInTheDocument();
    expect(screen.getByTestId('google-sign-in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google button' })).toBeInTheDocument();
  });

  it('points Duncit members at the Duncit app, opening it in a new tab safely', () => {
    renderWithProviders(<SignInPanel />, { settings: { sign_in_with_duncit: true, duncit_app_url: 'https://duncit.example/app' } });
    expect(screen.getByText(/Already on Duncit\? Use the same email and sign in with your Duncit account\./)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Open Duncit' });
    expect(link).toHaveAttribute('href', 'https://duncit.example/app');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps the Duncit note but drops the link when no app address is set', () => {
    renderWithProviders(<SignInPanel />, { settings: { sign_in_with_duncit: true, duncit_app_url: '' } });
    expect(screen.getByText(/Already on Duncit\?/)).toBeInTheDocument();
    expect(screen.queryByTestId('sign-in-duncit-link')).not.toBeInTheDocument();
  });

  it('says nothing about Duncit when Sign in with Duncit is off', () => {
    renderWithProviders(<SignInPanel />, { settings: { sign_in_with_duncit: false } });
    expect(screen.queryByText(/Already on Duncit\?/)).not.toBeInTheDocument();
  });
});
