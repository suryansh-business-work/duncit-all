import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../shared/env';
import { LITE_ME } from '../../../shared/graphql/documents';
import { LiteSessionProvider } from '../../../shared/session';
import { buildLiteTheme } from '../../../shared/theme';
import { LiteSettingsProvider } from '../../app/providers/LiteSettingsProvider';
import { SignInPromptProvider } from '../../app/providers/SignInPromptProvider';
import { SignInDialog } from '../../components/auth/SignInDialog';
import { SignedInGate } from '../../components/SignedInGate';
import { meFixture, renderWithProviders, seedCache } from '../test-utils';

const page = (body?: string) => (
  <>
    <SignedInGate body={body}>
      <p>Your private page</p>
    </SignedInGate>
    <SignInDialog />
  </>
);

describe('SignedInGate', () => {
  it('shows the page to a signed-in reader', () => {
    renderWithProviders(page(), { me: meFixture() });
    expect(screen.getByText('Your private page')).toBeInTheDocument();
    expect(screen.queryByTestId('signed-in-gate')).not.toBeInTheDocument();
  });

  it('asks a visitor to sign in, with the default reason', () => {
    renderWithProviders(page());
    const gate = screen.getByTestId('signed-in-gate');
    expect(gate).toHaveTextContent('Sign in to continue');
    expect(gate).toHaveTextContent('This page belongs to your account.');
    expect(screen.queryByText('Your private page')).not.toBeInTheDocument();
  });

  it('says what the page is for when the page explains itself', () => {
    renderWithProviders(page('Sign in to see your tickets.'));
    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to see your tickets.');
    expect(screen.getByTestId('signed-in-gate')).not.toHaveTextContent('This page belongs to your account.');
  });

  it('opens the sign-in dialog from its button', async () => {
    const { user } = renderWithProviders(page());
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('dialog', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('waits, with a spinner, while a stored session is being checked', async () => {
    const slowMe = { request: { query: LITE_ME }, result: { data: { liteMe: meFixture() } }, delay: 30 };
    render(
      <MockedProvider mocks={[slowMe]} cache={seedCache()}>
        <ThemeProvider theme={buildLiteTheme()}>
          <LiteSettingsProvider>
            <LiteSessionProvider tokenKey={STORAGE_KEYS.token} initialToken="stored-token">
              <SignInPromptProvider>
                <SignedInGate>
                  <p>Your private page</p>
                </SignedInGate>
              </SignInPromptProvider>
            </LiteSessionProvider>
          </LiteSettingsProvider>
        </ThemeProvider>
      </MockedProvider>,
    );
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(screen.queryByTestId('signed-in-gate')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Your private page')).toBeInTheDocument());
  });
});
