import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { partnerPortalUrl } from '@duncit/onboarding';
import { STUDIO_OPTION_LIST } from '@duncit/utils';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useMe } from '@/hooks/useMe';
import { useMyVenues } from '@/hooks/useMyVenues';
import {
  BrandOptionsScreen,
  ClubOptionsScreen,
  HostOptionsScreen,
  VenueOptionsScreen,
} from '@/screens/StudioOptionsScreen';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/hooks/useFeatureFlag', () => ({ useFeatureFlag: jest.fn() }));
jest.mock('@/hooks/useMyVenues', () => ({ useMyVenues: jest.fn() }));

const mockedMe = useMe as jest.Mock;
const mockedFlag = useFeatureFlag as jest.Mock;
const mockedVenues = useMyVenues as jest.Mock;

const HALL = { id: 'v1', venue_name: 'Hall', city: 'Pune', status: 'APPROVED' };
const TURF = { id: 'v2', venue_name: 'Turf', city: 'Pune', status: 'SUBMITTED' };

const signedIn = (roles: string[]) =>
  mockedMe.mockReturnValue({ data: { me: { roles } }, isLoading: false });

const venuesState = (over: Record<string, unknown> = {}) => ({
  venues: [HALL, TURF],
  venue: HALL,
  venueId: 'v1',
  selectVenue: jest.fn(),
  isLoading: false,
  error: null,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedFlag.mockReturnValue(true);
  mockedVenues.mockReturnValue(venuesState());
});

describe('Studio Options screens', () => {
  // The order mWeb and the Partner console show too: all three render the one
  // shared catalogue, so this pins native to it option for option.
  it.each([
    ['VENUE', ['VENUE_OWNER'], VenueOptionsScreen],
    ['HOST', ['HOST'], HostOptionsScreen],
    ['CLUB', ['CLUB_ADMIN'], ClubOptionsScreen],
    ['ECOMM', ['ECOMM_MANAGER'], BrandOptionsScreen],
  ] as const)('lists the %s options in the shared catalogue order', (mode, roles, Screen) => {
    signedIn([...roles]);
    renderWithProviders(<Screen />);
    const rendered = screen
      .getAllByTestId(/^studio-option-(?!.*-external$)[a-z-]+$/)
      .map((row) => row.props.testID);
    expect(rendered).toEqual(
      STUDIO_OPTION_LIST[mode].map((option) => `studio-option-${option.key}`),
    );
  });

  it('lists every Venue option with its hint and opens the chosen screen', () => {
    signedIn(['VENUE_OWNER']);
    renderWithProviders(<VenueOptionsScreen />);

    expect(screen.getByTestId('venue-options-screen-title')).toHaveTextContent('Venue Options');
    // The page is about the venue picked at the top — several venues, so a switcher.
    expect(screen.getByTestId('venue-switcher')).toBeOnTheScreen();
    expect(screen.getByTestId('selected-venue-hint')).toBeOnTheScreen();

    const dashboard = screen.getByTestId('studio-option-dashboard');
    expect(dashboard).toHaveTextContent(/Dashboard/);
    expect(screen.getByTestId('studio-option-pods')).toHaveTextContent(/Pods at Your Venue/);
    expect(screen.getByTestId('studio-option-auto-pods')).toBeOnTheScreen();

    fireEvent.press(dashboard);
    expect(mockNavigate).toHaveBeenCalledWith('VenueManage');
    fireEvent.press(screen.getByTestId('studio-option-publish'));
    expect(mockNavigate).toHaveBeenCalledWith('VenuePublish');
  });

  it('names the one venue instead of a switcher, and drops Auto Pods while its flag is off', () => {
    signedIn(['VENUE_OWNER']);
    mockedFlag.mockReturnValue(false);
    mockedVenues.mockReturnValue(venuesState({ venues: [HALL] }));
    renderWithProviders(<VenueOptionsScreen />);

    expect(screen.queryByTestId('venue-switcher')).toBeNull();
    expect(screen.getByTestId('selected-venue-single')).toHaveTextContent(/Hall/);
    expect(screen.queryByTestId('studio-option-auto-pods')).toBeNull();
  });

  it('says so when the owner has no venues, and shows a failed load as an error', () => {
    signedIn(['VENUE_OWNER']);
    mockedVenues.mockReturnValue(venuesState({ venues: [], venue: null, venueId: null }));
    const { unmount } = renderWithProviders(<VenueOptionsScreen />);
    expect(screen.getByTestId('selected-venue-empty')).toHaveTextContent('You have no venues yet.');
    unmount();

    mockedVenues.mockReturnValue(
      venuesState({ venues: [], venue: null, venueId: null, error: 'Offline' }),
    );
    renderWithProviders(<VenueOptionsScreen />);
    expect(screen.getByTestId('selected-venue-error')).toHaveTextContent('Offline');
    expect(screen.queryByTestId('selected-venue-empty')).toBeNull();
  });

  it('opens a Brand option the app has no screen for in the Partner app', () => {
    signedIn(['ECOMM_MANAGER']);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(<BrandOptionsScreen />);

    expect(screen.getByTestId('brand-options-screen-title')).toHaveTextContent('Brand Options');
    expect(screen.getByTestId('studio-option-brands-external')).toHaveTextContent(
      'Opens in the Partner app',
    );
    // The brand dashboard is an app screen, so it carries no such marker.
    expect(screen.queryByTestId('studio-option-dashboard-external')).toBeNull();

    fireEvent.press(screen.getByTestId('studio-option-brands'));
    expect(open).toHaveBeenCalledWith(partnerPortalUrl('/ecomm-brand'));
    expect(mockNavigate).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('shows Host and Club options without a venue picker', () => {
    signedIn(['HOST', 'CLUB_ADMIN']);
    const { unmount } = renderWithProviders(<HostOptionsScreen />);
    expect(screen.queryByTestId('venue-switcher')).toBeNull();
    expect(mockedVenues).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('studio-option-publish'));
    expect(mockNavigate).toHaveBeenCalledWith('HostPublish');
    unmount();

    renderWithProviders(<ClubOptionsScreen />);
    fireEvent.press(screen.getByTestId('studio-option-clubs'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubManage');
  });

  it('lists nothing once the studio role is gone', () => {
    signedIn([]);
    renderWithProviders(<HostOptionsScreen />);
    expect(screen.queryByTestId('studio-options-list')).toBeNull();
  });
});
