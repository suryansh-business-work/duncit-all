import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import ExplorePage from '../ExplorePage';
import { EXPLORE_PODS, TOGGLE_SAVED_POD } from '../queries';

// Stub the heavy child trees so we exercise ExplorePage's own logic (query wiring,
// filtering, optimistic save, refetch) without react-slick / video / ad machinery.
vi.mock('../ExploreHeader', () => ({
  default: ({ activeCount, resultCount, onOpenFilters, onRefresh }: any) => (
    <div data-testid="header">
      <span>active:{activeCount}</span>
      <span>results:{resultCount}</span>
      <button type="button" onClick={onOpenFilters}>
        open-filters
      </button>
      <button type="button" onClick={onRefresh}>
        refresh
      </button>
    </div>
  ),
}));

vi.mock('../ExploreReels', () => ({
  default: ({ pods, viewerId, isSaved, pendingSave, onToggleSave }: any) => (
    <div data-testid="reels">
      <span>count:{pods.length}</span>
      <span>viewer:{viewerId ?? 'anon'}</span>
      {pods.map((p: any) => (
        <button key={p.id} type="button" onClick={() => onToggleSave(p.id)}>
          save-{p.id}:{String(isSaved(p.id))}:{String(pendingSave.has(p.id))}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../ExploreFilterSheet', () => ({
  default: ({ open, categories, filters, setFilters, onClose }: any) => (
    <div data-testid="filter-sheet">
      <span>sheet-open:{String(open)}</span>
      <span>cats:{categories.map((c: any) => c.name).join(',')}</span>
      <button type="button" onClick={() => setFilters({ ...filters, price: 'PAID' })}>
        set-paid
      </button>
      <button type="button" onClick={onClose}>
        close-sheet
      </button>
    </div>
  ),
}));

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'pod-1',
  pod_id: 'DUN-1',
  pod_title: 'Rooftop Jam',
  pod_description: 'Live music',
  pod_date_time: '2999-01-01T20:00:00.000Z',
  pod_type: 'FREE',
  pod_amount: 0,
  pod_attendees: [],
  no_of_spots: 10,
  zone_name: 'Central',
  reel_url: 'https://cdn.example/reel-1.mp4',
  club_id: 'club-1',
  club_slug: 'club-one',
  location_id: 'loc-1',
  pod_mode: 'PHYSICAL',
  venue_id: 'venue-1',
  place_label: 'Skybar',
  place_detail: 'Level 12',
  like_count: 3,
  liked_by_me: false,
  liked_user_ids: [],
  comment_count: 1,
  ...over,
});

const exploreData = (over: Record<string, unknown> = {}) => ({
  me: { user_id: 'user-1', saved_pod_ids: ['pod-2'] },
  pods: [pod(), pod({ id: 'pod-2', pod_id: 'DUN-2', pod_title: 'Beach Party', pod_type: 'NATIVE_PAID', pod_amount: 500 })],
  clubs: [{ id: 'club-1', club_id: 'C1', club_name: 'Club One', is_verified: true, super_category_id: 'super-1', category_id: 'cat-child' }],
  superCategories: [{ id: 'super-1', slug: 'nightlife' }],
  categories: [
    { id: 'cat-child', name: 'Techno', slug: 'techno', level: 'SUB', parent_id: 'super-1' },
    { id: 'cat-other', name: 'Comedy', slug: 'comedy', level: 'SUB', parent_id: 'other-super' },
    { id: 'super-1', name: 'Nightlife', slug: 'nightlife', level: 'SUPER', parent_id: null },
  ],
  locations: [{ id: 'loc-1', location_name: 'Mumbai' }],
  ...over,
});

const exploreMock = (data: Record<string, unknown>) => ({
  request: { query: EXPLORE_PODS },
  result: { data },
});

const toggleMock = (id: string, error = false) => ({
  request: { query: TOGGLE_SAVED_POD, variables: { pod_doc_id: id } },
  ...(error
    ? { error: new Error('save failed') }
    : { result: { data: { toggleSavedPod: { pod_id: id, saved: true, saved_pod_ids: [id] } } } }),
});

const setup = (mocks: any[], props: Record<string, unknown> = {}) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ExplorePage {...props} />
    </MockedProvider>,
  );

describe('ExplorePage', () => {
  it('shows a spinner while the query is in flight', () => {
    setup([exploreMock(exploreData())]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the reels feed with resolved pods and viewer once data loads', async () => {
    setup([exploreMock(exploreData())]);
    await waitFor(() => expect(screen.getByTestId('reels')).toBeInTheDocument());
    expect(screen.getByText('count:2')).toBeInTheDocument();
    expect(screen.getByText('viewer:user-1')).toBeInTheDocument();
    // pod-2 is server-saved; pod-1 is not.
    expect(screen.getByText('save-pod-2:true:false')).toBeInTheDocument();
    expect(screen.getByText('save-pod-1:false:false')).toBeInTheDocument();
  });

  it('renders an error alert when the query fails', async () => {
    setup([{ request: { query: EXPLORE_PODS }, error: new Error('boom') }]);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('boom'));
  });

  it('shows the empty state when no pod has a reel', async () => {
    const data = exploreData({ pods: [pod({ reel_url: null }), pod({ id: 'pod-2', reel_url: '' })] });
    setup([exploreMock(data)]);
    await waitFor(() => expect(screen.getByText('No pods match these filters.')).toBeInTheDocument());
    expect(screen.queryByTestId('reels')).not.toBeInTheDocument();
  });

  it('optimistically marks a pod saved then keeps it after the mutation resolves', async () => {
    setup([exploreMock(exploreData()), toggleMock('pod-1')]);
    const btn = await screen.findByText('save-pod-1:false:false');
    fireEvent.click(btn);
    // Optimistic overlay flips saved true immediately.
    await waitFor(() => expect(screen.getByText(/save-pod-1:true:/)).toBeInTheDocument());
    // pendingSave clears once the mutation settles.
    await waitFor(() => expect(screen.getByText('save-pod-1:true:false')).toBeInTheDocument());
  });

  it('rolls back the optimistic save when the mutation errors', async () => {
    setup([exploreMock(exploreData()), toggleMock('pod-1', true)]);
    const btn = await screen.findByText('save-pod-1:false:false');
    fireEvent.click(btn);
    // After the error the overlay is dropped, reverting to server state (not saved).
    await waitFor(() => expect(screen.getByText('save-pod-1:false:false')).toBeInTheDocument());
  });

  it('opens and closes the filter sheet', async () => {
    setup([exploreMock(exploreData())]);
    await screen.findByTestId('filter-sheet');
    expect(screen.getByText('sheet-open:false')).toBeInTheDocument();
    fireEvent.click(screen.getByText('open-filters'));
    await waitFor(() => expect(screen.getByText('sheet-open:true')).toBeInTheDocument());
    fireEvent.click(screen.getByText('close-sheet'));
    await waitFor(() => expect(screen.getByText('sheet-open:false')).toBeInTheDocument());
  });

  it('applies a filter and updates the active count and result count', async () => {
    setup([exploreMock(exploreData())]);
    await screen.findByTestId('filter-sheet');
    expect(screen.getByText('active:0')).toBeInTheDocument();
    fireEvent.click(screen.getByText('set-paid'));
    // PAID keeps only the NATIVE_PAID pod; active filter count becomes 1.
    await waitFor(() => expect(screen.getByText('active:1')).toBeInTheDocument());
    expect(screen.getByText('results:1')).toBeInTheDocument();
    expect(screen.getByText('count:1')).toBeInTheDocument();
  });

  it('triggers a refetch when refresh is pressed', async () => {
    const first = exploreMock(exploreData());
    const second = exploreMock(exploreData({ pods: [pod({ id: 'pod-9', pod_title: 'Refreshed' })] }));
    setup([first, second]);
    await screen.findByText('count:2');
    fireEvent.click(screen.getByText('refresh'));
    await waitFor(() => expect(screen.getByText('count:1')).toBeInTheDocument());
  });

  it('limits vibe chips to descendants of the active super-category slug', async () => {
    setup([exploreMock(exploreData())], { superCategorySlug: 'nightlife' });
    await screen.findByTestId('filter-sheet');
    // Only the descendant sub-category is offered; Comedy (other super) and the SUPER row are excluded.
    expect(screen.getByText('cats:Techno')).toBeInTheDocument();
  });

  it('offers all non-super categories when no super slug is set', async () => {
    setup([exploreMock(exploreData())]);
    await screen.findByTestId('filter-sheet');
    expect(screen.getByText('cats:Techno,Comedy')).toBeInTheDocument();
  });
});
