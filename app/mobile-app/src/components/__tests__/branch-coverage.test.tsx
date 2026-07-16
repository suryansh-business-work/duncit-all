import { screen } from '@testing-library/react-native';

import { ChatRoomCard } from '@/components/chat/ChatRoomCard';
import { ExploreActionButton } from '@/components/explore/ExploreActionButton';
import { ExplorePodCard } from '@/components/explore/ExplorePodCard';
import { ClubCard } from '@/components/home/ClubCard';
import { ClubSection } from '@/components/home/ClubSection';
import { PodCard } from '@/components/home/PodCard';
import { renderWithProviders } from '@/utils/test-utils';

const image = { url: 'https://img/x.jpg', type: 'IMAGE' };

const podWith = (over: Record<string, unknown>) =>
  ({
    id: 'p1',
    pod_id: 'pod-1',
    pod_title: 'Pod',
    pod_date_time: '2026-06-10T18:30:00.000Z',
    pod_type: 'NATIVE_PAID',
    pod_amount: 250,
    pod_attendees: ['u1', 'u2'],
    no_of_spots: 0,
    host_names: [],
    pod_images_and_videos: [image],
    club_id: 'c1',
    club_slug: 's',
    place_label: null,
    place_detail: null,
    pod_description: 'd',
    zone_name: null,
    comment_count: 0,
    like_count: 0,
    liked_by_me: false,
    ...over,
  }) as never;

describe('component branch variants', () => {
  it('PodCard with an image and no place / open spots', () => {
    renderWithProviders(<PodCard pod={podWith({})} />);
    expect(screen.getByTestId('pod-card-pod-1')).toBeOnTheScreen();
    expect(screen.getByText('Open')).toBeOnTheScreen();
  });

  it('ClubCard with an image and no description', () => {
    const club = {
      id: 'c1',
      club_id: 'cl-1',
      club_name: 'Runners',
      club_description: '',
      club_feature_images_and_videos: [image],
      category_id: null,
      super_category_id: null,
    } as never;
    renderWithProviders(<ClubCard club={club} />);
    expect(screen.getByTestId('club-card-cl-1')).toBeOnTheScreen();
  });

  it('ClubSection renders without a description or image', () => {
    const club = {
      id: 'c1',
      club_id: 'cl-1',
      club_name: 'Runners',
      club_description: '',
      club_feature_images_and_videos: [],
      category_id: null,
      super_category_id: null,
    } as never;
    renderWithProviders(
      <ClubSection club={club} pods={[] as never} onOpenPod={jest.fn()} onOpenClub={jest.fn()} />,
    );
    expect(screen.getByTestId('club-section-cl-1')).toBeOnTheScreen();
  });

  it('ChatRoomCard with a cover and a single member', () => {
    const room = {
      id: 'r1',
      pod_id: 'p1',
      pod_title: 'Coffee',
      pod_attendees: ['u1'],
      cover_url: 'https://img/c.jpg',
    } as never;
    renderWithProviders(<ChatRoomCard room={room} onPress={jest.fn()} />);
    expect(screen.getByText('1 member')).toBeOnTheScreen();
  });

  it('ExploreActionButton active + loading variants', () => {
    renderWithProviders(
      <>
        <ExploreActionButton testID="a" icon="favorite" label="3" active onPress={jest.fn()} />
        <ExploreActionButton testID="b" icon="bookmark" label="Save" loading onPress={jest.fn()} />
      </>,
    );
    expect(screen.getByTestId('a')).toBeOnTheScreen();
    expect(screen.getByTestId('b')).toBeOnTheScreen();
  });

  it('ExplorePodCard without a reel renders the defensive fallback backdrop', () => {
    const club = {
      id: 'c1',
      club_name: 'Runners',
      club_feature_images_and_videos: [image],
    } as never;
    renderWithProviders(
      <ExplorePodCard
        pod={podWith({ place_label: 'Cafe' })}
        club={club}
        width={390}
        height={700}
        isActive
        saved
        like={{ liked_by_me: true, like_count: 9 }}
        commentCount={3}
        onToggleSave={jest.fn()}
        onToggleLike={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByTestId('reel-pod-1')).toBeOnTheScreen();
    // No reel_url (defensive branch) → no video mounts.
    expect(screen.queryByTestId('reel-video-pod-1')).toBeNull();
  });
});
