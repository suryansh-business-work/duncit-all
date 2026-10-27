import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import { ClubsHub, HelpHub, HostPodsHub, HostRequestsHub, VenuePodsHub, VenueRequestsHub, VenuesHub } from './index';
import { renderWithProviders } from '../../__tests__/render';

const { stub } = vi.hoisted(() => ({ stub: (name: string) => () => <p>{name}</p> }));
vi.mock('../host-pods-page/HostPodsPage', () => ({ default: stub('Host pods page') }));
vi.mock('../host-auto-pods-page/HostAutoPodsPage', () => ({ default: stub('Host auto pods page') }));
vi.mock('../pod-requests/PodRequestsPage', () => ({ default: ({ side }: { side: string }) => <p>{`Pod requests ${side}`}</p> }));
vi.mock('../change-requests-page', () => ({ default: ({ role }: { role: string }) => <p>{`Change requests ${role}`}</p> }));
vi.mock('../venue-listings-page/VenueListingsPage', () => ({ default: stub('Venue listings page') }));
vi.mock('../venue-settings-page/VenueSettingsPage', () => ({ default: stub('Venue settings page') }));
vi.mock('../venue-pods-page/VenuePodsPage', () => ({ default: stub('Venue pods page') }));
vi.mock('../club-admin-clubs-page/ClubAdminClubsPage', () => ({ default: stub('Clubs page') }));
vi.mock('../club-admin-auto-pods-page/ClubAdminAutoPodsPage', () => ({ default: stub('Club auto pods page') }));
vi.mock('../club-admin-monitoring-page/ClubAdminPodMonitoringPage', () => ({ default: stub('Monitoring page') }));
vi.mock('../PartnerFaqsPage', () => ({ default: stub('Faqs page') }));
vi.mock('../support-page/SupportPage', () => ({ default: stub('Support page') }));
vi.mock('../policies-page/PartnerPoliciesPage', () => ({ default: stub('Policies page') }));
vi.mock('../venue-auto-pods-page/VenueAutoPodsPage', () => ({ default: stub('Venue auto pods page') }));

afterEach(cleanup);

const flags = (autoPods: boolean): MockedResponse => ({
  request: { query: PUBLIC_FEATURE_FLAGS, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { publicFeatureFlags: [{ __typename: 'PublicFeatureFlag', key: 'auto_pods', enabled: autoPods }] } },
});

const open = (hub: ReactElement, route: string, autoPods = false) =>
  renderWithProviders(hub, { route, path: '*', mocks: [flags(autoPods)] });

describe('studio hubs', () => {
  it('Host Pods hub opens Your Pods and adds Auto Pods once the flag is on', async () => {
    open(<HostPodsHub />, '/host/pods', true);
    expect(screen.getByText('Host pods page')).toBeTruthy();
    expect(await screen.findByRole('tab', { name: 'Auto Pods' })).toBeTruthy();
  });

  it('Host Pods hub is a single page, with no tabs, while Auto Pods is off', async () => {
    open(<HostPodsHub />, '/host/pods', false);
    expect(await screen.findByText('Host pods page')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('Host Pods hub opens Auto Pods on its own route', async () => {
    open(<HostPodsHub />, '/host/auto-pods', true);
    expect(await screen.findByText('Host auto pods page')).toBeTruthy();
  });

  it('Host Requests hub holds the pod and change requests for the host side', () => {
    open(<HostRequestsHub />, '/host/change-requests');
    expect(screen.getByText('Change requests HOST')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('Venues hub holds Venue Management and Settings', () => {
    open(<VenuesHub />, '/venues/settings');
    expect(screen.getByText('Venue settings page')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('Venue Pods hub is the one page of pods at the venues', () => {
    open(<VenuePodsHub />, '/venues/pods');
    expect(screen.getByText('Venue pods page')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('Venue Requests hub holds two tabs, three once Auto Pods is on', async () => {
    open(<VenueRequestsHub />, '/venues/pod-requests', true);
    expect(screen.getByText('Pod requests VENUE')).toBeTruthy();
    expect(await screen.findByRole('tab', { name: 'Auto Pods' })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('Venue Requests hub has no Auto Pods tab while the flag is off', () => {
    open(<VenueRequestsHub />, '/venues/change-requests', false);
    expect(screen.queryByRole('tab', { name: 'Auto Pods' })).toBeNull();
    expect(screen.getByText('Change requests VENUE')).toBeTruthy();
  });

  it('Clubs hub holds Clubs and Pod Monitoring, with Auto Pods between them once the flag is on', async () => {
    open(<ClubsHub />, '/club-admin/monitoring', true);
    expect(screen.getByText('Monitoring page')).toBeTruthy();
    await screen.findByRole('tab', { name: 'Auto Pods' });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('Clubs hub leaves Auto Pods out while the flag is off', () => {
    open(<ClubsHub />, '/club-admin/clubs', false);
    expect(screen.getByText('Clubs page')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('Help hub opens the page its route names among FAQs, Support and Policies', () => {
    open(<HelpHub />, '/support');
    expect(screen.getByText('Support page')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
