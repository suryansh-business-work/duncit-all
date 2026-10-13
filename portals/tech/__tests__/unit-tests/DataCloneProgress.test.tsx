import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import type { CloneJob } from '../../src/pages/data-clone/queries';

const q = vi.hoisted(() => ({
  state: { data: undefined as unknown, loading: false, refetch: vi.fn() },
  options: [] as Array<{ pollInterval?: number; fetchPolicy?: string }>,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: (_doc: unknown, opts: { pollInterval?: number; fetchPolicy?: string }) => {
      q.options.push(opts);
      return q.state;
    },
  };
});

import CloneProgressCard from '../../src/pages/data-clone/CloneProgressCard';
import { useCloneJob } from '../../src/pages/data-clone/useCloneJob';
import { useCloneNavigationGuard } from '../../src/pages/data-clone/useCloneNavigationGuard';

const job = (over: Partial<CloneJob> = {}): CloneJob => ({
  id: 'j1',
  status: 'RUNNING',
  sourceDatabase: 'prod',
  targetDatabase: 'staging',
  currentCollection: 'orders',
  collectionsTotal: 4,
  collectionsDone: 1,
  documentsCopied: 12345,
  bytesCopied: 2048,
  excluded: [],
  error: null,
  startedBy: 'ops@example.test',
  startedAt: '2026-03-01T10:00:00.000Z',
  finishedAt: null,
  collections: [],
  ...over,
});

beforeEach(() => {
  q.state = { data: undefined, loading: false, refetch: vi.fn() };
  q.options = [];
});

describe('CloneProgressCard', () => {
  it('shows the live collection, determinate progress and the totals while running', () => {
    render(<CloneProgressCard job={job()} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('12,345')).toBeInTheDocument();
    expect(screen.getByText(/orders/)).toBeInTheDocument();
    expect(screen.getByText(/ops@example.test/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('is indeterminate until the collection count is known', () => {
    render(<CloneProgressCard job={job({ collectionsTotal: 0, collectionsDone: 0, currentCollection: null })} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('shows the finish time and hides the starter when none is recorded', () => {
    render(
      <CloneProgressCard
        job={job({
          status: 'SUCCEEDED',
          collectionsDone: 4,
          finishedAt: '2026-03-01T10:05:00.000Z',
          startedBy: null,
          currentCollection: null,
        })}
      />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByText(/ops@example.test/)).toBeNull();
    // started + finished lines both render
    expect(screen.getAllByText(/2026|Mar|03/).length).toBeGreaterThanOrEqual(2);
  });

  it('surfaces the failure message', () => {
    render(<CloneProgressCard job={job({ status: 'FAILED', error: 'Mongo refused the connection' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Mongo refused the connection');
  });
});

describe('useCloneJob', () => {
  it('reports no job and a loading state until the first answer', () => {
    q.state = { data: undefined, loading: true, refetch: vi.fn() };
    const { result } = renderHook(() => useCloneJob());
    expect(result.current).toMatchObject({ job: null, running: false, loading: true });
    expect(q.options.at(-1)?.pollInterval).toBe(0);
  });

  it('stops reporting loading once data exists even during a background refetch', () => {
    q.state = { data: { dataCloneJob: job({ status: 'SUCCEEDED' }) }, loading: true, refetch: vi.fn() };
    const { result } = renderHook(() => useCloneJob());
    expect(result.current.loading).toBe(false);
    expect(result.current.running).toBe(false);
  });

  it('polls every two seconds only while the job is running', () => {
    q.state = { data: { dataCloneJob: job() }, loading: false, refetch: vi.fn() };
    const { result } = renderHook(() => useCloneJob());
    expect(result.current.running).toBe(true);
    expect(q.options.at(-1)?.pollInterval).toBe(2000);
  });

  it('treats an explicit null job as nothing running', () => {
    q.state = { data: { dataCloneJob: null }, loading: false, refetch: vi.fn() };
    const { result } = renderHook(() => useCloneJob());
    expect(result.current.job).toBeNull();
    expect(q.options.at(-1)?.pollInterval).toBe(0);
  });
});

describe('useCloneNavigationGuard', () => {
  function Where() {
    return <p data-testid="where">{useLocation().pathname}</p>;
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/data-clone']}>
      {children}
      <Where />
    </MemoryRouter>
  );

  const addLink = (attrs: Record<string, string>) => {
    const a = document.createElement('a');
    for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
    a.textContent = 'link';
    document.body.appendChild(a);
    return a;
  };

  it('does nothing while inactive', () => {
    const { result } = renderHook(() => useCloneNavigationGuard(false), { wrapper });
    const a = addLink({ href: '/elsewhere' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    a.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pendingPath).toBeNull();
    const unload = new Event('beforeunload', { cancelable: true });
    globalThis.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
    a.remove();
  });

  it('asks the browser before the tab is closed while a clone runs', () => {
    renderHook(() => useCloneNavigationGuard(true), { wrapper });
    const unload = new Event('beforeunload', { cancelable: true });
    globalThis.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });

  it('swallows an in-app link click, then leaves on confirmation', () => {
    const { result } = renderHook(() => useCloneNavigationGuard(true), { wrapper });
    const a = addLink({ href: '/somewhere?x=1#h' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    act(() => {
      a.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.pendingPath).toBe('/somewhere?x=1#h');
    act(() => result.current.leave());
    expect(result.current.pendingPath).toBeNull();
    expect(screen.getByTestId('where')).toHaveTextContent('/somewhere');
    a.remove();
  });

  it('stays on the page when the operator declines', () => {
    const { result } = renderHook(() => useCloneNavigationGuard(true), { wrapper });
    const a = addLink({ href: '/somewhere' });
    act(() => {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(result.current.pendingPath).toBe('/somewhere');
    act(() => result.current.stay());
    expect(result.current.pendingPath).toBeNull();
    expect(screen.getByTestId('where')).toHaveTextContent('/data-clone');
    a.remove();
  });

  it('leave without a pending path does not navigate', () => {
    const { result } = renderHook(() => useCloneNavigationGuard(true), { wrapper });
    act(() => result.current.leave());
    expect(screen.getByTestId('where')).toHaveTextContent('/data-clone');
  });

  it.each([
    ['a modifier-key click', { href: '/x' }, { ctrlKey: true }],
    ['a non-primary button', { href: '/x' }, { button: 1 }],
    ['a new-tab link', { href: '/x', target: '_blank' }, {}],
    ['a download link', { href: '/x', download: '' }, {}],
    ['an external origin', { href: 'https://other.example.test/x' }, {}],
    ['the page already open', { href: '/' }, {}],
  ])('lets %s through untouched', (_name, attrs, init) => {
    const { result } = renderHook(() => useCloneNavigationGuard(true), { wrapper });
    const a = addLink(attrs as Record<string, string>);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    act(() => {
      a.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pendingPath).toBeNull();
    a.remove();
  });

  it('ignores clicks that are not on a link', () => {
    const { result } = renderHook(() => useCloneNavigationGuard(true), { wrapper });
    const div = document.createElement('div');
    document.body.appendChild(div);
    act(() => {
      div.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(result.current.pendingPath).toBeNull();
    div.remove();
  });

  it('ignores a click another handler already cancelled', () => {
    const { result } = renderHook(() => useCloneNavigationGuard(true), { wrapper });
    const a = addLink({ href: '/x' });
    // window's capture phase runs before the guard's document-level listener
    const cancel = (e: Event) => e.preventDefault();
    globalThis.addEventListener('click', cancel, true);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    act(() => {
      a.dispatchEvent(event);
    });
    globalThis.removeEventListener('click', cancel, true);
    expect(result.current.pendingPath).toBeNull();
    a.remove();
  });

  it('removes its listeners when the clone finishes', () => {
    const { result, rerender } = renderHook(({ on }) => useCloneNavigationGuard(on), {
      wrapper,
      initialProps: { on: true },
    });
    rerender({ on: false });
    const a = addLink({ href: '/after' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    a.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pendingPath).toBeNull();
    a.remove();
    fireEvent.click(document.body);
  });
});
