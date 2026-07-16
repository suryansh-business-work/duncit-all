import { Share } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ClubSection } from '@/components/home/ClubSection';
import { ExplorePodCard } from '@/components/explore/ExplorePodCard';
import { HostCard } from '@/components/hosts-venues/HostCard';
import { VenueCard } from '@/components/hosts-venues/VenueCard';
import { renderWithProviders } from '@/utils/test-utils';

const mockBranding = jest.fn();
jest.mock('@/hooks/useBranding', () => ({ useBranding: () => mockBranding() }));

const explorePod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Pod',
  pod_date_time: '2026-06-10T18:30:00.000Z',
  pod_type: 'NATIVE_PAID',
  pod_amount: 250,
  pod_attendees: ['u1'],
  no_of_spots: 5,
  pod_images_and_videos: [{ url: 'https://i/1.jpg', type: 'IMAGE' }],
  reel_url: 'https://cdn/reel.mp4',
  club_id: 'c1',
  comment_count: 2,
  like_count: 9,
  liked_by_me: false,
  place_label: null,
} as never;

describe('ExplorePodCard share', () => {
  it('invokes the native share sheet', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    renderWithProviders(
      <ExplorePodCard
        pod={explorePod}
        club={
          {
            id: 'c1',
            club_name: 'C',
            club_feature_images_and_videos: [{ url: 'https://i/cover.jpg', type: 'IMAGE' }],
          } as never
        }
        width={390}
        height={2000}
        isActive={false}
        saved={false}
        like={{ liked_by_me: false, like_count: 9 }}
        commentCount={0}
        onToggleSave={jest.fn()}
        onToggleLike={jest.fn()}
        onComment={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Share'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });
});

describe('ClubSection with image + pods', () => {
  it('renders the cover image and opens a pod', () => {
    const onOpenPod = jest.fn();
    const pod = {
      id: 'p1',
      pod_id: 'pod-1',
      pod_title: 'Pod',
      pod_date_time: '2026-06-10T18:30:00.000Z',
      pod_type: 'NATIVE_FREE',
      pod_amount: 0,
      pod_attendees: [],
      no_of_spots: 4,
      pod_images_and_videos: [],
      club_id: 'c1',
    } as never;
    renderWithProviders(
      <ClubSection
        club={
          {
            id: 'c1',
            club_id: 'cl1',
            club_name: 'Runners',
            club_description: 'We run',
            club_feature_images_and_videos: [{ url: 'https://i/c.jpg', type: 'IMAGE' }],
          } as never
        }
        pods={[pod]}
        onOpenPod={onOpenPod}
        onOpenClub={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('pod-card-pod-1'));
    expect(onOpenPod).toHaveBeenCalled();
  });
});

describe('HostCard fallbacks', () => {
  it('uses the initial, default name and a pending spinner', () => {
    renderWithProviders(
      <HostCard
        host={
          {
            user_id: 'h1',
            full_name: null,
            passport_photo_url: null,
            full_address: null,
            tags: [],
          } as never
        }
        isMe={false}
        isFollowing={false}
        pending
        onOpen={jest.fn()}
        onToggleFollow={jest.fn()}
      />,
    );
    expect(screen.getByText('Duncit host')).toBeOnTheScreen();
  });
});

describe('VenueCard with capacity', () => {
  it('renders the capacity label', () => {
    renderWithProviders(
      <VenueCard
        venue={
          {
            id: 'v1',
            venue_name: 'Hall',
            venue_type: 'BANQUET',
            capacity: 200,
            cover_image_url: null,
            locality: 'Andheri',
            city: 'Mumbai',
            state: 'MH',
          } as never
        }
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText(/200 capacity/)).toBeOnTheScreen();
  });
});
