import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OfflineBanner from '../OfflineBanner';
import ErrorBoundary from '../ErrorBoundary';
import NotFoundPage from '../../pages/NotFoundPage';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

afterEach(() => {
  vi.restoreAllMocks();
});

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

describe('useOnlineStatus', () => {
  it('reflects offline/online window events', () => {
    setOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOffline).toBe(false);

    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current.isOffline).toBe(true);

    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current.isOffline).toBe(false);
  });

  it('starts offline when navigator reports it', () => {
    setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOffline).toBe(true);
    setOnline(true);
  });
});

describe('OfflineBanner', () => {
  it('renders only while offline', () => {
    setOnline(true);
    const { rerender } = render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();

    setOnline(false);
    act(() => window.dispatchEvent(new Event('offline')));
    rerender(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.getByText('No internet connection')).toBeInTheDocument();
    setOnline(true);
  });
});

describe('NotFoundPage', () => {
  it('renders the 404 with a home link', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to home/i })).toHaveAttribute('href', '/');
  });
});

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">ok</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows the fallback on error and recovers on retry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let crash = true;
    function Maybe() {
      if (crash) return <Boom />;
      return <div data-testid="recovered">recovered</div>;
    }
    render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    crash = false;
    fireEvent.click(screen.getByTestId('error-boundary-retry'));
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    spy.mockRestore();
  });
});
