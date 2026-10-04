import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BottomNav from '../BottomNav';

const navigateMock = vi.fn();
const cartState = { totalCount: 0 };
const visibility = { visible: false, pending: false };

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../cart/CartContext', () => ({
  useCart: () => cartState,
}));

vi.mock('@duncit/app-settings', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useProductVisibility: () => visibility };
});

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

const ALWAYS_TABS = ['Home', 'Explore', 'Clubs', 'Venues'];

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );

beforeEach(() => {
  navigateMock.mockReset();
  cartState.totalCount = 0;
  visibility.visible = false;
  (globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BottomNav', () => {
  it('renders the four always-present tabs and no cart while products are hidden', () => {
    renderAt('/');
    for (const label of ALWAYS_TABS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('Cart')).not.toBeInTheDocument();
    // Chats and Following moved into the account menu.
    expect(screen.queryByText('Chats')).not.toBeInTheDocument();
    expect(screen.queryByText('Following')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('adds the cart tab with its item count when products are visible', () => {
    visibility.visible = true;
    cartState.totalCount = 3;
    renderAt('/');
    expect(screen.getByTestId('tab-bar-Cart')).toHaveTextContent('Cart');
    expect(screen.getByTestId('tab-bar-cart-count')).toHaveTextContent('3');
  });

  it('sets CSS custom properties for the bottom-nav offsets on mount', () => {
    renderAt('/');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--duncit-bottom-nav-height')).not.toBe('');
    expect(root.style.getPropertyValue('--duncit-bottom-nav-offset')).not.toBe('');
    expect(root.style.getPropertyValue('--duncit-bottom-nav-content-offset')).not.toBe('');
  });

  it('cleans up the custom properties on unmount', () => {
    const { unmount } = renderAt('/');
    unmount();
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--duncit-bottom-nav-height')).toBe('');
    expect(root.style.getPropertyValue('--duncit-bottom-nav-offset')).toBe('');
  });

  it('navigates when a tab is clicked', () => {
    renderAt('/');
    fireEvent.click(screen.getByText('Explore'));
    expect(navigateMock).toHaveBeenCalledWith('/explore');
  });

  it('recomputes offsets on window resize', () => {
    renderAt('/');
    const root = document.documentElement;
    root.style.removeProperty('--duncit-bottom-nav-height');
    fireEvent(window, new Event('resize'));
    expect(root.style.getPropertyValue('--duncit-bottom-nav-height')).not.toBe('');
  });

  it.each([
    ['/', 'Home'],
    ['/explore/coffee', 'Explore'],
    ['/clubs', 'Clubs'],
    ['/club/some-slug', 'Clubs'],
    ['/venues', 'Venues'],
    ['/venue/abc', 'Venues'],
    ['/cart', 'Cart'],
  ])('marks the active tab for path %s', (path, label) => {
    visibility.visible = true;
    renderAt(path);
    const button = screen.getByText(label).closest('button');
    expect(button).toHaveClass('Mui-selected');
    expect(button).toHaveAttribute('aria-current', 'page');
  });

  it.each(['/settings', '/chats/42', '/follow'])('highlights no tab for an unmatched path %s', (path) => {
    renderAt(path);
    for (const label of ALWAYS_TABS) {
      const button = screen.getByText(label).closest('button');
      expect(button).not.toHaveClass('Mui-selected');
    }
  });
});
