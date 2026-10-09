import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { partnerPortalUrl } from '@duncit/onboarding';

import { useMe } from '@/hooks/useMe';
import { useMyVenues } from '@/hooks/useMyVenues';
import { HostPublishScreen, VenuePublishScreen } from '@/screens/PublishPageScreens';
import { VenueListScreen } from '@/screens/VenueListScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/hooks/useMyVenues', () => ({ useMyVenues: jest.fn() }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// The publish card fetches and renders its own panels (its suite covers them);
// these screens only decide whether it shows and for what.
const mockCard = jest.fn();
jest.mock('@/components/public-page', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    PublishPageCard: (props: { kind: string }) => {
      mockCard(props);
      return <V testID={`publish-card-${props.kind}`} />;
    },
  };
});

const mockedMe = useMe as jest.Mock;
const mockedVenues = useMyVenues as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;

const HALL = { id: 'v1', venue_name: 'Hall', city: 'Pune', status: 'APPROVED' };
const TURF = { id: 'v2', venue_name: 'Turf', city: 'Goa', status: 'SUBMITTED' };
const selectVenue = jest.fn();

const venuesState = (over: Record<string, unknown> = {}) => ({
  venues: [HALL, TURF],
  venue: HALL,
  venueId: 'v1',
  selectVenue,
  isLoading: false,
  error: null,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedVenues.mockReturnValue(venuesState());
  // Anything a screen asks for besides the pods stays pending.
  mockRequest.mockImplementation(() => new Promise(() => undefined));
});

describe('VenueListScreen', () => {
  it('lists every venue; a tap selects it and opens its dashboard', () => {
    renderWithProviders(<VenueListScreen />);
    expect(screen.getByTestId('venue-list-row-v1')).toHaveTextContent(/Hall/);
    expect(screen.getByTestId('venue-list-status-v2')).toHaveTextContent('SUBMITTED');
    // The selected venue is the one marked as such.
    expect(screen.getByTestId('venue-list-row-v1')).toHaveProp('aria-selected', true);
    expect(screen.getByTestId('venue-list-row-v2')).toHaveProp('aria-selected', false);

    fireEvent.press(screen.getByTestId('venue-list-row-v2'));
    expect(selectVenue).toHaveBeenCalledWith('v2');
    expect(mockNavigate).toHaveBeenCalledWith('VenueManage');
  });

  it('adds and edits a venue in the Partner app', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(<VenueListScreen />);
    fireEvent.press(screen.getByTestId('venue-list-add'));
    expect(open).toHaveBeenCalledWith(partnerPortalUrl('/register-venue/new'));
    fireEvent.press(screen.getByTestId('venue-list-edit-v2'));
    expect(open).toHaveBeenCalledWith(partnerPortalUrl('/register-venue/v2'));
    expect(selectVenue).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('tells an owner with no venues so, but never on a failed load', () => {
    mockedVenues.mockReturnValue(venuesState({ venues: [], venue: null, venueId: null }));
    const { unmount } = renderWithProviders(<VenueListScreen />);
    expect(screen.getByTestId('venue-list-empty')).toBeOnTheScreen();
    unmount();

    mockedVenues.mockReturnValue(
      venuesState({ venues: [], venue: null, venueId: null, error: 'Offline' }),
    );
    renderWithProviders(<VenueListScreen />);
    expect(screen.getByTestId('venue-list-error')).toHaveTextContent('Offline');
    expect(screen.queryByTestId('venue-list-empty')).toBeNull();
  });
});

describe('Publish screens', () => {
  it('publishes the selected venue once it is approved', () => {
    renderWithProviders(<VenuePublishScreen />);
    expect(mockCard).toHaveBeenCalledWith({ kind: 'VENUE', refId: 'v1', title: 'Hall' });
    expect(screen.queryByTestId('venue-publish-needs-approval')).toBeNull();
  });

  it('explains that a venue under review cannot be published yet', () => {
    mockedVenues.mockReturnValue(venuesState({ venue: TURF, venueId: 'v2' }));
    renderWithProviders(<VenuePublishScreen />);
    expect(screen.queryByTestId('publish-card-VENUE')).toBeNull();
    expect(screen.getByTestId('venue-publish-needs-approval')).toHaveTextContent(
      'Your venue can be published once it is approved.',
    );
  });

  it('publishes the host page only for an approved host', () => {
    mockedMe.mockReturnValue({
      data: { me: { roles: ['HOST'], full_name: 'Asha Roy', username: 'asha' } },
      isLoading: false,
    });
    const { unmount } = renderWithProviders(<HostPublishScreen />);
    expect(mockCard).toHaveBeenCalledWith({ kind: 'HOST', title: 'Asha Roy' });
    unmount();

    mockedMe.mockReturnValue({ data: { me: { roles: [], full_name: 'Asha' } }, isLoading: false });
    renderWithProviders(<HostPublishScreen />);
    expect(screen.queryByTestId('publish-card-HOST')).toBeNull();
  });
});
