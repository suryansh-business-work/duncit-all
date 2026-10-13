import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';

const dialogs = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogs.notify,
}));

// The tabs, composer and drawer have their own suites; here only the page's
// wiring between them is under test, so each is a stub exposing its props.
vi.mock('../../src/pages/social-accounts-page/accounts/AccountsTab', () => ({
  default: (props: { accounts: Array<{ id: string }>; providers: Array<{ provider: string }>; returnTo: string }) => (
    <div data-testid="tab-accounts">
      {props.accounts.length} accounts / {props.providers.length} providers / {props.returnTo}
    </div>
  ),
}));
vi.mock('../../src/pages/social-accounts-page/publish/PublishTab', () => ({
  default: (props: { onCompose: (r: { text: string }) => void; onOpenPost: (id: string) => void }) => (
    <div data-testid="tab-publish">
      <button onClick={() => props.onCompose({ text: 'draft' })}>compose</button>
      <button onClick={() => props.onOpenPost('p9')}>open-post</button>
    </div>
  ),
}));
vi.mock('../../src/pages/social-accounts-page/posts/PostsTab', () => ({
  default: () => <div data-testid="tab-posts" />,
}));
vi.mock('../../src/pages/social-accounts-page/analytics/AnalyticsTab', () => ({
  default: () => <div data-testid="tab-analytics" />,
}));
vi.mock('../../src/pages/social-accounts-page/monitoring/MonitoringTab', () => ({
  default: () => <div data-testid="tab-monitoring" />,
}));
vi.mock('../../src/pages/social-accounts-page/ideas/IdeasTab', () => ({
  default: (props: { onUse: (idea: unknown) => void }) => (
    <button
      onClick={() =>
        props.onUse({ id: 'i1', caption: 'Run club', hashtags: ['run', 'club'] })
      }
    >
      use-idea
    </button>
  ),
}));
vi.mock('../../src/pages/social-accounts-page/publish/ComposerDialog', () => ({
  default: (props: { request: { text: string; idea_id?: string } | null; onClose: () => void }) =>
    props.request ? (
      <div data-testid="composer">
        {JSON.stringify(props.request)}
        <button onClick={props.onClose}>close-composer</button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/social-accounts-page/posts/PostDetailDrawer', () => ({
  default: (props: { postId: string | null; onClose: () => void }) =>
    props.postId ? (
      <div data-testid="drawer">
        {props.postId}
        <button onClick={props.onClose}>close-drawer</button>
      </div>
    ) : null,
}));

import SocialAccountsPage from '../../src/pages/social-accounts-page/SocialAccountsPage';
import { useConnectResult } from '../../src/pages/social-accounts-page/useConnectResult';
import { SOCIAL_SETUP } from '../../src/pages/social-accounts-page/queries';

afterEach(() => {
  vi.clearAllMocks();
});

const setupMock = (accounts = [makeSocialAccount()]): MockedResponse => ({
  request: { query: SOCIAL_SETUP },
  result: {
    data: {
      socialProviders: [
        { __typename: 'SocialProviderStatus', provider: 'LINKEDIN', configured: true },
        { __typename: 'SocialProviderStatus', provider: 'X', configured: false },
      ],
      socialAccounts: accounts.map((a) => ({ __typename: 'SocialAccount', ...a })),
    },
  },
});

describe('SocialAccountsPage', () => {
  it('starts on the accounts tab, with a progress bar until the setup loads', async () => {
    renderWithProviders(<SocialAccountsPage />, { mocks: [setupMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('1 accounts / 2 providers / ACCOUNTS')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('social-accounts-page')).toBeInTheDocument();
  });

  it('announces a connection on arrival and survives the refresh failing', async () => {
    renderWithProviders(<SocialAccountsPage />, {
      mocks: [setupMock()],
      initialEntries: ['/?connected=LINKEDIN&count=1'],
    });
    await waitFor(() => expect(dialogs.notify).toHaveBeenCalledWith('LinkedIn connected — 1 account added.', 'success'));
    expect(await screen.findByTestId('social-accounts-page')).toBeInTheDocument();
  });

  it('shows the API error instead of hiding a failed setup', async () => {
    renderWithProviders(<SocialAccountsPage />, {
      mocks: [{ request: { query: SOCIAL_SETUP }, result: { errors: [new GraphQLError('Setup exploded')] } }],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Setup exploded');
  });

  it('opens the tab named in the URL and switches tabs by pressing them', async () => {
    renderWithProviders(<SocialAccountsPage />, { mocks: [setupMock()], initialEntries: ['/?selectedtab=posts'] });
    expect(await screen.findByTestId('tab-posts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Analytics' }));
    expect(await screen.findByTestId('tab-analytics')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Monitoring' }));
    expect(await screen.findByTestId('tab-monitoring')).toBeInTheDocument();
  });

  it('turns a picked idea into a composer request with its hashtags', async () => {
    renderWithProviders(<SocialAccountsPage />, { mocks: [setupMock()], initialEntries: ['/?selectedtab=ideas'] });
    fireEvent.click(await screen.findByText('use-idea'));
    const composer = await screen.findByTestId('composer');
    expect(JSON.parse(composer.textContent?.replace('close-composer', '') ?? '')).toEqual({
      text: 'Run club\n\n#run #club',
      idea_id: 'i1',
    });
    fireEvent.click(screen.getByText('close-composer'));
    expect(screen.queryByTestId('composer')).not.toBeInTheDocument();
  });

  it('opens a composer from the publish tab and a post drawer, and closes both', async () => {
    renderWithProviders(<SocialAccountsPage />, { mocks: [setupMock()], initialEntries: ['/?selectedtab=publish'] });
    fireEvent.click(await screen.findByText('compose'));
    expect(await screen.findByTestId('composer')).toHaveTextContent('"text":"draft"');
    fireEvent.click(screen.getByText('open-post'));
    expect(await screen.findByTestId('drawer')).toHaveTextContent('p9');
    fireEvent.click(screen.getByText('close-drawer'));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });
});

describe('useConnectResult', () => {
  function Where({ children }: Readonly<{ children: ReactNode }>) {
    const location = useLocation();
    return (
      <>
        <output data-testid="search">{location.search}</output>
        {children}
      </>
    );
  }

  const run = (search: string, onConnected = vi.fn()) => {
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <MockedProvider mocks={[]}>
        <MemoryRouter initialEntries={[`/${search}`]}>
          <Where>{children}</Where>
        </MemoryRouter>
      </MockedProvider>
    );
    renderHook(() => useConnectResult(onConnected), { wrapper });
    return onConnected;
  };

  const lastToast = () => dialogs.notify.mock.calls.at(-1);

  it('announces a successful connection once, refreshes and clears the query string', async () => {
    const onConnected = run('?connected=LINKEDIN&count=2&keep=1');
    await waitFor(() => expect(onConnected).toHaveBeenCalledTimes(1));
    expect(lastToast()).toEqual(['LinkedIn connected — 2 accounts added.', 'success']);
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?keep=1'));
  });

  it('warns when the network connected but returned no account', async () => {
    const onConnected = run('?connected=META&count=0');
    await waitFor(() => expect(onConnected).toHaveBeenCalledTimes(1));
    expect(lastToast()?.[1]).toBe('warning');
    expect(lastToast()?.[0]).toContain('no account came back');
  });

  it('treats a missing count as none found', async () => {
    run('?connected=X');
    await waitFor(() => expect(dialogs.notify).toHaveBeenCalledTimes(1));
    expect(lastToast()?.[1]).toBe('warning');
  });

  it.each(['access_denied', 'user_cancelled_authorize', 'user_cancelled_login'])(
    'says the connection was cancelled for %s without refreshing',
    async (reason) => {
      const onConnected = run(`?social_error=${reason}`);
      await waitFor(() => expect(dialogs.notify).toHaveBeenCalledTimes(1));
      expect(lastToast()).toEqual(['Connection cancelled.', 'info']);
      expect(onConnected).not.toHaveBeenCalled();
    }
  );

  it('reports any other failure with its reason', async () => {
    const onConnected = run('?social_error=server_error');
    await waitFor(() => expect(dialogs.notify).toHaveBeenCalledTimes(1));
    expect(lastToast()).toEqual(['Could not connect: server_error', 'error']);
    expect(onConnected).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
  });

  it('ignores an unknown provider name rather than announcing it', async () => {
    const onConnected = run('?connected=MYSPACE&count=3');
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
    expect(dialogs.notify).not.toHaveBeenCalled();
    expect(onConnected).not.toHaveBeenCalled();
  });

  it('does nothing when the URL carries no result', () => {
    const onConnected = run('?tab=posts');
    expect(dialogs.notify).not.toHaveBeenCalled();
    expect(onConnected).not.toHaveBeenCalled();
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=posts');
  });
});
