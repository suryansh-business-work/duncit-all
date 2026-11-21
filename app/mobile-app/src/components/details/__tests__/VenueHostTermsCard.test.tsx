import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { VenueHostTerms } from '@duncit/utils';

import { VenueHostTermsCard } from '@/components/details/VenueHostTermsCard';
import { graphqlRequest } from '@/services/graphql.client';
import { useAuthStore } from '@/stores/auth.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const terms = (over: Partial<VenueHostTerms> = {}): VenueHostTerms => ({
  venue_id: 'v1',
  min_guests: 8,
  min_business: [{ model: 'PER_HOUR', amount: 800 }],
  min_spend: 5000,
  cleaning_fee: 500,
  pet_fee: 0,
  deposit: 2000,
  gst_enabled: true,
  ...over,
});

beforeEach(() => {
  mockRequest.mockReset();
  mockNavigate.mockReset();
  useAuthStore.setState({ token: 'signed-in' } as never);
});

afterAll(() => useAuthStore.setState({ token: null } as never));

describe('VenueHostTermsCard', () => {
  it("shows a host the venue's minimums and fees, and picks it for a new pod", async () => {
    mockRequest.mockResolvedValueOnce({ venueHostTerms: [terms()] });
    renderWithProviders(<VenueHostTermsCard venueId="v1" />);

    expect(await screen.findByTestId('venue-host-terms')).toBeTruthy();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { venue_ids: ['v1'] },
      { auth: true },
    );
    // Each row also holds its check icon's glyph, so the line is read from its own text.
    const line = (id: string) => within(screen.getByTestId(`venue-host-terms-${id}`));
    expect(line('minSpend').getByText('Minimum spend ₹5,000 per booking')).toBeTruthy();
    expect(line('minBusiness-PER_HOUR').getByText('₹800 per hour')).toBeTruthy();
    expect(line('minGuests').getByText('Paid for at least 8 guests')).toBeTruthy();
    expect(line('cleaningFee').getByText('Cleaning fee ₹500')).toBeTruthy();
    expect(
      line('deposit').getByText('Refundable deposit ₹2,000, settled at the venue'),
    ).toBeTruthy();
    expect(screen.getByTestId('venue-host-terms-gst')).toBeTruthy();
    expect(screen.queryByTestId('venue-host-terms-petFee')).toBeNull();

    fireEvent.press(screen.getByTestId('venue-pick-for-pod'));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePod', { pickVenueId: 'v1' });
  });

  it('says so when the venue sets no minimums or fees', async () => {
    mockRequest.mockResolvedValueOnce({
      venueHostTerms: [
        terms({
          min_guests: 0,
          min_business: [],
          min_spend: 0,
          cleaning_fee: 0,
          deposit: 0,
          gst_enabled: false,
        }),
      ],
    });
    renderWithProviders(<VenueHostTermsCard venueId="v1" />);
    expect(await screen.findByTestId('venue-host-terms-none')).toHaveTextContent(
      'This venue sets no minimums or extra fees.',
    );
    expect(screen.getByTestId('venue-pick-for-pod')).toBeTruthy();
  });

  it('shows nothing to a member the server gives no terms', async () => {
    mockRequest.mockResolvedValueOnce({ venueHostTerms: [] });
    renderWithProviders(<VenueHostTermsCard venueId="v1" />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('venue-host-terms')).toBeNull();
    expect(screen.queryByTestId('venue-pick-for-pod')).toBeNull();
  });

  it('does not ask for a signed-out visitor', () => {
    useAuthStore.setState({ token: null } as never);
    renderWithProviders(<VenueHostTermsCard venueId="v1" />);
    expect(mockRequest).not.toHaveBeenCalled();
    expect(screen.queryByTestId('venue-host-terms')).toBeNull();
  });

  it('says the fees could not load, and retries', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ venueHostTerms: [terms()] });
    renderWithProviders(<VenueHostTermsCard venueId="v1" />);
    expect(
      await screen.findByText('Could not load this venue’s fees and minimum spend.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByTestId('venue-host-terms-retry'));
    expect(await screen.findByTestId('venue-host-terms')).toBeTruthy();
  });
});
