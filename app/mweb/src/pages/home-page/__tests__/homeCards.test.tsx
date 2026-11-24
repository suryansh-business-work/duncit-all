import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import ClubSection from '../ClubSection';
import HomeFeaturedPods from '../HomeFeaturedPods';
import HomeNearbySection from '../HomeNearbySection';
import HomeRoute from '../HomeRoute';
import PodCard from '../PodCard';
import PodCardInfo from '../PodCardInfo';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ waitlisted: false, openPod: vi.fn() }));

vi.mock('../../../components/city-launch', () => ({
  CityLaunchView: (p: { locationId: string }) => <div data-testid="city-launch" data-location={p.locationId} />,
  useWaitlistCity: () => h.waitlisted,
}));
vi.mock('../HomePage', () => ({
  default: (p: { superCategorySlug: string; locationId: string; zoneName: string }) => (
    <div data-testid="home-page" data-slug={p.superCategorySlug} data-location={p.locationId} data-zone={p.zoneName} />
  ),
}));
vi.mock('../../../lib/open-pod', () => ({ openPod: h.openPod }));

const theme = createTheme();
const Where = () => {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
};
const wrap = (ui: ReactNode) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  pod_id: 'DUN-1',
  pod_title: 'Sunday Badminton',
  pod_type: 'NATIVE_PAID',
  pod_amount: 250,
  no_of_spots: 8,
  seats_taken: 7,
  pod_images_and_videos: [],
  club_slug: 'club',
  // Far ahead so the card stays UPCOMING whenever the suite runs.
  pod_date_time: '2099-08-23T09:00:00.000Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.waitlisted = false;
});

describe('PodCard', () => {
  const spots = () => screen.getByTestId('pod-card-DUN-1-spots').textContent;

  it('says one spot left in the singular', () => {
    wrap(<PodCard pod={pod()} onOpen={vi.fn()} />);
    expect(spots()).toContain(fallbackT('mweb.home.spotsLeftOne'));
    expect(spots()).toContain(fallbackT('mweb.home.joiningNow', { count: 7 }));
  });

  it('says who attended and Completed, in place of who is joining and the spots, once the pod is over', () => {
    const over = pod({ pod_date_time: '2020-01-05T09:00:00.000Z', attendance: { attended_seats: 5 } });
    wrap(<PodCard pod={over} onOpen={vi.fn()} />);
    expect(spots()).toBe(
      `${fallbackT('mweb.home.attendedCount', { count: 5 })} · ${fallbackT('mweb.home.podCompleted')}`
    );
    expect(spots()).not.toContain(fallbackT('mweb.home.joiningNow', { count: 7 }));
    expect(spots()).not.toContain(fallbackT('mweb.home.spotsLeftOne'));
    expect(screen.getByTestId('pod-card-DUN-1')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(fallbackT('mweb.home.podCompleted'))
    );
  });

  it('counts attendance, not bookings: nobody scanned in shows only Completed', () => {
    const over = pod({ pod_date_time: '2020-01-05T09:00:00.000Z', attendance: { attended_seats: 0 } });
    wrap(<PodCard pod={over} onOpen={vi.fn()} />);
    // 7 seats were booked; none was scanned in, so no count is claimed.
    expect(spots()).toBe(fallbackT('mweb.home.podCompleted'));
  });

  it('shows only Completed for an over pod whose query did not ask for attendance', () => {
    wrap(<PodCard pod={pod({ pod_date_time: '2020-01-05T09:00:00.000Z' })} onOpen={vi.fn()} />);
    expect(spots()).toBe(fallbackT('mweb.home.podCompleted'));
  });

  it('is completed once the host-set end has passed, even inside the default four-hour tail', () => {
    const now = Date.now();
    const start = new Date(now - 60 * 60 * 1000).toISOString();
    const end = new Date(now - 30 * 60 * 1000).toISOString();
    const over = pod({ pod_date_time: start, pod_end_date_time: end, attendance: { attended_seats: 2 } });
    wrap(<PodCard pod={over} onOpen={vi.fn()} />);
    expect(spots()).toBe(
      `${fallbackT('mweb.home.attendedCount', { count: 2 })} · ${fallbackT('mweb.home.podCompleted')}`
    );
  });

  it('keeps who is joining and the spots while a started pod is still ongoing, even with scans', () => {
    const start = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    wrap(<PodCard pod={pod({ pod_date_time: start, attendance: { attended_seats: 3 } })} onOpen={vi.fn()} />);
    expect(spots()).toContain(fallbackT('mweb.home.joiningNow', { count: 7 }));
    expect(spots()).toContain(fallbackT('mweb.home.spotsLeftOne'));
    expect(spots()).not.toContain(fallbackT('mweb.home.podCompleted'));
  });

  it('says how many spots are left when there are several', () => {
    wrap(<PodCard pod={pod({ seats_taken: 2 })} onOpen={vi.fn()} />);
    expect(spots()).toContain(fallbackT('mweb.home.spotsLeftMany', { count: 6 }));
  });

  it('shows the plain taken count when the pod is full or has no spot limit, and no joining line when nobody joined', () => {
    const { unmount } = wrap(<PodCard pod={pod({ seats_taken: 8 })} onOpen={vi.fn()} />);
    expect(spots()).toContain('8/8');
    unmount();
    wrap(<PodCard pod={pod({ no_of_spots: 0, seats_taken: 0 })} onOpen={vi.fn()} />);
    expect(spots()).toBe('0');
  });

  it('shows Free for a free pod, the host line, and a dash for a pod with no date', () => {
    wrap(<PodCard pod={pod({ pod_type: 'FREE', pod_date_time: null })} hostName="Asha" onOpen={vi.fn()} />);
    expect(screen.getByTestId('pod-card-DUN-1-price')).toHaveTextContent(fallbackT('mweb.slots.free'));
    expect(screen.getByTestId('pod-card-DUN-1')).toHaveTextContent('Asha');
    expect(screen.getByTestId('pod-card-DUN-1')).toHaveAttribute('aria-label', expect.stringContaining('—'));
  });

  it('offers a save button that toggles and says whether the pod is saved', () => {
    const onToggleSave = vi.fn();
    const { unmount } = wrap(<PodCard pod={pod()} onOpen={vi.fn()} saved={false} onToggleSave={onToggleSave} />);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.home.savePod') }));
    expect(onToggleSave).toHaveBeenCalledTimes(1);
    unmount();
    wrap(<PodCard pod={pod()} onOpen={vi.fn()} saved onToggleSave={onToggleSave} />);
    expect(screen.getByRole('button', { name: fallbackT('mweb.home.savedPod') })).toBeInTheDocument();
  });

  it('has no save button when the surface passes none, and opens with Enter or Space', () => {
    const onOpen = vi.fn();
    wrap(<PodCard pod={pod()} onOpen={onOpen} />);
    expect(screen.queryByRole('button', { name: fallbackT('mweb.home.savePod') })).not.toBeInTheDocument();
    const card = screen.getByTestId('pod-card-DUN-1');
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'a' });
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledTimes(3);
  });
});

describe('PodCardInfo', () => {
  it('addresses its parts by test id only when the card gave a prefix', () => {
    const { container, unmount } = render(
      <PodCardInfo title="Jam" price="₹10" joiningText="2 joining" spotsText="3 left" subText="Pune" locality={null} />
    );
    expect(container.querySelector('[data-testid$="-title"]')).toBeNull();
    expect(screen.getByText('2 joining')).toBeInTheDocument();
    expect(screen.getByText('Pune')).toBeInTheDocument();
    unmount();
    render(<PodCardInfo title="Jam" price="₹10" joiningText="" spotsText="3 left" subText="" locality={null} testIdPrefix="card" />);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Jam');
    expect(screen.getByTestId('card-price')).toHaveTextContent('₹10');
    expect(screen.getByTestId('card-spots')).toHaveTextContent('3 left');
  });
});

describe('ClubSection pills and see all', () => {
  const club = { id: 'c1', club_id: 'runners', club_name: 'Runners', locality: null };

  it('shows the category pill the page asks for on each card, and opens the club from See all', () => {
    const categoryLabelOf = vi.fn(() => 'Sports');
    wrap(<ClubSection club={club} clubPods={[pod()]} hostNameOf={() => null} categoryLabelOf={categoryLabelOf} />);
    expect(categoryLabelOf).toHaveBeenCalled();
    expect(screen.getByText('Sports')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('club-section-runners-see-all'));
    expect(screen.getByTestId('where').textContent).toContain('runners');
  });

  it('passes the save state of each pod through to its card', () => {
    const onToggleSave = vi.fn();
    wrap(<ClubSection club={club} clubPods={[pod()]} hostNameOf={() => null} savedOf={() => true} savingOf={() => false} onToggleSave={onToggleSave} />);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.home.savedPod') }));
    expect(onToggleSave).toHaveBeenCalledWith('p1');
  });

  it('shows the empty card for a club with no upcoming pods', () => {
    wrap(<ClubSection club={club} clubPods={[]} hostNameOf={() => null} />);
    expect(screen.getByTestId('club-section-runners-empty')).toBeInTheDocument();
  });
});

describe('HomeFeaturedPods see all', () => {
  it('shows nothing without pods, and passes save state, category pill and toggle through', () => {
    const { container, unmount } = wrap(<HomeFeaturedPods pods={[]} totalCount={0} filtered={false} />);
    expect(container.querySelector('[data-testid="home-featured-pods-rail"]')).toBeNull();
    unmount();
    const onToggleSave = vi.fn();
    wrap(<HomeFeaturedPods pods={[pod()]} totalCount={1} filtered={false} categoryLabelOf={() => 'Sports'} savedOf={() => true} savingOf={() => false} onToggleSave={onToggleSave} />);
    expect(screen.getByText('Sports')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.home.savedPod') }));
    expect(onToggleSave).toHaveBeenCalledWith('p1');
  });

  it('continues on the full page right after the last pod, or with no jump when filtered', () => {
    const { unmount } = wrap(<HomeFeaturedPods pods={[pod()]} totalCount={5} filtered={false} />);
    fireEvent.click(screen.getByTestId('see-all-card'));
    expect(screen.getByTestId('where')).toHaveTextContent('/happening-nearby?from=1');
    unmount();
    wrap(<HomeFeaturedPods pods={[pod()]} totalCount={5} filtered />);
    fireEvent.click(screen.getByTestId('see-all-card'));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/happening-nearby$/);
  });
});

describe('HomeNearbySection', () => {
  it('shows nothing, not even its title, when no pod is nearby', () => {
    const { container } = wrap(<HomeNearbySection pods={[]} totalCount={0} filtered={false} />);
    expect(container.querySelector('[data-tour="home-pods"]')).toBeNull();
  });

  it('shows the title over the rail, and the title opens the full list', () => {
    const { container } = wrap(<HomeNearbySection pods={[pod()]} totalCount={1} filtered={false} />);
    expect(container.querySelector('[data-tour="home-pods"]')).not.toBeNull();
  });
});

describe('HomeRoute', () => {
  it('shows the home feed for a launched city', () => {
    wrap(<HomeRoute superCategorySlug="sports" locationId="loc1" zoneName="North" />);
    expect(screen.getByTestId('home-page')).toHaveAttribute('data-slug', 'sports');
    expect(screen.getByTestId('home-page')).toHaveAttribute('data-location', 'loc1');
    expect(screen.getByTestId('home-page')).toHaveAttribute('data-zone', 'North');
    expect(screen.queryByTestId('city-launch')).not.toBeInTheDocument();
  });

  it('shows the waitlist in the feed place for a city that has not launched', () => {
    h.waitlisted = true;
    wrap(<HomeRoute superCategorySlug="sports" locationId="loc2" zoneName="" />);
    expect(screen.getByTestId('city-launch')).toHaveAttribute('data-location', 'loc2');
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });
});
