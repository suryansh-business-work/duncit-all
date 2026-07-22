import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- router mocks -------------------------------------------------------
const navigate = vi.fn();
let routeParams: Record<string, string> = { clubSlug: 'my-club', podSlug: 'my-pod' };
const searchParams = new URLSearchParams('ref=REF123');
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => routeParams,
  useSearchParams: () => [searchParams],
}));

// --- hook mocks ---------------------------------------------------------
const setMode = vi.fn();
const openPodPicker = vi.fn();
vi.mock('../../hooks/usePricing', () => ({
  usePricing: () => ({
    compute: (n: number) => ({ total: n }),
    format: (n: number) => `Rs ${n}`,
    currency: 'Rs',
  }),
}));
vi.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => true,
}));
vi.mock('../../StudioModeContext', () => ({
  useStudioMode: () => ({ setMode }),
}));
vi.mock('../../components/status-upload/StatusUploadProvider', () => ({
  useStatusUpload: () => ({ openPodPicker }),
}));

// usePodDetailActions / usePodProductSelection return mutable objects so
// individual tests can flip flags (snack, dialogs open, etc.).
const actions = {
  displaySaved: false,
  savePending: false,
  onToggleSave: vi.fn(),
  onShare: vi.fn(),
  joinState: { loading: false },
  backoutState: { loading: false },
  cancelBackoutState: { loading: false },
  onJoinFree: vi.fn(),
  setBackoutOpen: vi.fn(),
  openKeepSpot: vi.fn(),
  onPaidCheckout: vi.fn(),
  onCopyReferral: vi.fn(),
  snack: null as string | null,
  setSnack: vi.fn(),
  backoutOpen: false,
  onConfirmBackout: vi.fn(),
  keepSpotOpen: false,
  setKeepSpotOpen: vi.fn(),
  keepSpotError: null,
  onConfirmKeepSpot: vi.fn(),
  confettiOpen: false,
  setConfettiOpen: vi.fn(),
};
vi.mock('../pod-details-page/usePodDetailActions', () => ({
  usePodDetailActions: () => actions,
}));
const productSelection = {
  selectedProductList: [],
  selectedProducts: {},
  setSelectedProducts: vi.fn(),
  selectedProductTotal: 0,
  setVariantQuantity: vi.fn(),
};
vi.mock('../pod-details-page/usePodProductSelection', () => ({
  usePodProductSelection: () => productSelection,
}));

// --- child component mocks ---------------------------------------------
vi.mock('../pod-details-page/PodHero', () => ({
  default: ({ title, onBack, onToggleSave, onShare }: any) => (
    <div data-testid="hero">
      <span>{title}</span>
      <button onClick={onBack}>back</button>
      <button onClick={onToggleSave}>toggle-save</button>
      <button onClick={onShare}>share</button>
    </div>
  ),
}));
vi.mock('../pod-details-page/PodOverview', () => ({
  default: ({ onAddStatus }: any) => (
    <button onClick={onAddStatus}>add-status</button>
  ),
}));
vi.mock('../pod-details-page/PodCommercePreview', () => ({
  default: ({ onVariantQuantity }: any) => (
    <button
      onClick={() =>
        onVariantQuantity(
          { product_id: 'prod1', product_name: 'Widget', image_url: 'img' },
          { id: 'v1', label: 'S', image_url: '', unit_cost: 5, max: 3 },
          2,
        )
      }
    >
      commerce
    </button>
  ),
}));
vi.mock('../pod-details-page/StickyPodActionPanel', () => ({
  default: ({ onGoToDashboard }: any) => (
    <button onClick={onGoToDashboard}>go-dashboard</button>
  ),
}));
vi.mock('../pod-details-page/PodDetailAccordions', () => ({
  default: () => <div data-testid="accordions" />,
}));
vi.mock('../pod-details-page/PodSocialBar', () => ({
  default: () => <div data-testid="social" />,
}));
vi.mock('../pod-details-page/BackoutConfirmDialog', () => ({
  default: ({ open }: any) => (open ? <div>backout-dialog</div> : null),
}));
vi.mock('../pod-details-page/KeepSpotDialog', () => ({
  default: ({ open }: any) => (open ? <div>keep-dialog</div> : null),
}));
vi.mock('../../components/pod-details/PodMapSection', () => ({
  default: () => <div data-testid="map" />,
}));
vi.mock('../../components/ads/AdSlot', () => ({
  default: () => <div data-testid="ad" />,
}));
vi.mock('../../components/ConfettiOverlay', () => ({
  default: ({ open }: any) => (open ? <div>confetti</div> : null),
}));

import PodDetailsPage from '../PodDetailsPage';
import { POD_ID_BY_SLUGS, POD_DETAILS, POD_PEOPLE } from '../pod-details-page/queries';

const slugMock = (id: string | null) => ({
  request: { query: POD_ID_BY_SLUGS, variables: { clubSlug: 'my-club', podSlug: 'my-pod' } },
  result: {
    data: { podBySlugs: id ? { id, pod_id: 'PUB1', club_slug: 'my-club' } : null },
  },
});

const podData = {
  pod: {
    id: 'pod1',
    pod_id: 'PUB1',
    pod_title: 'Sunset Yoga',
    pod_hashtag: ['yoga', 'chill'],
    pod_images_and_videos: [{ url: 'u', type: 'image' }],
    pod_hosts_id: ['u1'],
    pod_attendees: ['u2'],
    pod_date_time: '2999-01-01T10:00:00.000Z',
    pod_type: 'FREE',
    club_id: 'club1',
    club_slug: 'my-club',
    location_id: 'loc1',
    venue_id: 'ven1',
    product_requests: [{ product_id: 'prod1', product_name: 'Widget', image_url: 'i' }],
    like_count: 3,
    liked_by_me: true,
    comment_count: 1,
  },
  podMembershipState: {
    pod_id: 'PUB1',
    is_member: false,
    backout_attempts_max: 3,
    backout_attempts_used: 1,
    backout_deduction_pct: 10,
    backout_refund_amount: 90,
  },
  clubs: [{ id: 'club1', club_id: 'C1', club_name: 'Club One', super_category_id: 's1', category_id: 'cat1' }],
  categories: [
    { id: 's1', name: 'Sports', level: 'SUPER_CATEGORY', parent_id: null },
    { id: 'cat1', name: 'Yoga', level: 'CATEGORY', parent_id: 's1' },
  ],
  locations: [{ id: 'loc1', location_name: 'Pune', location_zones: [] }],
  publicVenues: [{ id: 'ven1', venue_name: 'The Hall', lat: 1, lng: 2 }],
  publicHosts: [{ id: 'h1', user_id: 'u1', full_name: 'Host A', passport_photo_url: 'p' }],
  me: { user_id: 'u1', saved_pod_ids: ['pod1'] },
};

const detailsMock = {
  request: { query: POD_DETAILS, variables: { id: 'pod1' } },
  result: { data: podData },
};
const peopleMock = {
  request: { query: POD_PEOPLE, variables: { ids: ['u1', 'u2'] } },
  result: {
    data: {
      publicUsersByIds: [
        { user_id: 'u1', full_name: 'Host A', profile_photo: 'pp1' },
        { user_id: 'u2', full_name: 'Attendee B', profile_photo: 'pp2' },
      ],
    },
  },
};

const setup = (mocks: unknown[], ui: ReactElement = <PodDetailsPage />) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      {ui}
    </MockedProvider>,
  );

beforeEach(() => {
  routeParams = { clubSlug: 'my-club', podSlug: 'my-pod' };
  actions.snack = null;
  actions.backoutOpen = false;
  actions.keepSpotOpen = false;
  actions.confettiOpen = false;
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('PodDetailsPage', () => {
  it('renders the skeleton while the slug query is loading', () => {
    const { container } = setup([slugMock('pod1'), detailsMock, peopleMock]);
    // Skeleton renders MUI Skeleton pulse elements before data resolves.
    expect(container.querySelector('.MuiSkeleton-root')).toBeTruthy();
  });

  it('renders the populated pod once all data resolves', async () => {
    setup([slugMock('pod1'), detailsMock, peopleMock]);
    expect(await screen.findByText('Sunset Yoga')).toBeInTheDocument();
    expect(screen.getByTestId('accordions')).toBeInTheDocument();
    expect(screen.getByTestId('social')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    // hashtags rendered
    expect(screen.getByText('#yoga')).toBeInTheDocument();
    expect(screen.getByText('#chill')).toBeInTheDocument();
    // products visible -> commerce preview present
    expect(screen.getByText('commerce')).toBeInTheDocument();
  });

  it('wires hero + panel + overview callbacks', async () => {
    setup([slugMock('pod1'), detailsMock, peopleMock]);
    await screen.findByText('Sunset Yoga');

    fireEvent.click(screen.getByText('back'));
    expect(navigate).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByText('toggle-save'));
    expect(actions.onToggleSave).toHaveBeenCalled();

    fireEvent.click(screen.getByText('add-status'));
    expect(openPodPicker).toHaveBeenCalledWith('pod1');

    fireEvent.click(screen.getByText('commerce'));
    expect(productSelection.setVariantQuantity).toHaveBeenCalledWith(
      expect.objectContaining({ pod_id: 'pod1', product_id: 'prod1', variant_id: 'v1' }),
      2,
    );

    fireEvent.click(screen.getByText('go-dashboard'));
    expect(setMode).toHaveBeenCalledWith('HOST');
    expect(navigate).toHaveBeenCalledWith('/host/manage');

    fireEvent.click(screen.getByText('Contact support about this pod'));
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('/support/tickets?category=BOOKING&podId=pod1'),
    );
  });

  it('shows the snack alert and open dialogs when actions signal them', async () => {
    actions.snack = 'Joined!';
    actions.backoutOpen = true;
    actions.keepSpotOpen = true;
    actions.confettiOpen = true;
    setup([slugMock('pod1'), detailsMock, peopleMock]);
    expect(await screen.findByText('Joined!')).toBeInTheDocument();
    expect(screen.getByText('backout-dialog')).toBeInTheDocument();
    expect(screen.getByText('keep-dialog')).toBeInTheDocument();
    expect(screen.getByText('confetti')).toBeInTheDocument();
  });

  it('shows the error alert when the details query fails', async () => {
    setup([
      slugMock('pod1'),
      { request: { query: POD_DETAILS, variables: { id: 'pod1' } }, error: new Error('boom') },
      peopleMock,
    ]);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('shows "Pod not found" when the slug does not resolve', async () => {
    setup([slugMock(null)]);
    expect(await screen.findByText('Pod not found.')).toBeInTheDocument();
  });
});
