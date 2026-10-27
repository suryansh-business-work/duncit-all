import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import SuperCategoryTabs from '../SuperCategoryTabs';
import { renderSuperCategoryMark } from '../superCategoryIcon';
import { useHeaderPushNotifications } from '../useHeaderPushNotifications';

const h = vi.hoisted(() => ({ ensure: vi.fn(), perm: vi.fn() }));
vi.mock('../../../pwa', () => ({ ensurePushSubscription: h.ensure, notificationPermission: h.perm }));

const CATS = [
  { id: '1', slug: 'you', name: 'For You', icon: '' },
  { id: '2', slug: 'pet', name: 'For Your Pet', icon: 'https://img/pet.png' },
];

const tabs = (path: string, props: Partial<Parameters<typeof SuperCategoryTabs>[0]> = {}) => {
  const onChange = vi.fn();
  render(
    <MemoryRouter initialEntries={[path]}>
      <SuperCategoryTabs loading={false} superCats={CATS} value="you" onChange={onChange} {...props} />
    </MemoryRouter>
  );
  return onChange;
};

describe('SuperCategoryTabs', () => {
  it.each(['/venues', '/chats', '/'])('shows on the filterable page %s', (path) => {
    tabs(path);
    expect(screen.getByTestId('super-cat-tabs')).toBeInTheDocument();
  });

  it('is hidden on pages the super-category does not filter', () => {
    tabs('/account');
    expect(screen.queryByTestId('super-cat-tabs')).not.toBeInTheDocument();
  });

  it('shows a skeleton while the first load has no categories', () => {
    tabs('/', { loading: true, superCats: [] });
    expect(screen.getByTestId('super-cat-tabs-skeleton')).toBeInTheDocument();
  });

  it('renders nothing for no categories once loaded', () => {
    tabs('/', { superCats: [] });
    expect(screen.queryByTestId('super-cat-tabs')).not.toBeInTheDocument();
  });

  it('keeps the tabs during a refresh, marks the selected one and reports a pick', () => {
    const onChange = tabs('/', { loading: true });
    expect(screen.getByTestId('super-cat-you')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('super-cat-pet')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('super-cat-pet').querySelector('img')).toHaveAttribute('src', 'https://img/pet.png');
    fireEvent.click(screen.getByTestId('super-cat-pet'));
    expect(onChange).toHaveBeenCalledWith('pet');
  });
});

describe('renderSuperCategoryMark', () => {
  it('renders nothing for a blank or missing icon', () => {
    expect(renderSuperCategoryMark(null)).toBeNull();
    expect(renderSuperCategoryMark('   ')).toBeNull();
  });

  it.each(['https://img/x.png', 'data:image/png;base64,AAAA', '/local/x.svg'])('renders %s as an image of the given size', (src) => {
    const { container } = render(<>{renderSuperCategoryMark(src, 24, 12)}</>);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', src);
    expect(img).toHaveStyle({ width: '24px', height: '12px' });
  });

  it('renders a short emoji as a text mark at the larger dimension', () => {
    const { container } = render(<>{renderSuperCategoryMark('🐶', 10, 20)}</>);
    expect(container.querySelector('span')).toHaveTextContent('🐶');
    expect(container.querySelector('span')).toHaveStyle({ fontSize: '20px' });
  });

  it('renders nothing for a long lower-case word that is neither an icon name nor an emoji', () => {
    const { container } = render(<>{renderSuperCategoryMark('some words')}</>);
    expect(container).toBeEmptyDOMElement();
  });

});

/**
 * The MUI icon set is loaded lazily and cached in module state, so each test
 * imports a fresh copy of the module against a tiny stand-in for the 10k-icon
 * package (loading the real one inside jsdom takes seconds).
 */
describe('renderSuperCategoryMark named icons', () => {
  afterEach(() => {
    vi.doUnmock('@mui/icons-material');
    vi.resetModules();
  });

  const fresh = async (factory: () => unknown) => {
    vi.resetModules();
    vi.doMock('@mui/icons-material', factory as () => never);
    return import('../superCategoryIcon');
  };

  it('loads a named icon, holding its box meanwhile, then reuses the loaded set', async () => {
    const mod = await fresh(() => ({ Pets: () => <svg data-testid="PetsIcon" /> }));
    const first = render(<>{mod.renderSuperCategoryMark('Pets', 18)}</>);
    expect(first.container.querySelector('svg')).toBeNull();
    expect(first.container.querySelector('span')).toHaveStyle({ width: '18px', height: '18px' });
    await waitFor(() => expect(first.container.querySelector('svg[data-testid="PetsIcon"]')).not.toBeNull());
    const second = render(<>{mod.renderSuperCategoryMark('Pets', 18)}</>);
    expect(second.container.querySelector('svg[data-testid="PetsIcon"]')).not.toBeNull();
  });

  it('shows a two-letter name as text when the set has no such icon, and nothing for a longer one', async () => {
    const mod = await fresh(() => ({ Pets: () => <svg />, Zz: undefined, NotAnIconAtAll: undefined }));
    const short = render(<>{mod.renderSuperCategoryMark('Zz', 18)}</>);
    await waitFor(() => expect(short.container.querySelector('span')).toHaveTextContent('Zz'));
    const long = render(<>{mod.renderSuperCategoryMark('NotAnIconAtAll', 18)}</>);
    await waitFor(() => expect(long.container.querySelector('svg')).toBeNull());
    expect(long.container).toBeEmptyDOMElement();
  });

  it('logs a failed icon-set load and retries on the next mount', async () => {
    const error = vi.fn();
    vi.doMock('@duncit/logs', () => ({ logs: { mWeb: { error } } }));
    const mod = await fresh(() => {
      throw new Error('chunk failed');
    });
    render(<>{mod.renderSuperCategoryMark('Pets', 18)}</>);
    await waitFor(() => expect(error).toHaveBeenCalledWith('superCategoryIcon', 'loadIconSet', expect.objectContaining({ name: 'Pets' })));
    vi.doUnmock('@duncit/logs');
  });
});

describe('useHeaderPushNotifications', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('starts from the current permission, and enabling refreshes it', async () => {
    h.perm.mockReturnValueOnce('default').mockReturnValue('granted');
    h.ensure.mockResolvedValue(true);
    const { result } = renderHook(() => useHeaderPushNotifications(vi.fn().mockResolvedValue(undefined)));
    expect(result.current.perm).toBe('default');
    await act(async () => {
      await result.current.enablePush();
    });
    expect(result.current.perm).toBe('granted');
    expect(result.current.toast).toBeNull();
    expect(result.current.pushBusy).toBe(false);
  });

  it('toasts when permission was not granted, and clears busy even when it throws', async () => {
    h.perm.mockReturnValue('denied');
    h.ensure.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useHeaderPushNotifications(vi.fn().mockResolvedValue(undefined)));
    await act(async () => {
      await result.current.enablePush();
    });
    expect(result.current.toast).toEqual({ title: 'Notifications', body: 'Permission was not granted.' });
    h.ensure.mockRejectedValueOnce(new Error('sw failed'));
    await act(async () => {
      await expect(result.current.enablePush()).rejects.toThrow('sw failed');
    });
    expect(result.current.pushBusy).toBe(false);
  });

  it('toasts a pushed message from the service worker and refetches, using defaults for a bare payload', async () => {
    h.perm.mockReturnValue('granted');
    const refetch = vi.fn().mockResolvedValue(undefined);
    const listeners: ((e: MessageEvent) => void)[] = [];
    const sw = {
      addEventListener: (_t: string, fn: (e: MessageEvent) => void) => listeners.push(fn),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
    const { result, unmount } = renderHook(() => useHeaderPushNotifications(refetch));
    act(() => listeners[0]({ data: { type: 'PUSH_RECEIVED', payload: { title: 'Hi', body: 'There' } } } as MessageEvent));
    expect(result.current.toast).toEqual({ title: 'Hi', body: 'There' });
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => listeners[0]({ data: { type: 'PUSH_RECEIVED' } } as MessageEvent));
    expect(result.current.toast).toEqual({ title: 'Duncit', body: '' });
    act(() => listeners[0]({ data: { type: 'OTHER' } } as MessageEvent));
    act(() => listeners[0]({ data: null } as MessageEvent));
    expect(refetch).toHaveBeenCalledTimes(2);
    unmount();
    expect(sw.removeEventListener).toHaveBeenCalledWith('message', listeners[0]);
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('ignores a failing refetch after a push', async () => {
    h.perm.mockReturnValue('granted');
    const refetch = vi.fn().mockRejectedValue(new Error('offline'));
    const listeners: ((e: MessageEvent) => void)[] = [];
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: (_t: string, fn: (e: MessageEvent) => void) => listeners.push(fn), removeEventListener: vi.fn() },
      configurable: true,
    });
    const { result, unmount } = renderHook(() => useHeaderPushNotifications(refetch));
    act(() => listeners[0]({ data: { type: 'PUSH_RECEIVED', payload: {} } } as MessageEvent));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(result.current.toast).not.toBeNull();
    unmount();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });
});
