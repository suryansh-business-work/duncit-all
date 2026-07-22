import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExplorePodCard from '../ExplorePodCard';
import { TOGGLE_POD_LIKE } from '../../pod-details-page/queries';

// useNavigate spy.
const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

// usePricing depends on a finance query; stub it deterministically.
vi.mock('../../../hooks/usePricing', () => ({
  usePricing: () => ({ format: (n: number) => `₹${n}` }),
}));

// Heavy children (video / overlay) are irrelevant to this card's logic — stub them.
vi.mock('../ExploreReelVideo', () => ({
  default: ({ src }: { src: string }) => <div data-testid="reel-video">video:{src}</div>,
}));
vi.mock('../ExplorePodOverlay', () => ({
  default: ({ pod }: { pod: any }) => <div data-testid="overlay">overlay:{pod.pod_title}</div>,
}));

// ExploreActionRail uses ResizeObserver (absent in jsdom) — render a flat list of
// clickable actions so we can exercise every action's onClick / onLabelClick.
vi.mock('../ExploreActionRail', () => ({
  default: ({ actions }: { actions: any[] }) => (
    <div data-testid="rail">
      {actions.map((a) => (
        <div key={a.key} data-testid={`action-${a.key}`}>
          <button type="button" onClick={a.onClick} aria-label={`btn-${a.key}`}>
            {a.key}:{a.label}
            {a.active ? ':active' : ''}
            {a.loading ? ':loading' : ''}
          </button>
          {a.onLabelClick && (
            <button type="button" onClick={a.onLabelClick} aria-label={`label-${a.key}`}>
              label-{a.key}
            </button>
          )}
        </div>
      ))}
    </div>
  ),
}));

// Likes dialog stub surfaces the resolved userIds + open flag.
vi.mock('../LikesListDialog', () => ({
  default: ({ open, userIds }: { open: boolean; userIds: string[] }) => (
    <div data-testid="likes-dialog">
      likes-open:{String(open)}:ids:{userIds.join(',')}
    </div>
  ),
}));

// Comments sheet stub exposes open + a button to fire onCountChange deltas.
vi.mock('../../../components/PodCommentsSheet', () => ({
  default: ({ open, onCountChange }: { open: boolean; onCountChange: (d: number) => void }) => (
    <div data-testid="comments-sheet">
      comments-open:{String(open)}
      <button type="button" onClick={() => onCountChange(1)}>
        add-comment
      </button>
      <button type="button" onClick={() => onCountChange(-5)}>
        remove-comments
      </button>
    </div>
  ),
}));

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();

const basePod = (over: Record<string, any> = {}) => ({
  id: 'pod-doc-1',
  pod_id: 'POD-1',
  club_slug: 'my-club',
  pod_title: 'Sunset Run',
  pod_description: 'A lovely run',
  pod_type: 'PAID',
  pod_amount: 200,
  pod_date_time: FUTURE,
  no_of_spots: 10,
  pod_attendees: ['a', 'b'],
  reel_url: 'https://cdn/reel.mp4',
  liked_by_me: false,
  like_count: 3,
  comment_count: 2,
  liked_user_ids: ['u1', 'u2'],
  ...over,
});

const likeMock = (id: string, result: { like_count: number; liked_by_me: boolean }) => ({
  request: { query: TOGGLE_POD_LIKE, variables: { id } },
  result: { data: { togglePodLike: { id, ...result, __typename: 'Pod' } } },
});

const setup = (props: Record<string, any> = {}, mocks: any[] = []) => {
  const { pod, ...rest } = props;
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ExplorePodCard
        pod={basePod(pod)}
        club={{ club_name: 'Club' }}
        location={{ name: 'Loc' }}
        saved={false}
        onToggleSave={vi.fn()}
        viewerId="viewer-1"
        {...rest}
      />
    </MockedProvider>,
  );
};

beforeEach(() => {
  navigateMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExplorePodCard', () => {
  it('renders active pod: join label with spots, like/comment counts, CTA', () => {
    setup();
    expect(screen.getByTestId('reel-video')).toHaveTextContent('video:https://cdn/reel.mp4');
    expect(screen.getByTestId('overlay')).toHaveTextContent('overlay:Sunset Run');
    // join label = attendees(2)/spots(10)
    expect(screen.getByLabelText('btn-join')).toHaveTextContent('join:2/10');
    expect(screen.getByLabelText('btn-like')).toHaveTextContent('like:3');
    expect(screen.getByLabelText('btn-comment')).toHaveTextContent('comment:2');
    expect(screen.getByText('Join in 2 taps')).toBeInTheDocument();
    // Paid CTA subtitle uses the priced amount.
    expect(screen.getByText('₹200 · Confirm with UPI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open pod details' })).toBeInTheDocument();
  });

  it('shows the free-spot CTA subtitle for FREE pods', () => {
    setup({ pod: { pod_type: 'FREE_EVENT' } });
    expect(screen.getByText('Free spot')).toBeInTheDocument();
  });

  it('renders the expired notice and hides the Go button when the pod has started', () => {
    setup({ pod: { pod_date_time: PAST } });
    expect(screen.getByLabelText('btn-join')).toHaveTextContent('join:Expired');
    expect(screen.getByText('This pod is expired')).toBeInTheDocument();
    expect(screen.getByText('You can still view the pod details.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open pod details' })).not.toBeInTheDocument();
  });

  it('drops the spots suffix when no_of_spots is 0', () => {
    setup({ pod: { no_of_spots: 0, pod_attendees: ['x'] } });
    expect(screen.getByLabelText('btn-join')).toHaveTextContent('join:1');
  });

  it('navigates to the pod detail via the Go button and the open action', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open pod details' }));
    expect(navigateMock).toHaveBeenCalledWith('/club/my-club/pod/POD-1');
    navigateMock.mockClear();
    fireEvent.click(screen.getByLabelText('btn-open'));
    expect(navigateMock).toHaveBeenCalledWith('/club/my-club/pod/POD-1');
  });

  it('navigates on double click of the card', () => {
    setup();
    fireEvent.doubleClick(screen.getByTestId('overlay').parentElement as HTMLElement);
    expect(navigateMock).toHaveBeenCalledWith('/club/my-club/pod/POD-1');
  });

  it('does not navigate when club_slug/pod_id are missing', () => {
    setup({ pod: { club_slug: null, pod_id: null } });
    fireEvent.click(screen.getByLabelText('btn-open'));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('optimistically likes then reconciles with the server response', async () => {
    setup({}, [likeMock('pod-doc-1', { like_count: 4, liked_by_me: true })]);
    fireEvent.click(screen.getByLabelText('btn-like'));
    // Optimistic bump first.
    expect(screen.getByLabelText('btn-like')).toHaveTextContent('like:4');
    // Then server value settles.
    await waitFor(() =>
      expect(screen.getByLabelText('btn-like')).toHaveTextContent('like:4:active'),
    );
  });

  it('rolls back the optimistic like when the mutation errors', async () => {
    setup({}, [
      {
        request: { query: TOGGLE_POD_LIKE, variables: { id: 'pod-doc-1' } },
        error: new Error('network'),
      },
    ]);
    fireEvent.click(screen.getByLabelText('btn-like'));
    expect(screen.getByLabelText('btn-like')).toHaveTextContent('like:4');
    await waitFor(() =>
      expect(screen.getByLabelText('btn-like')).toHaveTextContent('like:3'),
    );
  });

  it('opens the likers dialog only when there are likes, passing viewer-adjusted ids', () => {
    setup();
    // like_count 3 > 0, so the label click is wired.
    fireEvent.click(screen.getByLabelText('label-like'));
    expect(screen.getByTestId('likes-dialog')).toHaveTextContent('likes-open:true');
    // viewer-1 not liked yet -> ids stay as cached u1,u2.
    expect(screen.getByTestId('likes-dialog')).toHaveTextContent('ids:u1,u2');
  });

  it('does not wire the like-label click when there are no likes', () => {
    setup({ pod: { like_count: 0 } });
    expect(screen.queryByLabelText('label-like')).not.toBeInTheDocument();
  });

  it('adds the viewer to the likers list after liking (likersWithViewer)', async () => {
    setup({ pod: { liked_user_ids: ['u1'] } }, [
      likeMock('pod-doc-1', { like_count: 4, liked_by_me: true }),
    ]);
    fireEvent.click(screen.getByLabelText('btn-like'));
    await waitFor(() =>
      expect(screen.getByLabelText('btn-like')).toHaveTextContent(':active'),
    );
    fireEvent.click(screen.getByLabelText('label-like'));
    expect(screen.getByTestId('likes-dialog')).toHaveTextContent('ids:u1,viewer-1');
  });

  it('removes an already-present viewer from the likers list when unliked', async () => {
    setup({ pod: { liked_by_me: true, like_count: 5, liked_user_ids: ['viewer-1', 'u2'] } }, [
      likeMock('pod-doc-1', { like_count: 4, liked_by_me: false }),
    ]);
    fireEvent.click(screen.getByLabelText('btn-like'));
    await waitFor(() =>
      expect(screen.getByLabelText('btn-like')).not.toHaveTextContent(':active'),
    );
    fireEvent.click(screen.getByLabelText('label-like'));
    expect(screen.getByTestId('likes-dialog')).toHaveTextContent('ids:u2');
    expect(screen.getByTestId('likes-dialog')).not.toHaveTextContent('viewer-1');
  });

  it('keeps cached ids untouched when there is no viewer id', () => {
    setup({ viewerId: null });
    fireEvent.click(screen.getByLabelText('label-like'));
    expect(screen.getByTestId('likes-dialog')).toHaveTextContent('ids:u1,u2');
  });

  it('opens comments and applies onCountChange deltas (clamped at 0)', () => {
    setup();
    fireEvent.click(screen.getByLabelText('btn-comment'));
    expect(screen.getByTestId('comments-sheet')).toHaveTextContent('comments-open:true');
    fireEvent.click(screen.getByText('add-comment'));
    expect(screen.getByLabelText('btn-comment')).toHaveTextContent('comment:3');
    fireEvent.click(screen.getByText('remove-comments'));
    // 3 - 5 clamped to 0.
    expect(screen.getByLabelText('btn-comment')).toHaveTextContent('comment:0');
  });

  it('re-syncs like/comment state when the pod props change (feed refetch)', () => {
    const { rerender } = render(
      <MockedProvider mocks={[]} addTypename={false}>
        <ExplorePodCard
          pod={basePod()}
          club={{}}
          location={{}}
          saved={false}
          onToggleSave={vi.fn()}
          viewerId="viewer-1"
        />
      </MockedProvider>,
    );
    expect(screen.getByLabelText('btn-like')).toHaveTextContent('like:3');
    rerender(
      <MockedProvider mocks={[]} addTypename={false}>
        <ExplorePodCard
          pod={basePod({ liked_by_me: true, like_count: 9, comment_count: 7 })}
          club={{}}
          location={{}}
          saved={false}
          onToggleSave={vi.fn()}
          viewerId="viewer-1"
        />
      </MockedProvider>,
    );
    expect(screen.getByLabelText('btn-like')).toHaveTextContent('like:9:active');
    expect(screen.getByLabelText('btn-comment')).toHaveTextContent('comment:7');
  });

  it('reflects the saved + savePending flags on the save action', () => {
    setup({ saved: true, savePending: true });
    expect(screen.getByLabelText('btn-save')).toHaveTextContent('save:Save:active:loading');
  });

  it('shares via the Web Share API when available', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });
    setup();
    fireEvent.click(screen.getByLabelText('btn-share'));
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    const arg = shareSpy.mock.calls[0][0];
    expect(arg.url).toContain('/club/my-club/pod/POD-1');
    expect(arg.title).toBe('Sunset Run');
    Reflect.deleteProperty(navigator, 'share');
  });

  it('falls back to clipboard when Web Share is unavailable, using explore url without slugs', async () => {
    Reflect.deleteProperty(navigator, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    setup({ pod: { club_slug: null, pod_id: null } });
    fireEvent.click(screen.getByLabelText('btn-share'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('/explore');
  });

  it('swallows share errors (user cancelled)', async () => {
    const shareSpy = vi.fn().mockRejectedValue(new Error('cancelled'));
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });
    setup();
    fireEvent.click(screen.getByLabelText('btn-share'));
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    // No throw / unhandled rejection = pass.
    Reflect.deleteProperty(navigator, 'share');
  });
});
