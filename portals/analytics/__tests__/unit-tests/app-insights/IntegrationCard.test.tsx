import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import IntegrationCard from '../../../src/pages/app-insights/IntegrationCard';
import ConfigurationRequired from '../../../src/pages/app-insights/ConfigurationRequired';
import StatusChip from '../../../src/pages/app-insights/StatusChip';
import { byTestId, mount, queryTestId } from '../../dom';
import { COPY } from '../../mocks/analytics';
import { disconnectedApple, integration } from '../../mocks/app-insights';

describe('StatusChip', () => {
  it.each([
    ['CONNECTED', 'analytics.appInsights.status.connected'],
    ['DISCONNECTED', 'analytics.appInsights.status.disconnected'],
    ['SYNCING', 'analytics.appInsights.status.syncing'],
    ['ERROR', 'analytics.appInsights.status.error'],
    ['PENDING', 'analytics.appInsights.status.pending'],
  ] as const)('names %s in words, with an icon, never by colour alone', async (status, key) => {
    await mount(<StatusChip status={status} testId="chip" />);
    expect(byTestId('chip').textContent).toBe(COPY[key]);
    expect(byTestId('chip').querySelector('svg')).not.toBeNull();
  });
});

// The card formats its dates with the admin's date settings (useDateFormat),
// which it reads through Apollo; with no settings answered it uses the defaults.
const mountCard = (ui: ReactElement) => mount(<MockedProvider mocks={[]}>{ui}</MockedProvider>);

describe('IntegrationCard', () => {
  it('names the store, its status, the last successful sync and the days held', async () => {
    await mountCard(<IntegrationCard integration={integration()} />);
    const card = byTestId('app-insights-integration-google-play');
    expect(card.textContent).toContain(COPY['analytics.appInsights.store.googlePlay']);
    expect(card.textContent).toContain(COPY['analytics.appInsights.lastSync'].replace(' {when}', ''));
    expect(card.textContent).toContain(COPY['analytics.appInsights.coverage'].split(' {from}')[0]);
    expect(card.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('says it has never synced and holds no data yet', async () => {
    await mountCard(<IntegrationCard integration={disconnectedApple()} />);
    const card = byTestId('app-insights-integration-app-store');
    expect(card.textContent).toContain(COPY['analytics.appInsights.neverSynced']);
    expect(card.textContent).toContain(COPY['analytics.appInsights.noData']);
  });

  it('announces the store’s reason after a failed sync', async () => {
    await mountCard(<IntegrationCard integration={integration({ status: 'ERROR', last_error: 'HTTP 403: denied' })} />);
    expect(byTestId('app-insights-integration-google-play').querySelector('[role="status"]')?.textContent).toBe(
      'HTTP 403: denied'
    );
  });
});

describe('ConfigurationRequired', () => {
  it('lists each missing setting in words, the problem with one that is set, and links to where to fix it', async () => {
    await mount(
      <ConfigurationRequired
        integrations={[
          disconnectedApple(),
          integration({ configured: false, status: 'DISCONNECTED', missing: [], problem: 'The service account key is not valid JSON.' }),
        ]}
      />,
    );
    const apple = byTestId('app-insights-config-app-store');
    expect(apple.textContent).toContain(COPY['analytics.appInsights.field.keyId']);
    expect(apple.textContent).toContain(COPY['analytics.appInsights.field.privateKey']);
    expect(apple.querySelector('a')?.getAttribute('target')).toBe('_blank');
    const play = byTestId('app-insights-config-google-play');
    expect(play.textContent).toContain('The service account key is not valid JSON.');
    expect(play.querySelector('ul')).toBeNull();
  });

  it('offers no link when the server has none for this environment', async () => {
    await mount(<ConfigurationRequired integrations={[disconnectedApple({ setup_url: null })]} />);
    expect(byTestId('app-insights-config-app-store').querySelector('a')).toBeNull();
    expect(queryTestId('app-insights-config-required')).not.toBeNull();
  });
});
