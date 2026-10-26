import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import PartnerLanding from './PartnerLanding';
import { ACTIVE_STUDIO_KEY } from './studio/useActiveStudio';
import { partnerUser, renderWithProviders } from '../__tests__/render';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const flags: MockedResponse = {
  request: { query: PUBLIC_FEATURE_FLAGS, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { publicFeatureFlags: [{ __typename: 'PublicFeatureFlag', key: 'is_product_visible', enabled: true }] } },
};

const land = (roles: string[]) =>
  renderWithProviders(<PartnerLanding />, { route: '/', path: '*', mocks: [flags], user: partnerUser({ roles }) });

describe('PartnerLanding', () => {
  it('waits on a spinner until the product flag has answered', () => {
    land(['USER', 'HOST']);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('waits on a spinner while the signed-in user is still being read', () => {
    renderWithProviders(<PartnerLanding />, { route: '/', path: '*', mocks: [flags], user: null });
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('lands a partner on their studio options page', async () => {
    land(['USER', 'HOST']);
    await waitFor(() => expect(screen.getByTestId('location').textContent).not.toBe('/'));
    expect(screen.getByTestId('location').textContent).toMatch(/^\/host/);
  });

  it('reopens the studio the partner was last in when they hold more than one', async () => {
    localStorage.setItem(ACTIVE_STUDIO_KEY, 'VENUE_OWNER');
    land(['USER', 'HOST', 'VENUE_OWNER']);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toMatch(/^\/venues/));
  });

  it('sends a user with no studio to Earn', async () => {
    land(['USER']);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/earn'));
  });
});
