import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import WelcomePage from '../../src/pages/WelcomePage';
import { renderWithProviders } from '../testkit';
import { dashboardMocks, dashboardWithProductsError } from '../mocks/dashboard.mock';

const userMock = vi.hoisted(() => ({ value: {} as { user: unknown } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userMock.value,
}));

afterEach(() => {
  userMock.value = { user: null };
});

describe('WelcomePage dashboard', () => {
  it('greets the user by first name and shows the loading bar first', () => {
    userMock.value = { user: { first_name: 'Asha', full_name: 'Asha Rao' } };
    const { container } = renderWithProviders(<WelcomePage />, { mocks: dashboardMocks() });
    expect(screen.getByText(/Hi Asha/)).toBeInTheDocument();
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('falls back to the full name when there is no first name', () => {
    userMock.value = { user: { first_name: '', full_name: 'Asha Rao' } };
    renderWithProviders(<WelcomePage />, { mocks: dashboardMocks() });
    expect(screen.getByText(/Hi Asha Rao/)).toBeInTheDocument();
  });

  it('falls back to "there" when there is no user', () => {
    userMock.value = { user: null };
    renderWithProviders(<WelcomePage />, { mocks: dashboardMocks() });
    expect(screen.getByText(/Hi there/)).toBeInTheDocument();
  });

  it('aggregates the three lists into KPI tiles once loaded', async () => {
    renderWithProviders(<WelcomePage />, { mocks: dashboardMocks() });
    // The three queries resolve independently; wait until every KPI is present.
    // 1 order to fulfil (PENDING), 1 out of stock, 1 low stock, 1 brand live.
    await waitFor(() => {
      expect(screen.getByText('1 orders to fulfil')).toBeInTheDocument();
      expect(screen.getByText('1 out of stock')).toBeInTheDocument();
      expect(screen.getByText('1 low stock')).toBeInTheDocument();
      expect(screen.getByText('1 brands live')).toBeInTheDocument();
    });
    // Two products in the catalogue.
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('surfaces a query error', async () => {
    renderWithProviders(<WelcomePage />, { mocks: dashboardWithProductsError() });
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });
});
