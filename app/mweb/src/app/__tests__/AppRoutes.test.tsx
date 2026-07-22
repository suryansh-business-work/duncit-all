import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes {...props} />
      <LocationProbe />
    </MemoryRouter>,
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
