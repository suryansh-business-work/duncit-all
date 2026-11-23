import { Linking } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { useRentalBookingDetail } from '@/hooks/useRentalBookingDetail';
import { VenueRentalBookingDetailScreen } from '@/screens/VenueRentalBookingDetailScreen';
import { rentalDetailFixture } from '@/utils/rental-detail-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'b1' } }),
}));
jest.mock('@/hooks/useRentalBookingDetail', () => ({ useRentalBookingDetail: jest.fn() }));
// Anything else a screen asks the server for (the date settings) stays pending.
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: jest.fn(() => new Promise(() => undefined)),
}));
// The photo picker/upload has its own spec; the stand-in "uploads" one photo when pressed.
jest.mock('@/components/create-pod/MediaUploadField/MediaUploadField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    MediaUploadField: ({
      value,
      onChange,
      error,
    }: {
      value: string;
      onChange: (text: string) => void;
      error?: string;
    }) => (
      <Text testID="stub-media-upload" onPress={() => onChange(`${value}\nhttp://x/proof.jpg`)}>
        {`${value}|${error ?? ''}`}
      </Text>
    ),
  };
});

const mockDetail = useRentalBookingDetail as jest.Mock;

const serve = (over: Record<string, unknown> = {}) => {
  const value = {
    detail: rentalDetailFixture(),
    failed: false,
    loading: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    addProof: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
  mockDetail.mockReturnValue(value);
  return value;
};

beforeEach(() => jest.clearAllMocks());

describe('VenueRentalBookingDetailScreen', () => {
  it('loads the rental the route names, showing progress until it arrives', () => {
    serve({ detail: null, loading: true });
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    expect(mockDetail).toHaveBeenCalledWith('b1');
    expect(screen.getByTestId('rental-detail-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('rental-detail-guest')).toBeNull();
  });

  it('says the rental could not load, and Retry asks again', () => {
    const value = serve({ detail: null, failed: true });
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    expect(screen.getByTestId('rental-detail-error')).toHaveTextContent(
      'The rental could not load',
    );
    fireEvent.press(screen.getByTestId('rental-detail-error-retry'));
    expect(value.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the guest with a phone the venue can tap to call, the pod and where it goes back', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    serve();
    renderWithProviders(<VenueRentalBookingDetailScreen />);

    expect(screen.getByText('Rental: Racket')).toBeOnTheScreen();
    expect(screen.getByTestId('rental-detail-item')).toHaveTextContent(/Cracked frame/);
    expect(screen.getByTestId('rental-detail-guest')).toHaveTextContent(/Asha Rao/);
    fireEvent.press(screen.getByTestId('rental-detail-guest-phone'));
    expect(open).toHaveBeenCalledWith('tel:+919876543210');
    expect(screen.getByTestId('rental-detail-pod')).toHaveTextContent(/Sunday Smash/);
    expect(screen.getByTestId('rental-detail-venue')).toHaveTextContent(
      /Smash Arena.*Ravi.*12 Court Road/,
    );
    // The venue's view carries no guest email and no payment: no row for them is drawn.
    expect(screen.queryByText('Email')).toBeNull();
    expect(screen.queryByText('Razorpay payment')).toBeNull();
    open.mockRestore();
  });

  it('leaves out a pod that is gone, and says an older booking’s deposit went back in cash', () => {
    const base = rentalDetailFixture();
    serve({
      detail: rentalDetailFixture({
        pod: null,
        booking: {
          ...base.booking,
          image_url: 'https://ik.imagekit.io/duncit/racket.jpg',
          damage_note: '',
          deposit_policy: 'VENUE_CASH',
        },
      }),
    });
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    expect(screen.queryByTestId('rental-detail-pod')).toBeNull();
    expect(screen.queryByTestId('rental-detail-damage-note')).toBeNull();
    expect(screen.getByLabelText('Racket')).toBeOnTheScreen();
    expect(screen.getByTestId('rental-detail-deposit-policy')).toHaveTextContent(
      /Handed back in cash at the venue \(older booking\)/,
    );
  });

  it('says a guest phone was not provided rather than leaving a blank', () => {
    serve({ detail: rentalDetailFixture({ guest: { name: 'Asha Rao', phone: null } }) });
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    expect(screen.queryByTestId('rental-detail-guest-phone')).toBeNull();
    expect(screen.getByTestId('rental-detail-guest')).toHaveTextContent(/Not provided/);
  });

  it('shows the money and where the Razorpay refund stands, with each attempt', () => {
    serve();
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    const money = screen.getByTestId('rental-detail-money');
    expect(money).toHaveTextContent(/Rent\s*₹\s?300/);
    expect(money).toHaveTextContent(/Damage kept\s*₹\s?200/);
    expect(money).toHaveTextContent(/Venue earns\s*₹\s?470/);
    expect(screen.getByTestId('rental-detail-deposit-policy')).toHaveTextContent(
      /Refunded by Duncit through Razorpay/,
    );
    expect(screen.getByTestId('rental-detail-refund-state')).toHaveTextContent(
      'Refund processing on Razorpay',
    );
    // Nothing reads refunded until Razorpay confirms it.
    expect(screen.getByTestId('rental-detail-refunded')).toHaveTextContent(/Refunded\s*₹\s?0/);
    const attempt = screen.getByTestId('rental-detail-refund-rf1');
    expect(attempt).toHaveTextContent(/Rental refund\s*₹\s?300/);
    expect(attempt).toHaveTextContent(/Processing/);
  });

  it('says why a refund waits for review, and that none was sent yet', () => {
    const base = rentalDetailFixture();
    serve({
      detail: rentalDetailFixture({
        booking: {
          ...base.booking,
          refund_state: 'REQUIRES_REVIEW',
          refund_review_reason: 'Payment was not through Razorpay',
        },
        refunds: [],
      }),
    });
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    expect(screen.getByTestId('rental-detail-refund-state')).toHaveTextContent(
      'Needs Finance review',
    );
    expect(screen.getByTestId('rental-detail-review-reason')).toHaveTextContent(
      /Payment was not through Razorpay/,
    );
    expect(screen.getByTestId('rental-detail-no-refunds')).toBeOnTheScreen();
  });

  it('lists each proof with who added it, and the activity in order', () => {
    serve();
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    const proof = screen.getByTestId('rental-detail-proof');
    expect(proof).toHaveTextContent(/Frame cracked at the throat/);
    expect(proof).toHaveTextContent(/Ravi \(Venue\)/);
    expect(screen.getByLabelText('Proof photo 1')).toBeOnTheScreen();
    const timeline = screen.getByTestId('rental-detail-timeline');
    expect(within(timeline).getByText('Marked damaged')).toBeOnTheScreen();
    expect(within(timeline).getByText('Refund queued on Razorpay')).toBeOnTheScreen();
    // An event with no person behind it is credited to Duncit.
    expect(timeline).toHaveTextContent(/Duncit · /);
  });

  it('says when there is no proof or activity yet', () => {
    serve({ detail: rentalDetailFixture({ proofs: [], events: [] }) });
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    expect(screen.getByTestId('rental-detail-no-proofs')).toHaveTextContent('No proof added');
    expect(screen.getByTestId('rental-detail-no-events')).toHaveTextContent('Nothing recorded yet');
  });

  it('Add proof opens the sheet, and what it saves becomes the rental the hook holds', async () => {
    const value = serve();
    renderWithProviders(<VenueRentalBookingDetailScreen />);
    fireEvent.press(screen.getByTestId('rental-detail-add-proof'));
    expect(screen.getByText('Add proof for Racket')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('stub-media-upload'));
    fireEvent.press(screen.getByTestId('rental-proof-save'));
    await waitFor(() =>
      expect(value.addProof).toHaveBeenCalledWith({ note: '', image_urls: ['http://x/proof.jpg'] }),
    );
    await waitFor(() => expect(screen.queryByTestId('rental-proof-sheet')).toBeNull());
  });
});
