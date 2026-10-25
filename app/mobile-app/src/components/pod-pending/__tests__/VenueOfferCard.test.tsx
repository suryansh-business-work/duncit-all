import { fireEvent, screen } from '@testing-library/react-native';

import { VenueOfferCard } from '@/components/pod-pending';
import { usePodVenueOffer } from '@/hooks/usePodVenueOffer';
import { renderWithProviders } from '@/utils/test-utils';
import { counteredOffer, hostAnswersApi } from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/usePodVenueOffer', () => ({ usePodVenueOffer: jest.fn() }));
jest.mock('@/hooks/useCounterQuote', () => ({
  useCounterQuote: () => ({ result: null, error: null, isLoading: false }),
}));
const mockUse = usePodVenueOffer as jest.Mock;

const mount = (onAnswered = jest.fn()) => {
  renderWithProviders(
    <VenueOfferCard
      podId="pod-1"
      podTitle="Sunday Badminton"
      venueName="Court House"
      podIsFree={false}
      onAnswered={onAnswered}
    />,
  );
  return onAnswered;
};

beforeEach(() => mockUse.mockReset());

describe('VenueOfferCard', () => {
  it('shows nothing for a pod with no live offer', () => {
    mockUse.mockReturnValue({ offer: null, refresh: jest.fn(), host: hostAnswersApi() });
    const onAnswered = mount();
    expect(screen.queryByTestId('venue-offer-card')).toBeNull();
    // The screen's own re-read goes with the answers.
    expect(mockUse).toHaveBeenCalledWith('pod-1', onAnswered);
  });

  it("shows the venue's counter from the host's side with the host's answers", () => {
    mockUse.mockReturnValue({
      offer: counteredOffer(),
      refresh: jest.fn(),
      host: hostAnswersApi(),
    });
    mount();
    expect(screen.getByText('Your offer to the venue')).toBeOnTheScreen();
    expect(screen.getByText("The venue's counter")).toBeOnTheScreen();
    expect(screen.getByTestId('host-offer-accept')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-offer-notice')).toBeNull();
  });

  it('says what the last answer came to, and a tap dismisses it', () => {
    const host = hostAnswersApi({
      notice: { tone: 'warning', text: 'The terms changed while you were reading them.' },
    });
    mockUse.mockReturnValue({ offer: counteredOffer(), refresh: jest.fn(), host });
    mount();
    fireEvent.press(screen.getByTestId('venue-offer-notice'));
    expect(host.clearNotice).toHaveBeenCalled();
  });

  it('shows a sent answer in the success tone', () => {
    const host = hostAnswersApi({
      notice: { tone: 'success', text: 'Your counter was sent to the venue.' },
    });
    mockUse.mockReturnValue({ offer: counteredOffer(), refresh: jest.fn(), host });
    mount();
    expect(screen.getByTestId('venue-offer-notice')).toHaveTextContent(
      'Your counter was sent to the venue.',
    );
  });
});
