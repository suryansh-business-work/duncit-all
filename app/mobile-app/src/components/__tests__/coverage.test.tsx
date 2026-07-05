import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { Text } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { BottomNav } from '@/components/BottomNav';
import { ClubBody } from '@/components/details/ClubBody';
import { DetailHero, HeroButton } from '@/components/details/DetailHero';
import { PodInfo } from '@/components/details/PodInfo';
import { ExploreMediaCarousel } from '@/components/explore/ExploreMediaCarousel';
import { ExplorePodOverlay } from '@/components/explore/ExplorePodOverlay';
import { FeedList } from '@/components/FeedList';
import { useThemeStore } from '@/stores/theme.store';
import { renderWithProviders } from '@/utils/test-utils';

const media = [
  { url: 'https://img/1.jpg', type: 'IMAGE' },
  { url: 'https://img/2.jpg', type: 'IMAGE' },
];

describe('BottomNav', () => {
  it('renders tabs and navigates on press', () => {
    const navigate = jest.fn();
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const state = {
      index: 0,
      routes: [
        { key: 'HomeTab-1', name: 'HomeTab' },
        { key: 'Explore-1', name: 'Explore' },
      ],
    };
    renderWithProviders(
      <BottomNav
        state={state as never}
        navigation={{ emit, navigate } as never}
        descriptors={{} as never}
        insets={{ top: 0, bottom: 0, left: 0, right: 0 } as never}
      />,
    );
    expect(screen.getByTestId('tab-bar-HomeTab')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('tab-bar-Explore'));
    expect(navigate).toHaveBeenCalledWith('Explore');
  });
});

describe('DetailHero', () => {
  it('renders the carousel + back, and HeroButton variants', () => {
    const onBack = jest.fn();
    renderWithProviders(
      <DetailHero media={media} onBack={onBack}>
        <HeroButton testID="hb-active" icon="favorite" active onPress={jest.fn()} />
        <HeroButton testID="hb-loading" icon="bookmark" loading onPress={jest.fn()} />
      </DetailHero>,
    );
    expect(screen.getByTestId('hb-active')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('detail-back'));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ExploreMediaCarousel + ExplorePodOverlay', () => {
  it('renders images and the overlay chips', () => {
    renderWithProviders(<ExploreMediaCarousel media={media} width={390} height={700} />);
    const pod = {
      pod_title: 'Jam',
      pod_description: 'desc',
      pod_type: 'NATIVE_PAID',
      pod_amount: 200,
      pod_date_time: '2026-06-10T18:30:00.000Z',
      place_label: 'Cafe',
      place_detail: null,
      zone_name: null,
    } as never;
    renderWithProviders(<ExplorePodOverlay pod={pod} clubName="Runners" />);
    expect(screen.getByText('Jam')).toBeOnTheScreen();
    expect(screen.getByText('Runners')).toBeOnTheScreen();
  });
});

const EMPTY_CONTENT = {
  who_we_are: [],
  what_we_do: [],
  perks: [],
  values: [],
  faqs: [],
  hosts: [],
};

describe('ClubBody', () => {
  it('renders only superCategoryName chip when categoryName is empty', () => {
    const club = {
      club_name: 'Art Club',
      club_description: '',
      club_moments: [],
      club_whats_app_group_link: null,
      club_whats_app_community_link: null,
      matched_venues_count: 0,
      ...EMPTY_CONTENT,
    } as never;
    renderWithProviders(
      <ClubBody
        club={club}
        pods={[] as never}
        members={[]}
        followingUserIds={[]}
        categoryName=""
        superCategoryName="Creative"
        following={false}
        followBusy={false}
        onToggleFollow={jest.fn()}
        onOpenPod={jest.fn()}
        onOpenMember={jest.fn()}
      />,
    );
    expect(screen.getByText('Creative')).toBeOnTheScreen();
  });

  it('renders category chip with only categoryName (no superCategory)', () => {
    const club = {
      club_name: 'Art Club',
      club_description: '',
      club_moments: [],
      club_whats_app_group_link: null,
      club_whats_app_community_link: null,
      matched_venues_count: 0,
      ...EMPTY_CONTENT,
    } as never;
    renderWithProviders(
      <ClubBody
        club={club}
        pods={[] as never}
        members={[]}
        followingUserIds={[]}
        categoryName="Art"
        superCategoryName=""
        following={false}
        followBusy={false}
        onToggleFollow={jest.fn()}
        onOpenPod={jest.fn()}
        onOpenMember={jest.fn()}
      />,
    );
    expect(screen.getByText('Art')).toBeOnTheScreen();
  });

  it('renders category chips when names are provided', () => {
    const club = {
      club_name: 'Art Club',
      club_description: '',
      club_moments: [],
      club_whats_app_group_link: null,
      club_whats_app_community_link: null,
      matched_venues_count: 0,
      ...EMPTY_CONTENT,
    } as never;
    renderWithProviders(
      <ClubBody
        club={club}
        pods={[] as never}
        members={[]}
        followingUserIds={[]}
        categoryName="Art"
        superCategoryName="Creative"
        following={false}
        followBusy={false}
        onToggleFollow={jest.fn()}
        onOpenPod={jest.fn()}
        onOpenMember={jest.fn()}
      />,
    );
    expect(screen.getByText('Art')).toBeOnTheScreen();
    expect(screen.getByText('Creative')).toBeOnTheScreen();
  });

  it('renders chat + pods (default Pods Schedule tab) and opens chat + a pod', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const club = {
      club_name: 'Runners',
      club_description: 'We run',
      club_moments: [],
      club_whats_app_group_link: 'https://wa.me/1',
      club_whats_app_community_link: 'https://wa.me/community',
      matched_venues_count: 1,
      ...EMPTY_CONTENT,
    } as never;
    const pods = [
      {
        id: 'p1',
        pod_id: 'pod-1',
        pod_title: 'Run',
        pod_date_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        pod_end_date_time: null,
        pod_type: 'NATIVE_FREE',
        pod_amount: 0,
        no_of_spots: 5,
        host_names: [],
        pod_images_and_videos: [],
        club_id: 'c1',
        club_slug: 's',
        place_label: null,
        place_detail: null,
      },
    ] as never;
    const onOpenPod = jest.fn();
    renderWithProviders(
      <ClubBody
        club={club}
        pods={pods}
        members={[{ user_id: 'u1', full_name: 'Asha', profile_photo: null }]}
        followingUserIds={[]}
        categoryName=""
        superCategoryName=""
        following={false}
        followBusy={false}
        onToggleFollow={jest.fn()}
        onOpenPod={onOpenPod}
        onOpenMember={jest.fn()}
      />,
    );
    expect(screen.getByTestId('club-pods-schedule')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-chat-community'));
    expect(openSpy).toHaveBeenCalledWith('https://wa.me/community');
    fireEvent.press(screen.getByTestId('club-chat-group'));
    expect(openSpy).toHaveBeenCalledWith('https://wa.me/1');
    fireEvent.press(screen.getByTestId('pod-card-pod-1'));
    expect(onOpenPod).toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('shows past pods under the Previous rail of Pods Schedule', () => {
    const club = {
      club_name: 'Runners',
      club_description: '',
      club_moments: [],
      club_whats_app_group_link: null,
      club_whats_app_community_link: null,
      matched_venues_count: 0,
      ...EMPTY_CONTENT,
    } as never;
    const pods = [
      {
        id: 'p2',
        pod_id: 'pod-2',
        pod_title: 'Old Run',
        pod_date_time: '2026-06-02T06:30:00.000Z',
        pod_end_date_time: '2026-06-02T08:30:00.000Z',
        pod_type: 'NATIVE_FREE',
        pod_amount: 0,
        no_of_spots: 5,
        host_names: [],
        pod_images_and_videos: [],
        club_id: 'c1',
        club_slug: 's',
        place_label: null,
        place_detail: null,
      },
    ] as never;
    renderWithProviders(
      <ClubBody
        club={club}
        pods={pods}
        members={[]}
        followingUserIds={[]}
        categoryName=""
        superCategoryName=""
        following={false}
        followBusy={false}
        onToggleFollow={jest.fn()}
        onOpenPod={jest.fn()}
        onOpenMember={jest.fn()}
      />,
    );
    expect(screen.getByText('Previous')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-card-pod-2')).toBeOnTheScreen();
  });
});

describe('FeedList', () => {
  it('shows the loading state', () => {
    renderWithProviders(
      <FeedList
        testID="x"
        isLoading
        isEmpty
        emptyText="empty"
        data={[]}
        keyExtractor={() => ''}
        renderItem={() => <Text>child</Text>}
      />,
    );
    expect(screen.getByTestId('x-loading')).toBeOnTheScreen();
  });
});

describe('empty / minimal branches', () => {
  it('AppBackground renders the dark variant', () => {
    useThemeStore.setState({ scheme: 'dark' });
    renderWithProviders(<AppBackground />);
    expect(screen.getByTestId('app-background')).toBeOnTheScreen();
    useThemeStore.setState({ scheme: 'light' });
  });

  it('PodInfo renders with and without optional fields', () => {
    const full = {
      pod_title: 'Jam',
      pod_description: 'desc',
      pod_type: 'NATIVE_FREE',
      pod_amount: 0,
      pod_date_time: '2026-06-10T18:30:00.000Z',
      pod_attendees: ['u1'],
      no_of_spots: 5,
      host_names: ['Asha'],
      zone_name: null,
      place_label: 'Cafe',
      place_detail: 'MG Rd',
      what_this_pod_offers: ['Music'],
      available_perks: ['Snacks'],
    } as never;
    const { rerender } = renderWithProviders(<PodInfo pod={full} />);
    expect(screen.getByText('Jam')).toBeOnTheScreen();

    const minimal = {
      pod_title: 'Bare',
      pod_description: '',
      pod_type: 'NATIVE_FREE',
      pod_amount: 0,
      pod_date_time: '2026-06-10T18:30:00.000Z',
      pod_attendees: [],
      no_of_spots: 0,
      host_names: [],
      zone_name: null,
      place_label: null,
      place_detail: null,
      what_this_pod_offers: [],
      available_perks: [],
    } as never;
    rerender(<PodInfo pod={minimal} />);
    expect(screen.getByText('Bare')).toBeOnTheScreen();
  });

  it('ExplorePodOverlay renders minimal (free, no club/desc/place)', () => {
    const pod = {
      pod_title: 'Bare',
      pod_description: '',
      pod_type: 'NATIVE_FREE',
      pod_amount: 0,
      pod_date_time: '',
      place_label: null,
      place_detail: null,
      zone_name: null,
    } as never;
    renderWithProviders(<ExplorePodOverlay pod={pod} />);
    expect(screen.getByText('Bare')).toBeOnTheScreen();
  });

  it('ExploreMediaCarousel + ClubBody render their empty branches', () => {
    renderWithProviders(<ExploreMediaCarousel media={[]} width={390} height={700} />);
    const club = {
      club_name: 'Empty FC',
      club_description: '',
      club_moments: [],
      club_whats_app_group_link: null,
      club_whats_app_community_link: null,
      matched_venues_count: 0,
      ...EMPTY_CONTENT,
    } as never;
    renderWithProviders(
      <ClubBody
        club={club}
        pods={[] as never}
        members={[]}
        followingUserIds={[]}
        categoryName=""
        superCategoryName=""
        onOpenMember={jest.fn()}
        following={false}
        followBusy={false}
        onToggleFollow={jest.fn()}
        onOpenPod={jest.fn()}
      />,
    );
    expect(screen.getByTestId('club-no-pods')).toBeOnTheScreen();
  });
});
