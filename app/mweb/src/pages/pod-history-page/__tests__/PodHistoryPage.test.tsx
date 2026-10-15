import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PodHistoryPage from '../PodHistoryPage';
import { DEFAULT_POD_HISTORY_FILTERS, type PodHistoryFilters } from '../podHistoryFilter';

/*
  Under test: the page's states (error, empty, list, no-match), that a pod
  joined twice is listed once, that typing searches and the toolbar's choices
  reorder / reset the list, and where each row leads. The two queries are the
  server's, so useQuery answers per document; the toolbar has its own suite and
  is a stub that pushes a sort change or a reset.
*/
interface Answer {
  data?: unknown;
  loading?: boolean;
  error?: unknown;
}
const answers = vi.hoisted(() => {
  const memberships: Answer = {};
  const categories: Answer = {};
  return { memberships, categories };
});
vi.mock('@apollo/client/react', async (importOriginal) => {
  const { MY_POD_MEMBERSHIPS } = await import('../queries');
  return {
    ...(await importOriginal<typeof import('@apollo/client/react')>()),
    useQuery: (query: unknown) => (query === MY_POD_MEMBERSHIPS ? answers.memberships : answers.categories),
  };
});

vi.mock('../PodHistoryToolbar', () => ({
  default: (props: {
    filters: PodHistoryFilters;
    categories: unknown[];
    onChange: (next: PodHistoryFilters) => void;
    onReset: () => void;
  }) => (
    <div data-testid="toolbar-stub" data-categories={props.categories.length}>
      <button type="button" onClick={() => props.onChange({ ...props.filters, sort: 'DATE_ASC' })}>
        oldest-first
      </button>
      <button type="button" onClick={props.onReset}>
        reset
      </button>
    </div>
  ),
}));

const membership = (id: string, pod: { id: string; pod_title?: string | null; pod_date_time: string } | null, podId?: string) => ({
  id,
  pod_id: podId ?? null,
  joined_at: '2026-01-05T10:00:00.000Z',
  pod: pod && { ...pod, pod_id: `POD-${pod.id}`, club_slug: 'club', pod_amount: 100, pod_images_and_videos: [], club: null },
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <PodHistoryPage />
    </MemoryRouter>,
  );

const rowTitles = () =>
  within(screen.getByTestId('pod-history-list'))
    .getAllByRole('link')
    .map((row) => row.getAttribute('data-testid'));

beforeEach(() => {
  answers.categories = { data: { categories: [{ id: 'sup-1', name: 'Sports', level: 'SUPER', parent_id: null }] } };
  answers.memberships = {
    loading: false,
    data: {
      myPodMemberships: [
        membership('m1', { id: 'p1', pod_title: 'Morning Run', pod_date_time: '2026-03-01T06:00:00.000Z' }),
        // The same pod joined again (rejoin after a backout) — listed once, first entry wins.
        membership('m1b', { id: 'p1', pod_title: 'Morning Run', pod_date_time: '2026-03-01T06:00:00.000Z' }),
        membership('m2', { id: 'p2', pod_title: 'Book Club', pod_date_time: '2026-04-01T18:00:00.000Z' }),
        // No pod object: keyed by pod_id, titled with the generic "Pod".
        membership('m3', null, 'orphan-pod'),
      ],
    },
  };
});

describe('PodHistoryPage', () => {
  it('shows the API error when the history cannot load', () => {
    answers.memberships = { loading: false, error: { message: 'History unavailable' } };
    renderPage();
    expect(screen.getByTestId('pod-history-error')).toHaveTextContent('History unavailable');
  });

  it('shows the empty state when the member has joined nothing', () => {
    answers.memberships = { loading: false, data: { myPodMemberships: [] } };
    renderPage();
    expect(screen.getByTestId('pod-history-empty')).toHaveTextContent('Pods you have joined will appear here.');
  });

  it('keeps the list on screen during a background refetch', () => {
    answers.memberships = { ...answers.memberships, loading: true };
    renderPage();
    expect(screen.queryByTestId('pod-history-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-history-list')).toBeInTheDocument();
  });

  it('lists each pod once, newest first, each row linking to its details', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: /pod history/i })).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-stub')).toHaveAttribute('data-categories', '1');
    expect(rowTitles()).toEqual(['pod-history-card-m2', 'pod-history-card-m1', 'pod-history-card-m3']);
    expect(screen.queryByTestId('pod-history-card-m1b')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-history-card-m2')).toHaveAttribute('href', '/pod-history/m2');
    expect(screen.getByTestId('pod-history-card-m2')).toHaveTextContent('Book Club');
    expect(screen.getByTestId('pod-history-card-m2')).toHaveTextContent(/^Book ClubJoined /);
    expect(screen.getByTestId('pod-history-card-m3')).toHaveTextContent(/^PodJoined /);
  });

  it('filters by the typed search and says so when nothing matches', () => {
    renderPage();
    const search = screen.getByRole('textbox', { name: 'Search joined pods' });
    expect(search).toHaveAttribute('placeholder', 'Search joined pods…');

    fireEvent.change(search, { target: { value: 'book' } });
    expect(rowTitles()).toEqual(['pod-history-card-m2']);

    fireEvent.change(search, { target: { value: 'nothing like this' } });
    expect(screen.queryByTestId('pod-history-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-history-no-match')).toHaveTextContent('No Pods Found');
  });

  it('applies the toolbar sort and puts everything back on reset', () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search joined pods' }), { target: { value: 'o' } });

    fireEvent.click(screen.getByText('oldest-first'));
    expect(rowTitles()).toEqual(['pod-history-card-m1', 'pod-history-card-m2']);

    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByRole('textbox', { name: 'Search joined pods' })).toHaveValue(DEFAULT_POD_HISTORY_FILTERS.search);
    expect(rowTitles()).toEqual(['pod-history-card-m2', 'pod-history-card-m1', 'pod-history-card-m3']);
  });

  it('still lists the pods when the category tree has not loaded', () => {
    answers.categories = {};
    renderPage();
    expect(screen.getByTestId('toolbar-stub')).toHaveAttribute('data-categories', '0');
    expect(rowTitles()).toHaveLength(3);
  });
});

