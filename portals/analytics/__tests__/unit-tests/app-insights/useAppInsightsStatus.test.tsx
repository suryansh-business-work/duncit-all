import { describe, expect, it, vi } from 'vitest';
import { useApolloClient } from '@apollo/client/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { act } from 'react';
import { isSyncing, useAppInsightsStatus } from '../../../src/pages/app-insights/useAppInsightsStatus';
import { APP_INSIGHTS_QUERIES } from '../../../src/pages/app-insights/queries';
import { byTestId, mount, waitUntil } from '../../dom';
import { disconnectedApple, integration, statusMock } from '../../mocks/app-insights';

describe('isSyncing', () => {
  it('is true while any store syncs', () => {
    expect(isSyncing([integration(), integration({ store: 'APP_STORE', status: 'SYNCING' })])).toBe(true);
    expect(isSyncing([integration(), disconnectedApple()])).toBe(false);
    expect(isSyncing([])).toBe(false);
  });
});

describe('useAppInsightsStatus', () => {
  it('reads both stores, and refreshes the page’s data the moment the last sync finishes', async () => {
    const hook: { current: ReturnType<typeof useAppInsightsStatus> | null } = { current: null };
    const refetchQueries = vi.fn().mockResolvedValue([]);
    function Harness() {
      const client = useApolloClient();
      client.refetchQueries = refetchQueries;
      hook.current = useAppInsightsStatus();
      const play = hook.current.byStore('GOOGLE_PLAY');
      return <span data-testid="state">{`${play?.status ?? 'none'}|${String(hook.current.syncing)}`}</span>;
    }

    await mount(
      <MockedProvider
        mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          statusMock([integration({ status: 'SYNCING' }), disconnectedApple()]),
          statusMock([integration({ status: 'CONNECTED' }), disconnectedApple()]),
        ]}
      >
        <Harness />
      </MockedProvider>,
    );

    await waitUntil(() => expect(byTestId('state').textContent).toBe('SYNCING|true'));
    expect(refetchQueries).not.toHaveBeenCalled();
    expect(hook.current?.byStore('APP_STORE')?.status).toBe('DISCONNECTED');

    await act(async () => {
      await hook.current?.refetch();
    });
    await waitUntil(() => expect(byTestId('state').textContent).toBe('CONNECTED|false'));
    expect(refetchQueries).toHaveBeenCalledWith({ include: APP_INSIGHTS_QUERIES });
  });
});
