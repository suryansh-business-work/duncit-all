import { ApolloClient } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useConfirm, notifySuccess } from '@duncit/dialogs';
import { STORAGE_KEYS } from '../../shared/env';
import { useLiteSession } from '../../shared/session';
import { App } from '../App';
import { useLiteSettings } from '../app/providers/LiteSettingsProvider';
import { useSignInPrompt } from '../app/providers/SignInPromptProvider';
import { meFixture, meMock, seedCache } from './test-utils';

const GSI_SCRIPT = 'script[src^="https://accounts.google.com/gsi/client"]';

/** Reads every context App provides; a missing provider would throw here. */
function Everything() {
  const { site_name: siteName } = useLiteSettings();
  const { signedIn, me } = useLiteSession();
  const { dialogOpen } = useSignInPrompt();
  const confirm = useConfirm();
  return (
    <>
      <p data-testid="site">{siteName}</p>
      <p data-testid="who">{signedIn ? (me?.name ?? 'resolving') : 'visitor'}</p>
      <p data-testid="dialog">{dialogOpen ? 'open' : 'closed'}</p>
      <p data-testid="confirm">{typeof confirm}</p>
      <button type="button" onClick={() => notifySuccess('Saved to your account.')}>
        Save
      </button>
    </>
  );
}

const renderApp = ({ initialToken = null, mocks = [], googleClientId = '' }: { initialToken?: string | null; mocks?: MockedResponse[]; googleClientId?: string } = {}) => {
  const cache = seedCache({ settings: { site_name: 'Lite Events', google_client_id: googleClientId } });
  const client = new ApolloClient({ cache, link: new MockLink(mocks, { defaultOptions: { delay: 0 } }) });
  return render(
    <App client={client} initialToken={initialToken}>
      <Everything />
    </App>,
  );
};

afterEach(() => {
  // Unmount first: Google's provider removes its own script on the way out.
  cleanup();
  for (const script of document.querySelectorAll(GSI_SCRIPT)) script.remove();
  localStorage.clear();
});

describe('App', () => {
  it('gives every page the settings, the session, the sign-in prompt and confirm dialogs', () => {
    renderApp();
    expect(screen.getByTestId('site')).toHaveTextContent('Lite Events');
    expect(screen.getByTestId('who')).toHaveTextContent('visitor');
    expect(screen.getByTestId('dialog')).toHaveTextContent('closed');
    expect(screen.getByTestId('confirm')).toHaveTextContent('function');
  });

  it('shows toasts raised anywhere in the app', async () => {
    renderApp();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Saved to your account.');
  });

  it('starts signed in from the stored token it is handed, and loads the account', async () => {
    // main.tsx hands App the token it read from storage.
    localStorage.setItem(STORAGE_KEYS.token, 'tok-1');
    renderApp({ initialToken: 'tok-1', mocks: [meMock(meFixture({ name: 'Asha Rao' }))] });
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
  });

  it('loads Google sign-in only when the console configured a client id', () => {
    renderApp();
    expect(document.querySelector(GSI_SCRIPT)).toBeNull();
  });

  it('mounts Google sign-in with the configured client id', () => {
    renderApp({ googleClientId: 'client-123.apps.googleusercontent.com' });
    expect(document.querySelector(GSI_SCRIPT)).not.toBeNull();
    expect(screen.getByTestId('site')).toHaveTextContent('Lite Events');
  });
});
