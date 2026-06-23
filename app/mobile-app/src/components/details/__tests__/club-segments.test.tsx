import { fireEvent, screen } from '@testing-library/react-native';

import { ClubBulletsSection } from '@/components/details/club/ClubBulletsSection';
import { ClubFaqsSection } from '@/components/details/club/ClubFaqsSection';
import { ClubHostsRail } from '@/components/details/club/ClubHostsRail';
import { ClubMomentsRail } from '@/components/details/club/ClubMomentsRail';
import { ClubPodsSchedule } from '@/components/details/club/ClubPodsSchedule';
import { ClubSegments } from '@/components/details/club/ClubSegments';
import { clubPodPhase, pickPodMoments } from '@/utils/club-detail';
import { renderWithProviders } from '@/utils/test-utils';

const now = Date.now();
const makePod = (id: string, title: string, startMs: number, endMs: number | null) => ({
  id,
  pod_id: `pod-${id}`,
  pod_title: title,
  pod_date_time: new Date(now + startMs).toISOString(),
  pod_end_date_time: endMs === null ? null : new Date(now + endMs).toISOString(),
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_attendees: [],
  no_of_spots: 5,
  host_names: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  pod_mode: 'PHYSICAL',
  place_label: null,
  place_detail: null,
});

const soonPod = makePod('s', 'Soon Run', 2 * 60 * 60 * 1000, null);
const upcomingPod = makePod('u', 'Upcoming Run', 5 * 24 * 60 * 60 * 1000, null);
const previousPod = makePod(
  'p',
  'Old Run',
  -5 * 24 * 60 * 60 * 1000,
  -5 * 24 * 60 * 60 * 1000 + 3600_000,
);

const fullClub = {
  club_name: 'Full FC',
  who_we_are: ['Builders', '   ', 'Tinkerers'],
  what_we_do: ['Hack nights'],
  perks: ['Coffee'],
  values: ['Curiosity'],
  faqs: [{ question: 'Cost?', answer: 'It is Free' }],
  hosts: [
    { id: 'h1', name: 'Asha', avatar_url: null },
    { id: 'h2', name: 'Ben', avatar_url: 'https://img/b.jpg' },
  ],
} as never;
const moments = [{ url: 'https://img/m.jpg', type: 'IMAGE' }] as never;

describe('ClubSegments', () => {
  it('switches between every available segment and opens pods/hosts', () => {
    const onOpenPod = jest.fn();
    const onOpenHost = jest.fn();
    renderWithProviders(
      <ClubSegments
        club={fullClub}
        pods={[soonPod, upcomingPod, previousPod] as never}
        moments={moments}
        onOpenPod={onOpenPod}
        onOpenHost={onOpenHost}
      />,
    );
    // Default Pods Schedule shows all three rails.
    expect(screen.getByTestId('club-pods-schedule')).toBeOnTheScreen();
    expect(screen.getByText('Happening soon')).toBeOnTheScreen();
    expect(screen.getByText('Upcoming')).toBeOnTheScreen();
    expect(screen.getByText('Previous')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-card-pod-u'));
    expect(onOpenPod).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('club-tab-MOMENTS'));
    expect(screen.getByTestId('club-moments')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('club-tab-WHO'));
    expect(screen.getByText('Builders')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-tab-WHAT'));
    expect(screen.getByText('Hack nights')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-tab-PERKS'));
    expect(screen.getByText('Coffee')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-tab-VALUES'));
    expect(screen.getByText('Curiosity')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('club-tab-FAQS'));
    expect(screen.getByTestId('club-faqs')).toBeOnTheScreen();
    expect(screen.queryByText('It is Free')).toBeNull();
    fireEvent.press(screen.getByTestId('club-faq-Cost?'));
    expect(screen.getByText('It is Free')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-faq-Cost?'));
    expect(screen.queryByText('It is Free')).toBeNull();

    fireEvent.press(screen.getByTestId('club-tab-HOSTS'));
    expect(screen.getByTestId('club-hosts')).toBeOnTheScreen();
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-host-h1'));
    expect(onOpenHost).toHaveBeenCalledWith('h1');

    fireEvent.press(screen.getByTestId('club-tab-PODS'));
    expect(screen.getByTestId('club-pods-schedule')).toBeOnTheScreen();
  });

  it('hides segments that have no content', () => {
    const emptyClub = {
      club_name: 'Empty',
      who_we_are: [],
      what_we_do: [],
      perks: [],
      values: [],
      faqs: [],
      hosts: [],
    } as never;
    renderWithProviders(
      <ClubSegments
        club={emptyClub}
        pods={[] as never}
        moments={[] as never}
        onOpenPod={jest.fn()}
        onOpenHost={jest.fn()}
      />,
    );
    expect(screen.getByTestId('club-tab-PODS')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-tab-MOMENTS')).toBeNull();
    expect(screen.queryByTestId('club-tab-HOSTS')).toBeNull();
    expect(screen.getByTestId('club-no-pods')).toBeOnTheScreen();
  });
});

describe('ClubPodsSchedule', () => {
  it('hides empty rails', () => {
    const { getByText, queryByText } = renderWithProviders(
      <ClubPodsSchedule pods={[upcomingPod] as never} onOpenPod={jest.fn()} />,
    );
    expect(getByText('Upcoming')).toBeOnTheScreen();
    expect(queryByText('Happening soon')).toBeNull();
    expect(queryByText('Previous')).toBeNull();
  });

  it('shows the empty copy when there are no pods', () => {
    const { getByTestId } = renderWithProviders(
      <ClubPodsSchedule pods={[] as never} onOpenPod={jest.fn()} />,
    );
    expect(getByTestId('club-no-pods')).toBeOnTheScreen();
  });
});

describe('club content sections render nothing when empty', () => {
  it('returns null for empty bullets, faqs, moments and hosts', () => {
    const bullets = renderWithProviders(<ClubBulletsSection title="Who We Are" items={[]} />);
    expect(bullets.queryByText('Who We Are')).toBeNull();
    const faqs = renderWithProviders(<ClubFaqsSection faqs={[]} />);
    expect(faqs.queryByText('FAQs')).toBeNull();
    const rail = renderWithProviders(<ClubMomentsRail moments={[] as never} />);
    expect(rail.queryByText('Club Moments')).toBeNull();
    const hosts = renderWithProviders(<ClubHostsRail hosts={[] as never} onOpenHost={jest.fn()} />);
    expect(hosts.queryByText('Club Hosts')).toBeNull();
  });
});

describe('clubPodPhase', () => {
  it('buckets pods into Soon / Upcoming / Previous', () => {
    expect(clubPodPhase(null)).toBe('UPCOMING');
    expect(clubPodPhase('not-a-date')).toBe('UPCOMING');
    expect(clubPodPhase(new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString())).toBe('UPCOMING');
    expect(clubPodPhase(new Date(now + 2 * 60 * 60 * 1000).toISOString())).toBe('SOON');
    expect(
      clubPodPhase(new Date(now - 3600_000).toISOString(), new Date(now + 3600_000).toISOString()),
    ).toBe('SOON');
    expect(
      clubPodPhase(
        new Date(now - 5 * 3600_000).toISOString(),
        new Date(now - 4 * 3600_000).toISOString(),
      ),
    ).toBe('PREVIOUS');
    expect(clubPodPhase(new Date(now - 5 * 3600_000).toISOString())).toBe('PREVIOUS');
  });
});

describe('pickPodMoments', () => {
  it('samples pod media up to a limit, tolerating pods without media', () => {
    const pods = [
      {
        pod_images_and_videos: [
          { url: 'a', type: 'IMAGE' },
          { url: 'b', type: 'IMAGE' },
        ],
      },
      { pod_images_and_videos: undefined },
    ] as never;
    expect(pickPodMoments(pods, 1)).toHaveLength(1);
    expect(pickPodMoments(pods, 10)).toHaveLength(2);
    expect(pickPodMoments([] as never, 5)).toHaveLength(0);
  });
});
