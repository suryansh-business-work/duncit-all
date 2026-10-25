import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodResubmitDialog } from '@/components/host-manage/PodResubmitDialog';
import {
  HostResubmitPodDocument,
  ResubmitVenueTermsDocument,
  ResubmitVenuesDocument,
} from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useOfferCalendar } from '@/hooks/useOfferCalendar';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: () => ({
    uploading: false,
    error: undefined,
    pending: null,
    stage: 'processing' as const,
    progress: null,
    pick: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('@/hooks/useUploadSettings', () => ({ useUploadSettings: () => null }));
jest.mock('@/hooks/useOfferCalendar', () => ({ useOfferCalendar: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockUseOfferCalendar = useOfferCalendar as jest.Mock;

const pod = {
  id: 'p1',
  pod_title: 'Poetry evening',
  pod_description: 'An evening of poetry and calm conversation',
  pod_images_and_videos: [{ url: 'https://cdn/img.jpg', type: 'IMAGE' }],
  venue_id: 'old-venue',
  no_of_spots: 12,
};

const venues = [
  { id: 'v1', venue_name: 'Hall', city: 'Pune' },
  { id: 'v2', venue_name: 'Studio', city: null },
];

const START = '2030-03-05T12:30:00.000Z';
const END = '2030-03-05T14:30:00.000Z';
const TILE = `slot-tile-${START}`;

/** The picked venue's calendar: one start, closing two hours later (none until a venue is picked). */
const calendar =
  (over: Partial<{ loading: boolean }> = {}) =>
  (venueId: string) => ({
    loading: false,
    failed: false,
    tiles: venueId ? [{ id: START, start_at: START, end_at: null, price: null }] : [],
    endsFor: (start: string | null) => (start ? [END] : []),
    ...over,
  });

/** Picks the window, offers ₹300 per guest and says what the venue should provide. */
const offer = () => {
  fireEvent.press(screen.getByTestId(TILE));
  fireEvent.press(screen.getByTestId('create-pod-offer-model-PER_GUEST'));
  fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '300');
  fireEvent.changeText(screen.getByTestId('field-offerings'), 'A projector');
};

/**
 * Route the shared graphqlRequest mock by document: the venues list, the
 * resubmission itself, and anything else the sheet's children ask for (the
 * media field's AI-monitoring copy), which answers as an unset config.
 */
const routeRequests = ({
  venuesResult = Promise.resolve({ publicVenues: venues }) as Promise<unknown>,
  resubmit = () => Promise.resolve({ hostResubmitPod: { id: 'p1' } }) as Promise<unknown>,
  terms = () => Promise.resolve({ publicVenue: null }) as Promise<unknown>,
} = {}) => {
  mockRequest.mockImplementation((doc: unknown) => {
    if (doc === ResubmitVenuesDocument) return venuesResult;
    if (doc === HostResubmitPodDocument) return resubmit();
    if (doc === ResubmitVenueTermsDocument) return terms();
    return Promise.resolve({ aiMonitoringConfig: null });
  });
};

const resubmitCalls = () =>
  mockRequest.mock.calls.filter(([doc]) => doc === HostResubmitPodDocument);
const venueCalls = () => mockRequest.mock.calls.filter(([doc]) => doc === ResubmitVenuesDocument);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOfferCalendar.mockImplementation(calendar());
  routeRequests();
});

describe('PodResubmitDialog', () => {
  it('renders nothing visible without a pod', () => {
    renderWithProviders(<PodResubmitDialog pod={null} onClose={jest.fn()} onSaved={jest.fn()} />);
    expect(screen.queryByTestId('pod-resubmit-dialog')).toBeNull();
    expect(venueCalls()).toHaveLength(0);
  });

  it('guides through venue → window → terms and resubmits the same pod', async () => {
    const onSaved = jest.fn();
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={onSaved} />);
    expect(screen.getByTestId('pod-resubmit-dialog')).toBeOnTheScreen();
    // Slot picker asks for a venue first.
    expect(screen.getByText('Select a venue first to see its available slots.')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    offer();
    // The window's end can be stretched up to closing.
    expect(screen.getByTestId(`create-pod-booking-end-${END}`)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(`create-pod-booking-end-${END}`));
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      HostResubmitPodDocument,
      {
        pod_doc_id: 'p1',
        input: expect.objectContaining({
          venue_id: 'v1',
          venue_offer: {
            start_at: START,
            end_at: END,
            space_label: '',
            pax: 12,
            pets: false,
            model: 'PER_GUEST',
            rate: 300,
            offerings: ['A projector'],
            note: '',
          },
          no_of_spots: 12,
        }),
      },
      { auth: true },
    );
    // No venue minimum on record: the spots stay as the pod had them, unhinted.
    expect(screen.getByTestId('field-no_of_spots_text')).toHaveProp('value', '12');
    expect(screen.queryByText(/takes bookings for at least/)).toBeNull();
    // The whole venue is offered when no space was named.
    expect(mockUseOfferCalendar).toHaveBeenLastCalledWith('v1', 'Whole venue');
  });

  it('blocks an invalid submit (no venue, then no window or terms)', async () => {
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v2')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    // No venue yet: the venue is what is asked for; the slot picker still waits on it.
    await waitFor(() => expect(screen.getByText('Select a venue')).toBeOnTheScreen());
    expect(screen.getByText('Select a venue first to see its available slots.')).toBeOnTheScreen();
    // A venue but no window: the calendar now says one is missing, and the terms are asked for.
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() =>
      expect(screen.getByTestId('slot-calendar-error')).toHaveTextContent('Select a time slot'),
    );
    expect(screen.queryByText('Select a venue')).toBeNull();
    expect(resubmitCalls()).toHaveLength(0);
    // Switching venue drops the window picked at the old one.
    fireEvent.press(screen.getByTestId(TILE));
    fireEvent.press(screen.getByTestId('resubmit-venue-v2'));
    expect(screen.queryByTestId(`create-pod-booking-end-${END}`)).toBeNull();
  });

  it('shows the calendar loading for a picked venue', async () => {
    mockUseOfferCalendar.mockImplementation(calendar({ loading: true }));
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    expect(screen.getByTestId('slot-calendar-loading')).toBeOnTheScreen();
  });

  it('surfaces a server failure and a non-Error rejection', async () => {
    routeRequests({ resubmit: () => Promise.reject(new Error('CONFLICT')) });
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    offer();
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() =>
      expect(screen.getByTestId('pod-resubmit-error')).toHaveTextContent('CONFLICT'),
    );

    routeRequests({ resubmit: () => Promise.reject('boom') });
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() =>
      expect(screen.getByTestId('pod-resubmit-error')).toHaveTextContent(
        'Could not resubmit the pod',
      ),
    );
  });

  it('disables the actions while resubmitting', async () => {
    let resolveMutation!: (value: unknown) => void;
    routeRequests({
      resubmit: () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    });
    const onSaved = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={onClose} onSaved={onSaved} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    offer();
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() => expect(screen.getByText('Resubmitting…')).toBeOnTheScreen());
    // Busy: neither save nor cancel fires while the request is in flight.
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    fireEvent.press(screen.getByTestId('pod-resubmit-cancel'));
    expect(resubmitCalls()).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
    resolveMutation({ hostResubmitPod: { id: 'p1' } });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('closes without resubmitting and tolerates venue-load quirks', async () => {
    const onClose = jest.fn();
    routeRequests({ venuesResult: Promise.resolve({ publicVenues: null }) });
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={onClose} onSaved={jest.fn()} />);
    // Null venues resolve to an empty list → the loading hint stays.
    await waitFor(() => expect(screen.getByText('Loading venues…')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-resubmit-cancel'));
    expect(onClose).toHaveBeenCalled();

    // A failing venues query is swallowed (list stays empty).
    routeRequests({ venuesResult: Promise.reject(new Error('down')) });
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getAllByText('Loading venues…').length).toBeGreaterThan(0));
  });

  it('ignores a venues resolution after unmount', async () => {
    let resolveVenues!: (value: unknown) => void;
    routeRequests({
      venuesResult: new Promise((resolve) => {
        resolveVenues = resolve;
      }),
    });
    const { unmount } = renderWithProviders(
      <PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    unmount();
    resolveVenues({ publicVenues: venues });
    await waitFor(() => expect(venueCalls()).toHaveLength(1));
  });
  it("holds the spots inside the venue's minimum and the space, and sends pets and the ask", async () => {
    routeRequests({
      terms: () =>
        Promise.resolve({
          publicVenue: { id: 'v1', capacity: 10, capacity_items: [], offer_min_guests: 8 },
        }),
    });
    const onSaved = jest.fn();
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={onSaved} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    // The pod's 12 spots do not fit a venue that holds 10: they move in.
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-spots-value')).toHaveTextContent('10'),
    );
    expect(screen.getByText('This venue takes bookings for at least 8 guests.')).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      ResubmitVenueTermsDocument,
      { venue_id: 'v1' },
      { auth: true },
    );
    offer();
    fireEvent(screen.getByTestId('pod-resubmit-pets-switch'), 'valueChange', true);
    fireEvent.changeText(screen.getByTestId('field-note'), 'Quiet corner');
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(resubmitCalls().at(-1)?.[1].input).toEqual(
      expect.objectContaining({
        no_of_spots: 10,
        venue_offer: expect.objectContaining({
          pax: 10,
          pets: true,
          offerings: ['A projector'],
          note: 'Quiet corner',
        }),
      }),
    );
  });

  it('asks for what the venue should provide before resubmitting', async () => {
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    fireEvent.press(screen.getByTestId(TILE));
    fireEvent.press(screen.getByTestId('create-pod-offer-model-FLAT'));
    fireEvent.changeText(screen.getByTestId('field-venue_offer_rate'), '5000');
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    expect(
      await screen.findByText('Add at least one thing you need from the venue'),
    ).toBeOnTheScreen();
    expect(resubmitCalls()).toHaveLength(0);
  });

  it('starts a new offer from the declined terms at the pod venue, and keeps what is typed', async () => {
    const declined = {
      model: 'PER_GUEST',
      rate: 300,
      offerings: ['A projector', '10 chairs'],
      note: 'Quiet corner',
      start_at: START,
      end_at: END,
      space_label: 'Rooftop',
      pets: true,
    };
    const onSaved = jest.fn();
    const view = renderWithProviders(
      <PodResubmitDialog
        pod={pod}
        offerPrefill={{ ...declined }}
        onClose={jest.fn()}
        onSaved={onSaved}
      />,
    );
    // The calendar is the declined space's at the pod's own venue.
    expect(mockUseOfferCalendar).toHaveBeenLastCalledWith('old-venue', 'Rooftop');
    expect(screen.getByTestId('field-offerings')).toHaveProp('value', 'A projector\n10 chairs');
    expect(screen.getByTestId('field-venue_offer_rate')).toHaveProp('value', '300');
    fireEvent.changeText(screen.getByTestId('field-note'), 'Quiet corner, please');
    // A parent rebuilding the same terms each render does not reset the sheet.
    view.rerender(
      <PodResubmitDialog
        pod={pod}
        offerPrefill={{ ...declined, offerings: [...declined.offerings] }}
        onClose={jest.fn()}
        onSaved={onSaved}
      />,
    );
    expect(screen.getByTestId('field-note')).toHaveProp('value', 'Quiet corner, please');
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(resubmitCalls().at(-1)?.[1].input).toEqual(
      expect.objectContaining({
        venue_id: 'old-venue',
        venue_offer: {
          start_at: START,
          end_at: END,
          space_label: 'Rooftop',
          pax: 12,
          pets: true,
          model: 'PER_GUEST',
          rate: 300,
          offerings: ['A projector', '10 chairs'],
          note: 'Quiet corner, please',
        },
      }),
    );
  });

  it("drops the declined space with its venue, and ignores another venue's late bounds", async () => {
    // Each venue's read stays pending until the test answers it, oldest first.
    const pending: ((value: unknown) => void)[] = [];
    routeRequests({
      terms: () =>
        new Promise((resolve) => {
          pending.push(resolve);
        }),
    });
    renderWithProviders(
      <PodResubmitDialog
        pod={pod}
        offerPrefill={{
          model: 'FLAT',
          rate: 5000,
          offerings: [],
          note: '',
          start_at: START,
          end_at: END,
          space_label: 'Rooftop',
          pets: false,
        }}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    expect(mockUseOfferCalendar).toHaveBeenLastCalledWith('v1', 'Whole venue');
    // The old venue's bounds arrive after the host moved on: they never apply.
    await act(async () => {
      pending[0]?.({
        publicVenue: { id: 'old-venue', capacity: 4, capacity_items: [], offer_min_guests: 4 },
      });
    });
    expect(screen.getByTestId('field-no_of_spots_text')).toHaveProp('value', '12');
  });

  it('leaves the spots unbounded when the venue bounds cannot be read', async () => {
    routeRequests({ terms: () => Promise.reject(new Error('down')) });
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        ResubmitVenueTermsDocument,
        { venue_id: 'v1' },
        { auth: true },
      ),
    );
    fireEvent.press(screen.getByTestId('spots-inc'));
    expect(screen.getByTestId('field-no_of_spots_text')).toHaveProp('value', '13');
    // A cleared box is no spots, not a broken number.
    fireEvent.changeText(screen.getByTestId('field-no_of_spots_text'), '');
    expect(screen.getByTestId('field-no_of_spots_text')).toHaveProp('value', '0');
  });

  it('leaves a pod with no spots on record for the host to size', async () => {
    routeRequests({
      terms: () =>
        Promise.resolve({
          publicVenue: { id: 'v1', capacity: 10, capacity_items: [], offer_min_guests: 8 },
        }),
    });
    renderWithProviders(
      <PodResubmitDialog
        pod={{ ...pod, no_of_spots: null }}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    expect(
      await screen.findByText('This venue takes bookings for at least 8 guests.'),
    ).toBeOnTheScreen();
    // An unknown count is not snapped to the venue's range on the host's behalf.
    expect(screen.getByTestId('create-pod-spots-value')).toHaveTextContent('0');
  });
});
