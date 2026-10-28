import { screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { GoogleLoginProps } from '@react-oauth/google';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../../shared/env';
import { LITE_SIGN_IN_WITH_GOOGLE } from '../../../../shared/graphql/documents';
import { GoogleSignInButton } from '../../../components/auth/GoogleSignInButton';
import { meFixture, renderWithProviders, typed } from '../../test-utils';
import { afterSignInMocks } from './sign-in/sign-in-mocks';

/** Google's button stands in as three buttons: a credential, an answer without one, and a failure. */
vi.mock('@react-oauth/google', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@react-oauth/google')>()),
  GoogleLogin: ({ onSuccess, onError }: GoogleLoginProps) => (
    <>
      <button type="button" onClick={() => onSuccess({ credential: 'google-id-token' })}>
        Google answers
      </button>
      <button type="button" onClick={() => onSuccess({})}>
        Google answers blank
      </button>
      <button type="button" onClick={() => onError?.()}>
        Google fails
      </button>
    </>
  ),
}));

const exchangeResult = vi.fn(() => ({ data: { liteSignInWithGoogle: typed('LiteAuthPayload', { token: 'google-session', user: meFixture() }) } }));
const exchange: MockedResponse = { request: { query: LITE_SIGN_IN_WITH_GOOGLE, variables: { id_token: 'google-id-token' } }, result: exchangeResult };

afterEach(() => {
  exchangeResult.mockClear();
  localStorage.clear();
});

describe('GoogleSignInButton', () => {
  it('trades Google’s id token for a Lite session', async () => {
    const { user } = renderWithProviders(<GoogleSignInButton />, { mocks: [exchange, ...afterSignInMocks()] });
    await user.click(screen.getByRole('button', { name: 'Google answers' }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('google-session'));
    expect(exchangeResult).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks the API nothing when Google answers without a credential', async () => {
    const { user } = renderWithProviders(<GoogleSignInButton />, { mocks: [exchange] });
    await user.click(screen.getByRole('button', { name: 'Google answers blank' }));
    expect(exchangeResult).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
  });

  it('says Google sign-in did not go through when Google reports a failure', async () => {
    const { user } = renderWithProviders(<GoogleSignInButton />);
    await user.click(screen.getByRole('button', { name: 'Google fails' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in did not go through. Please try again.');
  });

  it('shows the API’s reason when it refuses the Google account', async () => {
    const refused: MockedResponse = { request: { query: LITE_SIGN_IN_WITH_GOOGLE, variables: { id_token: 'google-id-token' } }, result: { errors: [{ message: 'This account is blocked' }] } };
    const { user } = renderWithProviders(<GoogleSignInButton />, { mocks: [refused] });
    await user.click(screen.getByRole('button', { name: 'Google answers' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This account is blocked');
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
  });

  it('announces errors in an assertive live region', () => {
    renderWithProviders(<GoogleSignInButton />);
    expect(screen.getByTestId('google-sign-in').querySelector('[aria-live="assertive"]')).not.toBeNull();
  });
});
