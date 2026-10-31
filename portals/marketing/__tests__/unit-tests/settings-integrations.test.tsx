import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { ReactNode } from 'react';
import { renderWithProviders } from '../testkit';

// The Tech console's editor and its emailed-code gate are that console's own
// (and covered there); here they are probes that show what they were handed.
vi.mock('../../../tech/src/pages/environment/access-gate', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="env-gate">{children}</div>,
}));
vi.mock('../../../tech/src/pages/environment/EnvVariablesTab', () => ({
  default: ({ category }: { category: string }) => <div data-testid="env-tab">{category}</div>,
}));

import IntegrationsPage from '../../src/pages/settings-page/IntegrationsPage';
import RedirectUrlCard from '../../src/pages/settings-page/RedirectUrlCard';
import { INTEGRATION_TABS, integrationTabFor } from '../../src/pages/settings-page/integrations-tabs';
import { SOCIAL_REDIRECT_URI } from '../../src/pages/settings-page/queries';
import { INTEGRATIONS_PATH, integrationsPath } from '../../src/lib/routes';

const CALLBACK = 'https://api.duncit.test/social/callback';
const redirectMock = { request: { query: SOCIAL_REDIRECT_URI }, result: { data: { socialRedirectUri: CALLBACK } } };
const redirectErrorMock = { request: { query: SOCIAL_REDIRECT_URI }, result: { errors: [new GraphQLError('no server url')] } };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('integrations tabs', () => {
  it('lists one tab per social app, then search, then Claude', () => {
    expect(INTEGRATION_TABS.map((tab) => tab.category)).toEqual([
      'SOCIAL_INSTAGRAM',
      'SOCIAL_FACEBOOK',
      'SOCIAL_THREADS',
      'SOCIAL_YOUTUBE',
      'SOCIAL_LINKEDIN',
      'SOCIAL_X',
      'SERPER',
      'ANTHROPIC',
    ]);
    expect(INTEGRATION_TABS.filter((tab) => tab.social).map((tab) => tab.category)).toEqual(
      INTEGRATION_TABS.slice(0, 6).map((tab) => tab.category),
    );
  });

  it('falls back to the first tab for an address naming no tab', () => {
    expect(integrationTabFor('SERPER').category).toBe('SERPER');
    expect(integrationTabFor('NOPE').category).toBe('SOCIAL_INSTAGRAM');
  });

  it('builds the link a page uses to open one network’s tab', () => {
    expect(integrationsPath('SOCIAL_THREADS')).toBe(`${INTEGRATIONS_PATH}?selectedtab=SOCIAL_THREADS`);
    expect(integrationsPath(null)).toBe(INTEGRATIONS_PATH);
    expect(integrationsPath()).toBe(INTEGRATIONS_PATH);
  });
});

describe('IntegrationsPage', () => {
  it('opens on Instagram with its hint, the redirect URL and the Instagram entries behind the gate', async () => {
    renderWithProviders(<IntegrationsPage />, { mocks: [redirectMock] });
    expect(screen.getByRole('heading', { level: 1, name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(8);
    expect(screen.getByTestId('integration-hint')).toHaveTextContent(/Instagram API with Instagram Login/);
    expect(screen.getByTestId('env-gate')).toBeInTheDocument();
    expect(screen.getByTestId('env-tab')).toHaveTextContent('SOCIAL_INSTAGRAM');
    await waitFor(() => expect(screen.getByTestId('redirect-url-field')).toHaveValue(CALLBACK));
  });

  it('opens the tab the address names, and a non-social tab has no redirect card', () => {
    renderWithProviders(<IntegrationsPage />, { mocks: [], initialEntries: ['/settings/integrations?selectedtab=ANTHROPIC'] });
    expect(screen.getByRole('tab', { name: 'Claude (Anthropic)', selected: true })).toBeInTheDocument();
    expect(screen.getByTestId('integration-hint')).toHaveTextContent(/claude-/);
    expect(screen.getByTestId('env-tab')).toHaveTextContent('ANTHROPIC');
    expect(screen.queryByTestId('redirect-url-field')).not.toBeInTheDocument();
  });

  it('switches the editor to the network whose tab is pressed', () => {
    renderWithProviders(<IntegrationsPage />, { mocks: [redirectMock] });
    fireEvent.click(screen.getByRole('tab', { name: 'Threads' }));
    expect(screen.getByTestId('env-tab')).toHaveTextContent('SOCIAL_THREADS');
    expect(screen.getByTestId('integration-hint')).toHaveTextContent(/threads_content_publish/);
  });
});

describe('RedirectUrlCard', () => {
  it('copies the URL and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderWithProviders(<RedirectUrlCard />, { mocks: [redirectMock] });
    const copy = screen.getByTestId('redirect-url-copy');
    expect(copy).toBeDisabled();
    await waitFor(() => expect(copy).toBeEnabled());
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveTextContent('Copied'));
    expect(writeText).toHaveBeenCalledWith(CALLBACK);
  });

  it('keeps offering Copy when the clipboard is refused', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    renderWithProviders(<RedirectUrlCard />, { mocks: [redirectMock] });
    const copy = screen.getByTestId('redirect-url-copy');
    await waitFor(() => expect(copy).toBeEnabled());
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveTextContent('Copy'));
    expect(screen.getByTestId('redirect-url-field')).toHaveValue(CALLBACK);
  });

  it('says when the URL could not be read', async () => {
    renderWithProviders(<RedirectUrlCard />, { mocks: [redirectErrorMock] });
    await waitFor(() => expect(screen.getByTestId('redirect-url-error')).toBeInTheDocument());
    expect(screen.queryByTestId('redirect-url-field')).not.toBeInTheDocument();
  });
});
