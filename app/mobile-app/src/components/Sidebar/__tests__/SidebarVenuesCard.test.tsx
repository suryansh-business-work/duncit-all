import { fireEvent, screen } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';

import { SidebarVenuesCard } from '@/components/Sidebar/SidebarVenuesCard';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseBranding = jest.fn();
jest.mock('@/hooks/useBranding', () => ({ useBranding: () => mockUseBranding() }));
const mockUseVideoPlayer = useVideoPlayer as jest.Mock;

afterEach(() => jest.clearAllMocks());

describe('SidebarVenuesCard', () => {
  it('plays the branding video background and opens the Venues page on tap', () => {
    mockUseBranding.mockReturnValue({
      data: { branding: { venues_card_video_url: 'https://cdn/venues.mp4' } },
    });
    const onNavigate = jest.fn();
    renderWithProviders(<SidebarVenuesCard onNavigate={onNavigate} />);
    expect(screen.getByTestId('sidebar-venues-video')).toBeOnTheScreen();
    expect(screen.getByText('Venues')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-venues'));
    expect(onNavigate).toHaveBeenCalledWith('Venues');
  });

  it('re-asserts play only once the video reports ready', () => {
    mockUseBranding.mockReturnValue({
      data: { branding: { venues_card_video_url: 'https://cdn/venues.mp4' } },
    });
    renderWithProviders(<SidebarVenuesCard onNavigate={jest.fn()} />);
    const player = mockUseVideoPlayer.mock.results.at(-1)?.value;
    // The setup callback already played once; the readiness listener re-asserts.
    const [event, listener] = player.addListener.mock.calls[0];
    expect(event).toBe('statusChange');
    const playsBefore = player.play.mock.calls.length;
    listener({ status: 'loading' });
    expect(player.play.mock.calls.length).toBe(playsBefore);
    listener({ status: 'readyToPlay' });
    expect(player.play.mock.calls.length).toBe(playsBefore + 1);
  });

  it('renders without a video while branding has no URL', () => {
    mockUseBranding.mockReturnValue({ data: undefined });
    renderWithProviders(<SidebarVenuesCard onNavigate={jest.fn()} />);
    expect(screen.queryByTestId('sidebar-venues-video')).toBeNull();
    expect(screen.getByText('Discover spaces to meet near you')).toBeOnTheScreen();
  });
});
