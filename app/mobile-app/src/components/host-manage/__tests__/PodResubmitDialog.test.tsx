import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodResubmitDialog } from '@/components/host-manage/PodResubmitDialog';
import { graphqlRequest } from '@/services/graphql.client';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: () => ({ uploading: false, error: undefined, pickAndUpload: jest.fn() }),
}));
jest.mock('@/hooks/useVenueSlots', () => ({ useVenueSlots: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockUseVenueSlots = useVenueSlots as jest.Mock;

const pod = {
  id: 'p1',
  pod_title: 'Poetry evening',
  pod_description: 'An evening of poetry and calm conversation',
  pod_images_and_videos: [{ url: 'https://cdn/img.jpg', type: 'IMAGE' }],
  venue_id: 'old-venue',
};

const venues = [
  { id: 'v1', venue_name: 'Hall', city: 'Pune' },
  { id: 'v2', venue_name: 'Studio', city: null },
];

const slot = {
  id: 's1',
  start_at: '2030-03-05T12:30:00.000Z',
  end_at: '2030-03-05T14:30:00.000Z',
  price: 400,
  space_label: 'Hall A',
};

/** Route the shared graphqlRequest mock: mutation calls carry pod_doc_id. */
const routeRequests = (venuesResult: unknown = { publicVenues: venues }) => {
  mockRequest.mockImplementation((_doc: unknown, vars: any) =>
    vars?.pod_doc_id
      ? Promise.resolve({ hostResubmitPod: { id: 'p1' } })
      : Promise.resolve(venuesResult),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseVenueSlots.mockReturnValue({ slots: [], isLoading: false });
  routeRequests();
});

describe('PodResubmitDialog', () => {
  it('renders nothing visible without a pod', () => {
    renderWithProviders(<PodResubmitDialog pod={null} onClose={jest.fn()} onSaved={jest.fn()} />);
    expect(screen.queryByTestId('pod-resubmit-dialog')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('guides through venue → slot and resubmits the same pod', async () => {
    mockUseVenueSlots.mockImplementation((venueId: string) => ({
      slots: venueId ? [slot] : [],
      isLoading: false,
    }));
    const onSaved = jest.fn();
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={onSaved} />);
    expect(screen.getByTestId('pod-resubmit-dialog')).toBeOnTheScreen();
    // Slot picker asks for a venue first.
    expect(screen.getByText('Select a venue first')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    fireEvent.press(screen.getByTestId('resubmit-slot-s1'));
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      {
        pod_doc_id: 'p1',
        input: expect.objectContaining({ venue_id: 'v1', venue_slot_id: 's1' }),
      },
      { auth: true },
    );
  });

  it('blocks an invalid submit (no venue or slot picked)', async () => {
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v2')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() => expect(screen.getByText('Select a venue')).toBeOnTheScreen());
    expect(screen.getByText('Select a time slot')).toBeOnTheScreen();
    const mutationCalls = mockRequest.mock.calls.filter(([, vars]) => vars?.pod_doc_id);
    expect(mutationCalls).toHaveLength(0);
  });

  it('shows slot loading and empty states for a picked venue', async () => {
    mockUseVenueSlots.mockImplementation((venueId: string) => ({
      slots: [],
      isLoading: venueId === 'v1',
    }));
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    expect(screen.getByText('Loading slots…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('resubmit-venue-v2'));
    expect(screen.getByText('No open slots at this venue — pick another venue')).toBeOnTheScreen();
  });

  it('surfaces a server failure and a non-Error rejection', async () => {
    mockUseVenueSlots.mockReturnValue({ slots: [slot], isLoading: false });
    mockRequest.mockImplementation((_doc: unknown, vars: any) =>
      vars?.pod_doc_id
        ? Promise.reject(new Error('CONFLICT'))
        : Promise.resolve({ publicVenues: venues }),
    );
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    fireEvent.press(screen.getByTestId('resubmit-slot-s1'));
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() =>
      expect(screen.getByTestId('pod-resubmit-error')).toHaveTextContent('CONFLICT'),
    );

    mockRequest.mockImplementation((_doc: unknown, vars: any) =>
      vars?.pod_doc_id ? Promise.reject('boom') : Promise.resolve({ publicVenues: venues }),
    );
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() =>
      expect(screen.getByTestId('pod-resubmit-error')).toHaveTextContent(
        'Could not resubmit the pod',
      ),
    );
  });

  it('disables the actions while resubmitting', async () => {
    mockUseVenueSlots.mockReturnValue({ slots: [slot], isLoading: false });
    let resolveMutation!: (value: unknown) => void;
    mockRequest.mockImplementation((_doc: unknown, vars: any) =>
      vars?.pod_doc_id
        ? new Promise((resolve) => {
            resolveMutation = resolve;
          })
        : Promise.resolve({ publicVenues: venues }),
    );
    const onSaved = jest.fn();
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={onSaved} />);
    await waitFor(() => expect(screen.getByTestId('resubmit-venue-v1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('resubmit-venue-v1'));
    fireEvent.press(screen.getByTestId('resubmit-slot-s1'));
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    await waitFor(() => expect(screen.getByText('Resubmitting…')).toBeOnTheScreen());
    // Busy: neither save nor cancel fires while the request is in flight.
    fireEvent.press(screen.getByTestId('pod-resubmit-save'));
    fireEvent.press(screen.getByTestId('pod-resubmit-cancel'));
    resolveMutation({ hostResubmitPod: { id: 'p1' } });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('closes without resubmitting and tolerates venue-load quirks', async () => {
    const onClose = jest.fn();
    routeRequests({ publicVenues: null });
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={onClose} onSaved={jest.fn()} />);
    // Null venues resolve to an empty list → the loading hint stays.
    await waitFor(() => expect(screen.getByText('Loading venues…')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('pod-resubmit-cancel'));
    expect(onClose).toHaveBeenCalled();

    // A failing venues query is swallowed (list stays empty).
    mockRequest.mockImplementation((_doc: unknown, vars: any) =>
      vars?.pod_doc_id
        ? Promise.resolve({ hostResubmitPod: { id: 'p1' } })
        : Promise.reject(new Error('down')),
    );
    renderWithProviders(<PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />);
    await waitFor(() => expect(screen.getAllByText('Loading venues…').length).toBeGreaterThan(0));
  });

  it('ignores a venues resolution after unmount', async () => {
    let resolveVenues!: (value: unknown) => void;
    mockRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVenues = resolve;
        }),
    );
    const { unmount } = renderWithProviders(
      <PodResubmitDialog pod={pod} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    unmount();
    resolveVenues({ publicVenues: venues });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  });
});
