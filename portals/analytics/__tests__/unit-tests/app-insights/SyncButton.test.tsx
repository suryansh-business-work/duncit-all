import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import SyncButton from '../../../src/pages/app-insights/SyncButton';
import { SYNC_APP_INSIGHTS } from '../../../src/pages/app-insights/queries';
import { byTestId, click, mount, waitUntil } from '../../dom';
import { COPY } from '../../mocks/analytics';
import { integration } from '../../mocks/app-insights';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const renderButton = (mocks: MockedResponse[], store: 'GOOGLE_PLAY' | 'APP_STORE' | null = 'GOOGLE_PLAY', disabled = false) =>
  mount(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <SyncButton store={store} disabled={disabled} />
    </MockedProvider>,
  );

beforeEach(() => {
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('SyncButton', () => {
  it('starts a sync of the tab’s store and says it has started', async () => {
    let asked = false;
    await renderButton([
      {
        request: { query: SYNC_APP_INSIGHTS, variables: { store: 'GOOGLE_PLAY' } },
        result: () => {
          asked = true;
          return { data: { syncAppInsights: [integration({ status: 'SYNCING' })] } };
        },
      },
    ]);
    expect(byTestId('app-insights-sync').textContent).toBe(COPY['analytics.appInsights.sync.now']);
    await click(byTestId('app-insights-sync'));
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalledWith(COPY['analytics.appInsights.sync.started']));
    expect(asked).toBe(true);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('syncs both stores from the Overview (no store argument)', async () => {
    await renderButton(
      [{ request: { query: SYNC_APP_INSIGHTS, variables: { store: null } }, result: { data: { syncAppInsights: [] } } }],
      null
    );
    await click(byTestId('app-insights-sync'));
    await waitUntil(() => expect(notifySuccess).toHaveBeenCalled());
  });

  it('says why the server refused, in its words', async () => {
    await renderButton([
      {
        request: { query: SYNC_APP_INSIGHTS, variables: { store: 'GOOGLE_PLAY' } },
        result: { errors: [new GraphQLError('Nothing to sync: GOOGLE_PLAY synced moments ago; try again in 4 minute(s).')] },
      },
    ]);
    await click(byTestId('app-insights-sync'));
    await waitUntil(() => expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('try again in 4 minute(s)')));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('cannot be pressed while disabled', async () => {
    await renderButton([], 'APP_STORE', true);
    expect(byTestId('app-insights-sync').hasAttribute('disabled')).toBe(true);
  });
});
