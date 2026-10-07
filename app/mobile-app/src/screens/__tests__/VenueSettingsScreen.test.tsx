import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { useVenuesWithSettings } from '@/hooks/useVenuesWithSettings';
import { VenueSettingsScreen } from '@/screens/VenueSettingsScreen';
import { HostRequestLimitCard } from '@/screens/VenueSettingsScreen/HostRequestLimitCard';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useVenuesWithSettings', () => ({ useVenuesWithSettings: jest.fn() }));
// The cancellation-policy form is the screen's older half, covered by its own form spec.
jest.mock('@/forms/venue-settings', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    ...jest.requireActual('@/forms/venue-settings'),
    VenueSettingsForm: () => <V testID="cancellation-form-stub" />,
  };
});

const mockRequest = graphqlRequest as jest.Mock;
const mockedVenues = useVenuesWithSettings as jest.Mock;

const venue = (override: number | null = null) =>
  ({
    id: 'v1',
    venue_name: 'Hall',
    settings: { rules: { max_host_requests_per_month: 8 }, cancellation: null },
    host_requests_limit_override: override,
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockReset();
});

describe('HostRequestLimitCard', () => {
  it("saves the venue's monthly cap under its rules and re-reads the venues", async () => {
    mockRequest.mockResolvedValueOnce({ updateVenueSettings: { id: 'v1' } });
    const onSaved = jest.fn();
    renderWithProviders(<HostRequestLimitCard venue={venue()} onSaved={onSaved} />);
    expect(screen.getByTestId('field-limit').props.value).toBe('8');

    fireEvent.changeText(screen.getByTestId('field-limit'), '15');
    fireEvent.press(screen.getByTestId('venue-host-request-limit-form-save'));
    await waitFor(() =>
      expect(screen.getByTestId('venue-host-request-limit-form-saved')).toBeOnTheScreen(),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      UpdateVenueSettingsDocument,
      { venue_doc_id: 'v1', input: { rules: { max_host_requests_per_month: 15 } } },
      { auth: true },
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("shows Duncit's cap, and a refused save without re-reading", async () => {
    mockRequest.mockRejectedValueOnce(new Error('Not your venue'));
    const onSaved = jest.fn();
    renderWithProviders(<HostRequestLimitCard venue={venue(2)} onSaved={onSaved} />);
    expect(screen.getByTestId('venue-host-request-limit-form-override')).toHaveTextContent(
      'Set by Duncit: 2 per month.',
    );
    fireEvent.press(screen.getByTestId('venue-host-request-limit-form-save'));
    await waitFor(() =>
      expect(screen.getByTestId('venue-host-request-limit-form-error')).toHaveTextContent(
        'Not your venue',
      ),
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByTestId('venue-host-request-limit-form-saved')).toBeNull();
  });

  it('starts from 0 for a venue with no saved rules, and words a bare failure', async () => {
    mockRequest.mockRejectedValueOnce({});
    renderWithProviders(
      <HostRequestLimitCard
        venue={
          {
            id: 'v2',
            venue_name: 'New',
            settings: null,
            host_requests_limit_override: null,
          } as never
        }
        onSaved={jest.fn()}
      />,
    );
    expect(screen.getByTestId('field-limit').props.value).toBe('0');
    fireEvent.press(screen.getByTestId('venue-host-request-limit-form-save'));
    await waitFor(() =>
      expect(screen.getByTestId('venue-host-request-limit-form-error')).toHaveTextContent(
        /Something went wrong/,
      ),
    );
  });
});

describe('VenueSettingsScreen', () => {
  const api = (over: Record<string, unknown> = {}) => ({
    venues: [venue()],
    venue: venue(),
    venueId: 'v1',
    selectVenue: jest.fn(),
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  });

  it('adds the monthly host-request cap for the picked venue, re-reading after a save', async () => {
    const value = api();
    mockedVenues.mockReturnValue(value);
    mockRequest.mockResolvedValueOnce({ updateVenueSettings: { id: 'v1' } });
    renderWithProviders(<VenueSettingsScreen />);
    expect(screen.getByTestId('venue-host-request-limit')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-host-request-limit-form-save'));
    await waitFor(() => expect(value.refetch).toHaveBeenCalledTimes(1));
  });

  it('has no cap card without a venue', () => {
    mockedVenues.mockReturnValue(api({ venues: [], venue: null, venueId: null }));
    renderWithProviders(<VenueSettingsScreen />);
    expect(screen.getByTestId('venue-settings-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-host-request-limit')).toBeNull();
  });
});
