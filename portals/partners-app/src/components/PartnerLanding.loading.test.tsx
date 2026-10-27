import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import PartnerLanding from './PartnerLanding';
import { renderWithProviders } from '../__tests__/render';

vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUserData: () => ({ user: null, loading: true }),
}));

afterEach(cleanup);

const flags: MockedResponse = {
  request: { query: PUBLIC_FEATURE_FLAGS, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { publicFeatureFlags: [{ __typename: 'PublicFeatureFlag', key: 'is_product_visible', enabled: true }] } },
};

describe('PartnerLanding while the user is loading', () => {
  it('keeps the spinner and does not redirect, even once the product flag has answered', async () => {
    renderWithProviders(<PartnerLanding />, { route: '/', path: '*', mocks: [flags] });
    // Let the flag query settle: the spinner must be held by the user alone.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeTruthy());
    expect(screen.getByTestId('location').textContent).toBe('/');
  });
});
