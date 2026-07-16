import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../../src/pages/website';
import { renderWithProviders } from '../testkit';
import { dashboardEmptyMocks, dashboardMocks } from '../mocks';

const userMock = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: userMock.value }),
}));

afterEach(() => {
  userMock.value = null;
});

describe('DashboardPage', () => {
  it('counts content by type and submissions, greeting by first name', async () => {
    userMock.value = { first_name: 'Sam', full_name: 'Sam Fuller' };
    renderWithProviders(<DashboardPage />, { mocks: dashboardMocks() });
    expect(await screen.findByText(/Hi Sam, welcome back/)).toBeInTheDocument();
    // Career=1, Newsroom=1, Blog=2, Newsletter total=2 (1 active), Contact=2 (1 new), FAQ=2 (1 new)
    await waitFor(() => expect(screen.getByText('1 active')).toBeInTheDocument());
    // Contact + FAQ both show "1 new".
    expect(screen.getAllByText('1 new')).toHaveLength(2);
  });

  it('falls back to full_name when there is no first name', async () => {
    userMock.value = { full_name: 'Full Only' };
    renderWithProviders(<DashboardPage />, { mocks: dashboardMocks() });
    expect(await screen.findByText(/Hi Full Only, welcome back/)).toBeInTheDocument();
  });

  it('greets "there" and shows zero counts when data is absent', async () => {
    userMock.value = null;
    renderWithProviders(<DashboardPage />, { mocks: dashboardEmptyMocks() });
    expect(await screen.findByText(/Hi there, welcome back/)).toBeInTheDocument();
    // With empty lists the `?? []` fallbacks yield "0 active"/"0 new".
    await waitFor(() => expect(screen.getByText('0 active')).toBeInTheDocument());
    expect(screen.getAllByText('0 new')).toHaveLength(2);
  });
});
