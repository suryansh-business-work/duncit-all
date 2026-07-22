import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BottomNav from '../BottomNav';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );

beforeEach(() => {
  navigateMock.mockReset();
  (globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BottomNav', () => {
  it('renders all navigation tabs', () => {
    renderAt('/');
    for (const label of ['Home', 'Explore', 'Clubs', 'Chats', 'Following']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
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
    ['/chats/42', 'Chats'],
    ['/follow', 'Following'],
  ])('marks the active tab for path %s', (path, label) => {
    renderAt(path);
    const button = screen.getByText(label).closest('button');
    expect(button).toHaveClass('Mui-selected');
  });

  it('highlights no tab for an unmatched path', () => {
    renderAt('/settings');
    for (const label of ['Home', 'Explore', 'Clubs', 'Chats', 'Following']) {
      const button = screen.getByText(label).closest('button');
      expect(button).not.toHaveClass('Mui-selected');
    }
  });
});
