import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VenueOfferModel, VenuePricingModel } from '@/generated/graphql/graphql';
import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { useVenuePricing } from '@/hooks/useVenuePricing';
import { useVenuesWithSettings } from '@/hooks/useVenuesWithSettings';
import { VenueFeesScreen } from '@/screens/VenueFeesScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useVenuesWithSettings', () => ({ useVenuesWithSettings: jest.fn() }));
jest.mock('@/hooks/useVenuePricing', () => ({ useVenuePricing: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockedVenues = useVenuesWithSettings as jest.Mock;
const mockedPricing = useVenuePricing as jest.Mock;

interface StoredOffers {
  min_guests: number;
  response_hours: number;
  min_business?: { model: string; amount: number }[];
  min_spend?: number;
}

// The venue takes at least ₹250 a guest and ₹4,000 a booking.
const stored: StoredOffers = {
  min_guests: 0,
  response_hours: 24,
  min_business: [{ model: 'PER_GUEST', amount: 250 }],
  min_spend: 4000,
};

const venue = (id: string, offers: StoredOffers | null) => ({
  id,
  venue_name: `Venue ${id}`,
  city: 'Pune',
  status: 'APPROVED',
  capacity: 40,
  capacity_items: [],
  offer_min_guests: offers?.min_guests || 6,
  offer_response_hours: offers?.response_hours || 48,
  settings: {
    offers,
    operating_hours: { open: '09:00', close: '22:00' },
    cancellation: { reschedule_only: false, tiers: [] },
  },
});

const pricing = {
  model: VenuePricingModel.PerPax,
  configured: true,
  base_rate: 300,
  min_pax: 1,
  max_pax: 0,
  min_hours: 1,
  max_hours: 0,
  booking_increment_minutes: 60,
  slots: [],
  operating_hours: [],
  price_rules: [],
  deposit: 100,
  cleaning_fee: 50,
  pet_fee: 25,
  gst_enabled: false,
  blocked_dates: [],
};

const refetch = jest.fn();
const savePricing = jest.fn();
const state = (over: Record<string, unknown> = {}) => ({
  venues: [venue('v1', stored)],
  venue: venue('v1', stored),
  venueId: 'v1',
  selectVenue: jest.fn(),
  isLoading: false,
  error: null,
  refetch,
  ...over,
});

const offerSaves = () =>
  mockRequest.mock.calls.filter(
    ([document, variables]) =>
      document === UpdateVenueSettingsDocument && 'offers' in variables.input,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ updateVenueSettings: { id: 'v1' } });
  savePricing.mockResolvedValue(undefined);
  mockedPricing.mockReturnValue({
    pricing,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    save: savePricing,
  });
});

describe('VenueFeesScreen — booking offers & minimum spend', () => {
  it('shows the booking offers with the stored minimum spend, above the fees, for the picked venue', () => {
    mockedVenues.mockReturnValue(state());
    renderWithProviders(<VenueFeesScreen />);
    expect(screen.getByTestId('venue-offer-settings-form')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-fees-card')).toBeOnTheScreen();
    expect(screen.getByTestId('field-min_spend').props.value).toBe('4000');
    expect(screen.getByText('0 uses Duncit’s default. In effect now: 6 guests.')).toBeOnTheScreen();
  });

  it('saves the offers with the minimum spend on their own, then re-reads the venue', async () => {
    mockedVenues.mockReturnValue(state());
    renderWithProviders(<VenueFeesScreen />);
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '10');
    fireEvent.changeText(screen.getByTestId('field-min_spend'), '5000');
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    await waitFor(() => expect(screen.getByTestId('venue-offer-settings-saved')).toBeOnTheScreen());
    expect(offerSaves()).toEqual([
      [
        UpdateVenueSettingsDocument,
        {
          venue_doc_id: 'v1',
          input: {
            offers: {
              min_guests: 10,
              response_hours: 24,
              min_business: [{ model: VenueOfferModel.PerGuest, amount: 250 }],
              min_spend: 5000,
              // The venue has not opted in to free bookings for initiatives, so it saves as off.
              free_booking: false,
            },
          },
        },
        { auth: true },
      ],
    ]);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(savePricing).not.toHaveBeenCalled();
  });

  it('refuses a negative minimum spend and sends nothing', async () => {
    mockedVenues.mockReturnValue(state());
    renderWithProviders(<VenueFeesScreen />);
    fireEvent.changeText(screen.getByTestId('field-min_spend'), '-5');
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    expect(await screen.findByText(/Enter an amount from 0 to/)).toBeOnTheScreen();
    expect(offerSaves()).toEqual([]);
  });

  it('starts a venue that stored no settings at the defaults and no minimum spend', () => {
    const fresh = {
      ...venue('v2', null),
      settings: { offers: null, operating_hours: { open: '09:00', close: '22:00' } },
    };
    mockedVenues.mockReturnValue(state({ venues: [fresh], venue: fresh, venueId: 'v2' }));
    renderWithProviders(<VenueFeesScreen />);
    expect(screen.getByTestId('field-min_guests').props.value).toBe('0');
    expect(screen.getByTestId('field-min_spend').props.value).toBe('0');
  });

  it('says why an offers save was refused and re-reads nothing', async () => {
    mockedVenues.mockReturnValue(state());
    mockRequest.mockRejectedValueOnce(new Error('Only the venue owner can do that'));
    renderWithProviders(<VenueFeesScreen />);
    fireEvent.press(screen.getByTestId('venue-offer-settings-save'));
    await waitFor(() =>
      expect(screen.getByTestId('venue-offer-settings-error')).toHaveTextContent(
        'Only the venue owner can do that',
      ),
    );
    expect(refetch).not.toHaveBeenCalled();
  });
});

describe('VenueFeesScreen — fees', () => {
  it('saves only the fees, sending the rest of the pricing back as saved', async () => {
    mockedVenues.mockReturnValue(state());
    renderWithProviders(<VenueFeesScreen />);
    fireEvent.changeText(screen.getByTestId('field-cleaning_fee'), '75');
    fireEvent.press(screen.getByTestId('venue-fees-save'));
    await waitFor(() => expect(screen.getByTestId('venue-fees-saved')).toBeOnTheScreen());
    expect(savePricing).toHaveBeenCalledTimes(1);
    const input = savePricing.mock.calls[0][0];
    expect(input).toMatchObject({
      model: VenuePricingModel.PerPax,
      base_rate: 300,
      deposit: 100,
      cleaning_fee: 75,
      pet_fee: 25,
      gst_enabled: false,
    });
    expect(input).not.toHaveProperty('min_spend');
    expect(offerSaves()).toEqual([]);
  });

  it('refuses a negative fee before it is sent', async () => {
    mockedVenues.mockReturnValue(state());
    renderWithProviders(<VenueFeesScreen />);
    fireEvent.changeText(screen.getByTestId('field-deposit'), '-1');
    fireEvent.press(screen.getByTestId('venue-fees-save'));
    await waitFor(() => expect(screen.getByTestId('field-deposit')).toBeOnTheScreen());
    await waitFor(() => expect(savePricing).not.toHaveBeenCalled());
    expect(screen.queryByTestId('venue-fees-saved')).toBeNull();
  });

  it('says why a fees save was refused', async () => {
    mockedVenues.mockReturnValue(state());
    savePricing.mockRejectedValueOnce(new Error('Pricing is locked'));
    renderWithProviders(<VenueFeesScreen />);
    fireEvent.press(screen.getByTestId('venue-fees-save'));
    await waitFor(() =>
      expect(screen.getByTestId('venue-fees-error')).toHaveTextContent('Pricing is locked'),
    );
  });

  it('shows the pricing loading, and why it could not be read', () => {
    mockedVenues.mockReturnValue(state());
    mockedPricing.mockReturnValue({
      pricing: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      save: savePricing,
    });
    const view = renderWithProviders(<VenueFeesScreen />);
    expect(screen.getByTestId('venue-fees-loading')).toBeOnTheScreen();
    mockedPricing.mockReturnValue({
      pricing: null,
      isLoading: false,
      error: 'offline',
      refetch: jest.fn(),
      save: savePricing,
    });
    view.rerender(<VenueFeesScreen />);
    expect(screen.getByTestId('venue-fees-load-error')).toHaveTextContent('offline');
  });
});

describe('VenueFeesScreen — states', () => {
  it('says when the venues could not be read, and while they load', () => {
    mockedVenues.mockReturnValue(
      state({ venues: [], venue: null, venueId: null, isLoading: true, error: 'offline' }),
    );
    renderWithProviders(<VenueFeesScreen />);
    expect(screen.getByTestId('venue-fees-screen-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-fees-screen-error')).toHaveTextContent('offline');
  });

  it('asks for a venue first when the owner has none', () => {
    mockedVenues.mockReturnValue(state({ venues: [], venue: null, venueId: null }));
    renderWithProviders(<VenueFeesScreen />);
    expect(screen.getByTestId('venue-fees-screen-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-offer-settings-form')).toBeNull();
  });
});
