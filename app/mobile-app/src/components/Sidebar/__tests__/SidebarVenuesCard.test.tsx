import { fireEvent, screen } from '@testing-library/react-native';

import { SidebarVenuesCard } from '@/components/Sidebar/SidebarVenuesCard';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseBranding = jest.fn();
jest.mock('@/hooks/useBranding', () => ({ useBranding: () => mockUseBranding() }));

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

  it('renders without a video while branding has no URL', () => {
    mockUseBranding.mockReturnValue({ data: undefined });
    renderWithProviders(<SidebarVenuesCard onNavigate={jest.fn()} />);
    expect(screen.queryByTestId('sidebar-venues-video')).toBeNull();
    expect(screen.getByText('Discover spaces to meet near you')).toBeOnTheScreen();
  });
});
