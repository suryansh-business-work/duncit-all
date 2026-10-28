import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LITE_SETTINGS } from '../../../../shared/graphql/documents';
import { LiteSettingsProvider, useLiteSettings } from '../../../app/providers/LiteSettingsProvider';
import { settingsFixture } from '../../test-utils';

function SiteName() {
  const { site_name: siteName, support_email: supportEmail } = useLiteSettings();
  return (
    <p data-testid="probe">
      {siteName} · {supportEmail}
    </p>
  );
}

/** Counts its own mounts, and resets the store the way sign-in and sign-out do. */
function ResetProbe({ onMount }: Readonly<{ onMount: () => void }>) {
  const client = useApolloClient();
  useEffect(() => onMount(), [onMount]);
  return (
    <button type="button" onClick={() => client.resetStore()}>
      Reset store
    </button>
  );
}

const renderProvider = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
      <LiteSettingsProvider>
        <SiteName />
      </LiteSettingsProvider>
    </MockedProvider>,
  );

describe('LiteSettingsProvider', () => {
  it('holds the page behind an announced loader until the settings arrive, then hands them to every page', async () => {
    renderProvider([{ request: { query: LITE_SETTINGS }, result: { data: { liteSettings: settingsFixture({ site_name: 'Lite Events', support_email: 'hi@lite.example' }) } } }]);

    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument();

    expect(await screen.findByTestId('probe')).toHaveTextContent('Lite Events · hi@lite.example');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it("shows the API's reason, as an alert, when the settings cannot load", async () => {
    renderProvider([{ request: { query: LITE_SETTINGS }, result: { errors: [{ message: 'Settings are being updated' }] } }]);

    const alert = await screen.findByTestId('settings-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('Settings are being updated');
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument();
  });

  it('keeps the app mounted on the last settings while a store reset refetches them', async () => {
    const user = userEvent.setup();
    const onMount = vi.fn();
    const answer: MockedResponse = { request: { query: LITE_SETTINGS }, result: { data: { liteSettings: settingsFixture({ site_name: 'Lite Events' }) } } };
    render(
      <MockedProvider mocks={[answer, answer]} mockLinkDefaultOptions={{ delay: 0 }}>
        <LiteSettingsProvider>
          <ResetProbe onMount={onMount} />
          <SiteName />
        </LiteSettingsProvider>
      </MockedProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Reset store' }));
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(onMount).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('probe')).toHaveTextContent('Lite Events');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the plain network failure message when the API cannot be reached', async () => {
    renderProvider([{ request: { query: LITE_SETTINGS }, error: new Error('Failed to fetch') }]);
    expect(await screen.findByTestId('settings-error')).toHaveTextContent('Unable to connect to server. Please check your internet connection and try again.');
  });
});

describe('useLiteSettings', () => {
  it('refuses to run outside the provider, naming what is missing', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useLiteSettings())).toThrow('useLiteSettings needs a LiteSettingsProvider');
    quiet.mockRestore();
  });
});
