import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../../src/App';
import { setToken, clearToken } from '../../src/lib/session';
import { renderWithProviders } from '../testkit';

const flag = vi.hoisted(() => ({ value: true }));
vi.mock('@duncit/app-settings', () => ({
  useFeatureFlag: () => flag.value,
}));

vi.mock('../../src/components/AppShell', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('../../src/pages/LoginPage', () => ({ default: () => <div>LOGIN PAGE</div> }));
vi.mock('../../src/pages/WelcomePage', () => ({ default: () => <div>WELCOME PAGE</div> }));
vi.mock('../../src/pages/inventory-page/InventoryPage', () => ({
  default: () => <div>INVENTORY PAGE</div>,
}));
vi.mock('../../src/pages/inventory-page/inventory-product-page/InventoryProductPage', () => ({
  default: () => <div>PRODUCT PAGE</div>,
}));
vi.mock('../../src/pages/ecomm/EcommRequestsPage', () => ({ default: () => <div>REQUESTS PAGE</div> }));
vi.mock('../../src/pages/ecomm/EcommMarketplacePage', () => ({ default: () => <div>BRANDS PAGE</div> }));
vi.mock('../../src/pages/ecomm/EcommBrandDetailPage', () => ({ default: () => <div>BRAND DETAIL</div> }));
vi.mock('../../src/pages/ecomm/ecomm-requests/BrandRequestPage', () => ({
  default: () => <div>BRAND REQUEST</div>,
}));
vi.mock('../../src/pages/ecomm/ecomm-requests/ProductRequestPage', () => ({
  default: () => <div>PRODUCT REQUEST</div>,
}));
vi.mock('../../src/pages/orders/ProductOrdersPage', () => ({ default: () => <div>ORDERS PAGE</div> }));
vi.mock('../../src/pages/orders/ProductOrderDetailPage', () => ({
  default: () => <div>ORDER DETAIL</div>,
}));
vi.mock('../../src/pages/settings/DuncitWarehousesPage', () => ({
  default: () => <div>WAREHOUSES PAGE</div>,
}));
vi.mock('../../src/pages/warehouse-approval', () => ({
  default: () => <div>WAREHOUSE APPROVAL PAGE</div>,
}));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  ProfilePage: () => <div>PROFILE PAGE</div>,
}));

afterEach(() => {
  clearToken();
  flag.value = true;
});

describe('App routing', () => {
  it('redirects unauthenticated visitors to the login page', () => {
    renderWithProviders(<App />, { initialEntries: ['/inventory'] });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('renders the welcome page inside the shell when authenticated', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/'] });
    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByText('WELCOME PAGE')).toBeInTheDocument();
  });

  it('renders a product route when the feature flag is on', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/inventory'] });
    expect(screen.getByText('INVENTORY PAGE')).toBeInTheDocument();
  });

  it('redirects product routes home when the feature flag is off', () => {
    flag.value = false;
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/orders'] });
    expect(screen.getByText('WELCOME PAGE')).toBeInTheDocument();
    expect(screen.queryByText('ORDERS PAGE')).not.toBeInTheDocument();
  });

  it('renders the Duncit warehouses settings route when authenticated', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/settings/warehouses'] });
    expect(screen.getByText('WAREHOUSES PAGE')).toBeInTheDocument();
  });

  it('renders the warehouse approval route when authenticated', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/warehouse-approval'] });
    expect(screen.getByText('WAREHOUSE APPROVAL PAGE')).toBeInTheDocument();
  });

  it('renders the shared profile page behind auth', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/profile'] });
    expect(screen.getByText('PROFILE PAGE')).toBeInTheDocument();
  });

  it('shows the login route directly without auth', () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('redirects unknown routes to the welcome page', () => {
    setToken('tok');
    renderWithProviders(<App />, { initialEntries: ['/nope'] });
    expect(screen.getByText('WELCOME PAGE')).toBeInTheDocument();
  });
});
