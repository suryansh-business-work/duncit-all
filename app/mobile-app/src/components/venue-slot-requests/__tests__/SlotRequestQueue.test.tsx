import { fireEvent, screen } from '@testing-library/react-native';

import { SlotRequestQueue } from '@/components/venue-slot-requests/SlotRequestQueue';
import { SlotPricingMode } from '@/generated/graphql/graphql';
import { ALL_VENUES, useVenueSlotRequests } from '@/hooks/useVenueSlotRequests';
import { renderWithProviders } from '@/utils/test-utils';
import { offerTerms, venueAnswersApi } from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/useVenueSlotRequests', () => ({
  ...jest.requireActual('@/hooks/useVenueSlotRequests'),
  useVenueSlotRequests: jest.fn(),
}));
const mockUse = useVenueSlotRequests as jest.Mock;

const row = {
  slot_id: 'slot-1',
  venue_id: 'venue-1',
  venue_name: 'Indiranagar Courts',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  pricing_mode: SlotPricingMode.Flat,
  overtime_rate: 0,
  whole_day: false,
  price: 1200,
  requested_at: '2026-08-25T09:00:00.000Z',
  pod_id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_description: '',
  host_name: 'Meera N',
  host_email: null,
  host_phone: null,
  pod_is_free: false,
  offer: { ...offerTerms(), history: [] },
};

const state = (over: Record<string, unknown> = {}) => ({
  venueId: ALL_VENUES,
  setVenueId: jest.fn(),
  venues: [
    { id: 'v1', venue_name: 'Hall' },
    { id: 'v2', venue_name: '' },
  ],
  requests: [row],
  isLoading: false,
  answers: venueAnswersApi(),
  refetch: jest.fn(),
  ...over,
});

beforeEach(() => mockUse.mockReset());

describe('SlotRequestQueue', () => {
  it('lists the requests with a venue filter, and tells the screen after any answer', () => {
    const onDecided = jest.fn();
    const slots = state();
    mockUse.mockReturnValue(slots);
    renderWithProviders(<SlotRequestQueue onDecided={onDecided} />);
    expect(mockUse).toHaveBeenCalledWith(onDecided);
    expect(screen.getByTestId('slot-request-slot-1')).toBeOnTheScreen();
    expect(screen.getByText('Untitled venue')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('slot-requests-venue-v1'));
    expect(slots.setVenueId).toHaveBeenCalledWith('v1');
    fireEvent.press(screen.getByTestId('slot-requests-venue-all'));
    expect(slots.setVenueId).toHaveBeenCalledWith(ALL_VENUES);
  });

  it('says what the last answer came to, and a tap dismisses it', () => {
    const answers = venueAnswersApi({
      notice: { tone: 'warning', text: 'The terms changed while you were reading them.' },
    });
    mockUse.mockReturnValue(state({ answers, venues: [{ id: 'v1', venue_name: 'Hall' }] }));
    renderWithProviders(<SlotRequestQueue onDecided={jest.fn()} />);
    // One venue: nothing to filter.
    expect(screen.queryByTestId('slot-requests-venue-all')).toBeNull();
    fireEvent.press(screen.getByTestId('slot-request-feedback'));
    expect(answers.clearNotice).toHaveBeenCalled();
  });

  it('shows the spinner while loading, then the empty sentence', () => {
    mockUse.mockReturnValue(state({ isLoading: true, requests: [] }));
    const view = renderWithProviders(<SlotRequestQueue onDecided={jest.fn()} />);
    expect(screen.getByTestId('slot-request-loading')).toBeOnTheScreen();
    expect(screen.queryByText(/^No pending slot requests right now./)).toBeNull();

    mockUse.mockReturnValue(state({ requests: [] }));
    view.rerender(<SlotRequestQueue onDecided={jest.fn()} />);
    expect(screen.queryByTestId('slot-request-loading')).toBeNull();
    expect(screen.getByText(/^No pending slot requests right now./)).toBeOnTheScreen();
  });
});
