import { Linking } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { ActionBlock } from '@/components/pod-request-detail/ActionBlock';
import { ContactBlock } from '@/components/pod-request-detail/ContactBlock';
import { CounterpartCard } from '@/components/pod-request-detail/CounterpartCard';
import { SlotSummary } from '@/components/pod-request-detail/SlotSummary';
import { VenueOfferModel } from '@/generated/graphql/graphql';
import type { PodRequestActions } from '@/hooks/usePodRequestActions';
import type { PodRequestDetail } from '@/hooks/usePodRequestDetail';
import { graphqlRequest } from '@/services/graphql.client';
import { useAppSettingsStore } from '@/stores/app-settings.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const OFFER = {
  start_at: '2030-01-05T13:00:00.000Z',
  end_at: '2030-01-05T16:00:00.000Z',
  space_label: '',
  model: VenueOfferModel.PerGuest,
  rate: 300,
  pax: 20,
};

// The window-and-terms sheet is shared and tested on its own; here it only has
// to be opened for the right venue, price through this request and send.
const mockSheet = jest.fn();
jest.mock('@/forms/window-offer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable: P } = require('react-native');
  return {
    WindowOfferForm: (props: {
      venueId: string;
      onSubmit: (offer: unknown) => void;
      priceOf: (offer: unknown) => unknown;
    }) => {
      mockSheet(props);
      return <P testID="propose-sheet-submit" onPress={() => props.onSubmit(mockOffer())} />;
    },
  };
});
const mockOffer = () => OFFER;

const venue = {
  id: 'v1',
  venue_name: 'Hall',
  category: 'Sports',
  categories: ['Sports'],
  venue_type: 'Indoor',
  capacity: 40,
  locality: 'Bandra',
  city: 'Mumbai',
  cover_image_url: '',
};
const host = { user_id: 'u1', name: 'Asha', photo_url: '', categories: ['Yoga', 'Dance'] };

const detail = (over: Partial<PodRequestDetail> = {}): PodRequestDetail =>
  ({
    id: 'r1',
    direction: 'VENUE_TO_HOST',
    status: 'REQUESTED',
    viewer_side: 'HOST',
    note: '',
    distance_km: 2.345,
    venue,
    host,
    slot: null,
    pod_id: null,
    contact: null,
    created_at: '2030-01-01T00:00:00.000Z',
    ...over,
  }) as PodRequestDetail;

const actions = (over: Partial<PodRequestActions> = {}): PodRequestActions => ({
  error: '',
  clearError: jest.fn(),
  busy: false,
  respond: jest.fn().mockResolvedValue(true),
  withdraw: jest.fn().mockResolvedValue(true),
  proposeWindow: jest.fn().mockResolvedValue(true),
  priceWindow: jest.fn().mockResolvedValue({ ok: true, message: null, quote: null }),
  respondSlot: jest.fn().mockResolvedValue(true),
  ...over,
});

const slot = (id: string, space_label: string) => ({
  id,
  start_at: '2030-01-05T13:00:00.000Z',
  end_at: '2030-01-05T14:30:00.000Z',
  whole_day: false,
  price: 500,
  status: 'AVAILABLE',
  space_label,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockReset();
  // Loaded settings: the formatter never fetches, and dates read the same everywhere.
  useAppSettingsStore.setState({
    data: {
      publicAppSettings: {
        date_format: 'dd/MM/yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
      },
    } as never,
  });
});

afterAll(() => useAppSettingsStore.setState({ data: undefined }));

describe('ActionBlock', () => {
  it('RESPOND: the receiver accepts or declines', () => {
    const a = actions();
    renderWithProviders(<ActionBlock request={detail()} actions={a} />);
    fireEvent.press(screen.getByTestId('pod-request-respond-accept'));
    fireEvent.press(screen.getByTestId('pod-request-respond-decline'));
    expect(a.respond).toHaveBeenNthCalledWith(1, 'r1', true);
    expect(a.respond).toHaveBeenNthCalledWith(2, 'r1', false);
  });

  it('WITHDRAW: the sender waits and may withdraw', () => {
    const a = actions();
    renderWithProviders(
      <ActionBlock request={detail({ direction: 'HOST_TO_VENUE' } as never)} actions={a} />,
    );
    expect(screen.getByTestId('pod-request-waiting')).toHaveTextContent(
      'Waiting for the other side to answer.',
    );
    fireEvent.press(screen.getByTestId('pod-request-withdraw'));
    expect(a.withdraw).toHaveBeenCalledWith('r1');
  });

  it('PICK_SLOT: the receiver proposes a time and a price on the venue’s calendar', async () => {
    const a = actions();
    renderWithProviders(
      <ActionBlock request={detail({ status: 'ACCEPTED' } as never)} actions={a} />,
    );
    expect(screen.queryByTestId('propose-sheet-submit')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-request-open-propose'));
    expect(a.clearError).toHaveBeenCalled();
    const sheet = mockSheet.mock.calls.at(-1)?.[0];
    expect(sheet.venueId).toBe('v1');
    // The sheet prices through this request's own quote.
    await sheet.priceOf(OFFER);
    expect(a.priceWindow).toHaveBeenCalledWith('r1', OFFER);

    fireEvent.press(screen.getByTestId('propose-sheet-submit'));
    expect(a.proposeWindow).toHaveBeenCalledWith('r1', OFFER);
    // A sent proposal closes the sheet.
    await waitFor(() => expect(screen.queryByTestId('propose-sheet-submit')).toBeNull());
  });

  it('PICK_SLOT keeps the sheet open when the proposal is refused', async () => {
    const a = actions({ proposeWindow: jest.fn().mockResolvedValue(false) });
    renderWithProviders(
      <ActionBlock request={detail({ status: 'ACCEPTED' } as never)} actions={a} />,
    );
    fireEvent.press(screen.getByTestId('pod-request-open-propose'));
    fireEvent.press(screen.getByTestId('propose-sheet-submit'));
    await waitFor(() => expect(a.proposeWindow).toHaveBeenCalled());
    expect(screen.getByTestId('propose-sheet-submit')).toBeOnTheScreen();
  });

  it('PICK_SLOT without a venue draws nothing', () => {
    renderWithProviders(
      <ActionBlock
        request={detail({ status: 'ACCEPTED', venue: null } as never)}
        actions={actions()}
      />,
    );
    expect(screen.queryByTestId('pod-request-propose')).toBeNull();
  });

  it.each([
    [
      'WAIT_SLOT',
      { direction: 'HOST_TO_VENUE', status: 'ACCEPTED' },
      'Waiting for the other side to propose a time and price.',
    ],
    [
      'WAIT_CONFIRM',
      { status: 'SLOT_REQUESTED' },
      'Waiting for the other side to confirm the proposal.',
    ],
    [
      'HOST_CREATES',
      { status: 'SLOT_CONFIRMED', viewer_side: 'VENUE' },
      'The slot is confirmed. The host creates the pod next.',
    ],
  ])('%s says whose move it is', (_action, over, text) => {
    renderWithProviders(<ActionBlock request={detail(over as never)} actions={actions()} />);
    expect(screen.getByTestId('pod-request-waiting')).toHaveTextContent(text);
  });

  it('CONFIRM_SLOT: the sender confirms or declines the proposed time and price', () => {
    const a = actions();
    renderWithProviders(
      <ActionBlock
        request={detail({ direction: 'HOST_TO_VENUE', status: 'SLOT_REQUESTED' } as never)}
        actions={a}
      />,
    );
    expect(screen.getByTestId('pod-request-slot-answer-accept')).toHaveTextContent(
      'Confirm proposal',
    );
    fireEvent.press(screen.getByTestId('pod-request-slot-answer-accept'));
    fireEvent.press(screen.getByTestId('pod-request-slot-answer-decline'));
    expect(a.respondSlot).toHaveBeenNthCalledWith(1, 'r1', true);
    expect(a.respondSlot).toHaveBeenNthCalledWith(2, 'r1', false);
  });

  it('CREATE_POD: the host opens Create Pod with this request', () => {
    renderWithProviders(
      <ActionBlock request={detail({ status: 'SLOT_CONFIRMED' } as never)} actions={actions()} />,
    );
    fireEvent.press(screen.getByTestId('pod-request-create-pod'));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePod', { partnerRequestId: 'r1' });
  });

  it.each(['POD_CREATED', 'REJECTED', 'CANCELLED', 'EXPIRED'])(
    'offers no move once the request is %s',
    (status) => {
      renderWithProviders(
        <ActionBlock request={detail({ status } as never)} actions={actions()} />,
      );
      expect(screen.queryByTestId('pod-request-waiting')).toBeNull();
      expect(screen.queryByTestId('pod-request-respond')).toBeNull();
      expect(screen.queryByTestId('pod-request-create-pod')).toBeNull();
    },
  );
});

describe('CounterpartCard', () => {
  it('shows a host the venue: type, capacity, place, distance and the note', () => {
    renderWithProviders(<CounterpartCard request={detail({ note: 'Weekend?' })} />);
    const card = screen.getByTestId('pod-request-counterpart');
    expect(within(card).getByText('Venue')).toBeOnTheScreen();
    expect(within(card).getByText('Hall')).toBeOnTheScreen();
    expect(within(card).getByText('Sports · Indoor')).toBeOnTheScreen();
    expect(within(card).getByText('Capacity 40')).toBeOnTheScreen();
    expect(within(card).getByText('Bandra, Mumbai')).toBeOnTheScreen();
    expect(within(card).getByText('2.3 km away')).toBeOnTheScreen();
    expect(within(card).getByText('Weekend?')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-request-status')).toHaveTextContent('Requested');
  });

  it('shows a venue owner the host, and leaves out what is unknown', () => {
    renderWithProviders(
      <CounterpartCard request={detail({ viewer_side: 'VENUE', distance_km: null } as never)} />,
    );
    const card = screen.getByTestId('pod-request-counterpart');
    expect(within(card).getByText('Host')).toBeOnTheScreen();
    expect(within(card).getByText('Asha')).toBeOnTheScreen();
    expect(within(card).getByText('Yoga · Dance')).toBeOnTheScreen();
    expect(within(card).queryByText(/km away/)).toBeNull();
    expect(within(card).queryByText('Note')).toBeNull();
  });

  it('hides a zero capacity and copes with a missing venue', () => {
    renderWithProviders(
      <CounterpartCard request={detail({ venue: { ...venue, capacity: 0, venue_type: '' } })} />,
    );
    expect(screen.queryByText(/Capacity/)).toBeNull();
    expect(screen.getByText('Sports')).toBeOnTheScreen();
  });

  it('shows every category of a venue in several, primary first', () => {
    renderWithProviders(
      <CounterpartCard
        request={detail({ venue: { ...venue, categories: ['Sports', 'Wellness', 'Arts'] } })}
      />,
    );
    expect(screen.getByText('Sports · Wellness · Arts · Indoor')).toBeOnTheScreen();
  });

  it('still shows the one category of an answer that carries no list', () => {
    const { categories: _categories, ...legacy } = venue;
    renderWithProviders(<CounterpartCard request={detail({ venue: legacy } as never)} />);
    expect(screen.getByText('Sports · Indoor')).toBeOnTheScreen();
  });
});

describe('SlotSummary', () => {
  it('reads a timed slot in the admin’s zone and format, on the whole venue', () => {
    renderWithProviders(<SlotSummary slot={slot('s1', '') as never} />);
    const card = screen.getByTestId('pod-request-slot');
    expect(within(card).getByText('05/01/2030 · 18:30 – 20:00')).toBeOnTheScreen();
    expect(within(card).getByText('Whole venue')).toBeOnTheScreen();
  });

  it('reads a whole-day slot by its date, on its space', () => {
    renderWithProviders(
      <SlotSummary slot={{ ...slot('s1', 'Court A'), whole_day: true } as never} />,
    );
    expect(screen.getByText('05/01/2030 · Whole day')).toBeOnTheScreen();
    expect(screen.getByText('Court A')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-request-proposed-terms')).toBeNull();
  });

  it('shows a proposal’s price terms: the option and amount, the total and the venue’s share', async () => {
    mockRequest.mockResolvedValue({
      publicFinanceSettings: { gst_pct: 18, currency_symbol: '₹' },
    });
    const offer = {
      model: 'PER_GUEST',
      rate: 300,
      pax: 20,
      quote: { venue_payout: 6000, platform_fee: 600, total: 6600 },
    };
    renderWithProviders(<SlotSummary slot={{ ...slot('s1', ''), offer } as never} />);
    const terms = screen.getByTestId('pod-request-proposed-terms');
    await waitFor(() => expect(within(terms).getByText(/300(\.00)? per guest/)).toBeOnTheScreen());
    expect(within(terms).getByText(/Booking total .*6,600/)).toBeOnTheScreen();
    expect(within(terms).getByText(/Venue receives .*6,000/)).toBeOnTheScreen();
  });
});

describe('ContactBlock', () => {
  it('keeps the contact hidden until the pod exists', () => {
    renderWithProviders(<ContactBlock request={detail()} pod={null} />);
    expect(screen.getByTestId('pod-request-contact-hidden')).toHaveTextContent(
      'Contact details are shared once the pod is created.',
    );
    expect(screen.queryByTestId('pod-request-contact-phone')).toBeNull();
    expect(screen.queryByTestId('pod-request-view-pod')).toBeNull();
  });

  it('shows the contact once the pod exists, with tappable phone and email, and View pod', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    renderWithProviders(
      <ContactBlock
        request={detail({
          status: 'POD_CREATED',
          contact: { phone: '+919800000000', email: 'hall@example.com', address: '1 Hill Rd' },
        } as never)}
        pod={{ id: 'pd', pod_id: 'p-slug', club_slug: 'c-slug' }}
      />,
    );
    expect(screen.queryByTestId('pod-request-contact-hidden')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-request-contact-phone'));
    fireEvent.press(screen.getByTestId('pod-request-contact-email'));
    expect(openURL.mock.calls).toEqual([['tel:+919800000000'], ['mailto:hall@example.com']]);
    expect(screen.getByText('1 Hill Rd')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('pod-request-view-pod'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', {
      clubSlug: 'c-slug',
      podSlug: 'p-slug',
    });
  });

  it('drops empty contact rows and has no View pod without the pod’s address', () => {
    renderWithProviders(
      <ContactBlock
        request={detail({ contact: { phone: '+91980', email: '', address: null } } as never)}
        pod={{ id: 'pd', pod_id: 'p-slug', club_slug: '' }}
      />,
    );
    expect(screen.getByTestId('pod-request-contact-phone')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-request-contact-email')).toBeNull();
    expect(screen.queryByText('Address')).toBeNull();
    expect(screen.queryByTestId('pod-request-view-pod')).toBeNull();
  });
});
