import type { JSX } from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import AppRoutes from '../AppRoutes';

// Bypass the real auth guards so route elements render directly.
vi.mock('../AuthGuards', () => ({
  RequireAuth: ({ children }: { children: JSX.Element }) => children,
  RedirectIfAuthed: ({ children }: { children: JSX.Element }) => children,
}));

// Stub the lazy-loaded pages we navigate to with lightweight components.
vi.mock('../../pages/HomePage', () => ({
  default: (props: { superCategorySlug: string; locationId: string; zoneName: string }) => (
    <div>
      HomePage:{props.superCategorySlug}:{props.locationId}:{props.zoneName}
    </div>
  ),
}));
vi.mock('../../pages/LoginPage', () => ({ default: () => <div>LoginPageStub</div> }));
vi.mock('../../pages/shop-page', () => ({ default: () => <div>ShopPageStub</div> }));
vi.mock('../../pages/NotFoundPage', () => ({ default: () => <div>NotFoundStub</div> }));
vi.mock('../../pages/support-hub', () => ({
  SupportHubPage: () => <div>SupportHubStub</div>,
  SosPage: () => <div>SosStub</div>,
  CallbackPage: () => <div>CallbackStub</div>,
  SupportTicketsPage: () => <div>SupportTicketsStub</div>,
  LiveTicketsPage: () => <div>LiveTicketsStub</div>,
  AllTicketsPage: () => <div>AllTicketsStub</div>,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
}

const props = { superCategory: 'nightlife', locationId: 'loc-1', zoneName: 'Zone A' };

/** The product routes read the `is_product_visible` system flag before they
 * render anything — see RequireProducts. */
const flagsMock = (enabled: boolean) => ({
  request: { query: PUBLIC_FEATURE_FLAGS },
  result: { data: { publicFeatureFlags: [{ key: 'is_product_visible', enabled }] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

function renderAt(path: string, mocks: unknown[] = []) {
  return render(
    <MockedProvider mocks={mocks as never[]}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes {...props} />
        <LocationProbe />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('AppRoutes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the home route with forwarded props', async () => {
    renderAt('/');
    expect(await screen.findByText('HomePage:nightlife:loc-1:Zone A')).toBeInTheDocument();
  });

  it('renders the login route via the redirect-if-authed guard', async () => {
    renderAt('/login');
    expect(await screen.findByText('LoginPageStub')).toBeInTheDocument();
  });

  it('renders the 404 page for an unknown path', async () => {
    renderAt('/this-route-does-not-exist');
    expect(await screen.findByText('NotFoundStub')).toBeInTheDocument();
  });

  it('redirects /tickets to /support/live', async () => {
    renderAt('/tickets');
    expect(await screen.findByText('LiveTicketsStub')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/support/live');
  });

  it('redirects /bouncers to /support', async () => {
    renderAt('/bouncers');
    expect(await screen.findByText('SupportHubStub')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/support');
  });

  it('redirects /support/chat to /support/live (native parity)', async () => {
    renderAt('/support/chat');
    expect(await screen.findByText('LiveTicketsStub')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/support/live');
  });

  it('opens a product route once the product system flag is on', async () => {
    renderAt('/shop', [flagsMock(true)]);
    expect(await screen.findByText('ShopPageStub')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/shop');
  });

  it('sends every product route home while the flag is off', async () => {
    for (const path of ['/shop', '/cart', '/orders', '/product-checkout', '/products/manage']) {
      const view = renderAt(path, [flagsMock(false)]);
      await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/'));
      expect(screen.queryByText('ShopPageStub')).toBeNull();
      view.unmount();
    }
  });

  it('waits for the flag rather than bouncing a bookmarked product link', async () => {
    // No mock for the flags query, so it never resolves within this assertion:
    // the gate must sit on the loading state instead of redirecting.
    renderAt('/shop', []);
    expect(screen.getByTestId('pathname')).toHaveTextContent('/shop');
  });

  it('redirects a partner route to the partners app via window.location.replace', async () => {
    const replace = vi.fn();
    const original = globalThis.window.location;
    Object.defineProperty(globalThis.window, 'location', {
      configurable: true,
      value: { ...original, replace },
    });
    try {
      renderAt('/become-host');
      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith('https://partners-app.duncit.com/become-host'),
      );
    } finally {
      Object.defineProperty(globalThis.window, 'location', {
        configurable: true,
        value: original,
      });
    }
  });
});
