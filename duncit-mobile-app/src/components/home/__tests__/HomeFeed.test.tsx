import { fireEvent, screen } from '@testing-library/react-native';

import { HomeFeed } from '@/components/home/HomeFeed';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/status/StatusRail', () => ({ StatusRail: () => null }));
jest.mock('@/hooks/useHomeFeed', () => ({ useHomeFeed: jest.fn() }));
jest.mock('@/hooks/useMe', () => ({
  useMe: () => ({ data: { me: { first_name: 'Sam', profile_photo: null } } }),
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockedFeed = useHomeFeed as jest.Mock;

const pod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Sunset Jam',
  pod_date_time: '2026-06-10T18:30:00.000Z',
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  no_of_spots: 4,
  host_names: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  place_label: null,
  place_detail: null,
};
const club = {
  id: 'c1',
  club_id: 'cl-1',
  club_name: 'Runners',
  club_description: 'We run',
  club_feature_images_and_videos: [],
  category_id: null,
  super_category_id: null,
};

const base = {
  isLoading: false,
  hasData: true,
  categoryChips: [{ id: 'cat1', name: 'Music', slug: 'm', level: 'CATEGORY', parent_id: null }],
  clubsWithPods: [{ club, pods: [pod] }],
  featuredPods: [pod],
  totalPods: 1,
  refetch: jest.fn(),
};

beforeEach(() => {
  mockNavigate.mockClear();
  mockedFeed.mockReturnValue(base);
});

describe('HomeFeed', () => {
  it('renders the sections and opens a club + pod', () => {
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-feed')).toBeOnTheScreen();
    expect(screen.getByText('Runners')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('club-section-cl-1'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubDetails', { clubId: 'c1', title: 'Runners' });

    fireEvent.press(screen.getAllByTestId('pod-card-pod-1')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Sunset Jam' });
  });

  it('shows the empty state', () => {
    mockedFeed.mockReturnValue({ ...base, clubsWithPods: [], featuredPods: [], totalPods: 0 });
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-empty')).toBeOnTheScreen();
  });

  it('shows the skeleton on first load', () => {
    mockedFeed.mockReturnValue({ ...base, isLoading: true, hasData: false });
    renderWithProviders(<HomeFeed />);
    expect(screen.getByTestId('home-skeleton')).toBeOnTheScreen();
  });
});
