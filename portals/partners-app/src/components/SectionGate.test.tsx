import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import SectionGate from './SectionGate';
import { partnerUser, renderWithProviders } from '../__tests__/render';

afterEach(cleanup);

const flags = (visible: boolean): MockedResponse => ({
  request: { query: PUBLIC_FEATURE_FLAGS, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { publicFeatureFlags: [{ __typename: 'PublicFeatureFlag', key: 'is_product_visible', enabled: visible }] } },
});

const gate = (route: string, roles: string[] | null, visible = true) =>
  renderWithProviders(
    <SectionGate>
      <p data-testid="page">The page</p>
    </SectionGate>,
    { route, path: '*', mocks: [flags(visible)], user: roles ? partnerUser({ roles }) : null },
  );

describe('SectionGate', () => {
  it('opens a page that belongs to no studio for anyone', () => {
    gate('/wallet', null);
    expect(screen.getByTestId('page')).toBeTruthy();
  });

  it('opens a studio page for a user who holds its role', async () => {
    gate('/host/pods', ['USER', 'HOST']);
    expect(await screen.findByTestId('page')).toBeTruthy();
  });

  it('decides nothing while nobody is signed in', () => {
    gate('/host/pods', null);
    expect(screen.queryByTestId('page')).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe('/host/pods');
  });

  it('sends a user without the role back to the landing route', async () => {
    gate('/host/pods', ['USER']);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
  });

  it('keeps the brand area closed while the product flag is off, even for a brand partner', async () => {
    gate('/ecomm-brand', ['USER', 'ECOMM_MANAGER'], false);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
  });

  it('opens the brand area once the product flag is on', async () => {
    gate('/ecomm-brand', ['USER', 'ECOMM_MANAGER'], true);
    expect(await screen.findByTestId('page')).toBeTruthy();
  });
});
