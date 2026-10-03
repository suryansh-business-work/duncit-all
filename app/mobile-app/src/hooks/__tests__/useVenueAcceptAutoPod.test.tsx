import { act, renderHook, waitFor } from '@testing-library/react-native';
import { mwebAutoPodLabels } from '@duncit/utils';

import { AutoPodVenueSlotsDocument, VenueAcceptAutoPodDocument } from '@/graphql/auto-pods';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { graphqlRequest } from '@/services/graphql.client';
import { useVenueAcceptAutoPod } from '@/hooks/useVenueAcceptAutoPod';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

/** Labels that read back as their own keys, so assertions name the copy used. */
const labels = mwebAutoPodLabels((key) => key);

const venue = { id: 'v1', location_id: 'blr' } as AutoPodVenueOption;
const elsewhere = { id: 'v2', location_id: 'del' } as AutoPodVenueOption;

const slotRow = (id: string, viable: boolean) => ({
  id,
  start_at: '2030-01-01T10:00:00.000Z',
  price: 500,
  space_label: 'Hall',
  venue_receives: 450,
  viable,
  extra_field: 'not carried',
});

const slotsAnswer = (slots: ReturnType<typeof slotRow>[], window_days = 7) => ({
  autoPodVenueSlots: { window_days, slots },
});

interface Props {
  autoPodId: string | null;
  venue: AutoPodVenueOption | null;
  pinned: string | null;
}

function mount(initial: Props, onAccepted = jest.fn()) {
  const hook = renderHook(
    (p: Props) => useVenueAcceptAutoPod(p.autoPodId, p.venue, p.pinned, labels, onAccepted),
    { initialProps: initial },
  );
  return { ...hook, onAccepted };
}

beforeEach(() => mockRequest.mockReset());

describe('useVenueAcceptAutoPod — slots', () => {
  it('loads the venue’s slots, keeping only the fields the sheet uses', async () => {
    mockRequest.mockResolvedValueOnce(slotsAnswer([slotRow('s1', true)]));
    const { result } = mount({ autoPodId: 'ap1', venue, pinned: 'blr' });
    expect(result.current.slotsLoading).toBe(true);
    await waitFor(() => expect(result.current.slotsLoading).toBe(false));

    expect(mockRequest).toHaveBeenCalledWith(
      AutoPodVenueSlotsDocument,
      { auto_pod_doc_id: 'ap1', venue_id: 'v1' },
      { auth: true },
    );
    expect(result.current.windowDays).toBe(7);
    expect(result.current.slots).toEqual([
      {
        id: 's1',
        start_at: '2030-01-01T10:00:00.000Z',
        price: 500,
        space_label: 'Hall',
        venue_receives: 450,
        viable: true,
      },
    ]);
    expect(result.current.venueInCity).toBe(true);
    expect(result.current.showNoSlots).toBe(false);
  });

  it('loads for any venue when the offer is not pinned to a city', async () => {
    mockRequest.mockResolvedValueOnce(slotsAnswer([], 5));
    const { result } = mount({ autoPodId: 'ap1', venue: elsewhere, pinned: null });
    await waitFor(() => expect(result.current.slotsLoading).toBe(false));
    expect(result.current.venueInCity).toBe(true);
    expect(result.current.showNoSlots).toBe(true);
  });

  it('does not offer the no-slots path when the window is zero days', async () => {
    mockRequest.mockResolvedValueOnce(slotsAnswer([], 0));
    const { result } = mount({ autoPodId: 'ap1', venue, pinned: null });
    await waitFor(() => expect(result.current.slotsLoading).toBe(false));
    expect(result.current.showNoSlots).toBe(false);
  });

  it('asks nothing for a venue outside the pinned city', () => {
    const { result } = mount({ autoPodId: 'ap1', venue: elsewhere, pinned: 'blr' });
    expect(result.current.venueInCity).toBe(false);
    expect(result.current.slots).toEqual([]);
    expect(result.current.canAccept).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('asks nothing without an offer or a venue', () => {
    const noOffer = mount({ autoPodId: null, venue, pinned: null });
    expect(noOffer.result.current.windowDays).toBe(0);
    const noVenue = mount({ autoPodId: 'ap1', venue: null, pinned: null });
    expect(noVenue.result.current.venueInCity).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('shows the load failure label when slots cannot be read', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = mount({ autoPodId: 'ap1', venue, pinned: null });
    await waitFor(() => expect(result.current.failure).toBe('mweb.autoPods.loadFailed'));
    expect(result.current.slotsLoading).toBe(false);
  });

  it('drops a stale answer when the venue changes mid-flight', async () => {
    let resolveFirst: (v: unknown) => void = () => undefined;
    let rejectSecond: (e: unknown) => void = () => undefined;
    mockRequest
      .mockReturnValueOnce(
        new Promise((r) => {
          resolveFirst = r;
        }),
      )
      .mockReturnValueOnce(
        new Promise((_r, rej) => {
          rejectSecond = rej;
        }),
      );
    const { result, rerender, unmount } = mount({ autoPodId: 'ap1', venue, pinned: null });
    rerender({ autoPodId: 'ap1', venue: elsewhere, pinned: null });
    await act(async () => resolveFirst(slotsAnswer([slotRow('stale', true)])));
    expect(result.current.slots).toEqual([]);

    unmount();
    await act(async () => rejectSecond(new Error('late')));
    expect(result.current.failure).toBe('');
  });

  it('clears slots and the pick when the venue leaves the city', async () => {
    mockRequest.mockResolvedValueOnce(slotsAnswer([slotRow('s1', true)]));
    const { result, rerender } = mount({ autoPodId: 'ap1', venue, pinned: 'blr' });
    await waitFor(() => expect(result.current.slots).toHaveLength(1));
    act(() => result.current.setSlotId('s1'));
    expect(result.current.selected?.id).toBe('s1');

    rerender({ autoPodId: 'ap1', venue: elsewhere, pinned: 'blr' });
    expect(result.current.slots).toEqual([]);
    expect(result.current.slotId).toBe('');
    expect(result.current.windowDays).toBe(0);
  });
});

describe('useVenueAcceptAutoPod — accepting', () => {
  async function ready(viable = true) {
    mockRequest.mockResolvedValueOnce(slotsAnswer([slotRow('s1', viable)]));
    const hook = mount({ autoPodId: 'ap1', venue, pinned: null });
    await waitFor(() => expect(hook.result.current.slots).toHaveLength(1));
    return hook;
  }

  it('cannot accept until a viable slot is picked', async () => {
    const { result } = await ready();
    expect(result.current.selected).toBeNull();
    expect(result.current.canAccept).toBe(false);
    await act(async () => result.current.accept());
    expect(mockRequest).toHaveBeenCalledTimes(1);

    act(() => result.current.setSlotId('s1'));
    expect(result.current.canAccept).toBe(true);
  });

  it('a slot the pod cannot afford stays unacceptable', async () => {
    const { result } = await ready(false);
    act(() => result.current.setSlotId('s1'));
    expect(result.current.selected?.viable).toBe(false);
    expect(result.current.canAccept).toBe(false);
  });

  it('commits the slot and tells the caller', async () => {
    const { result, onAccepted } = await ready();
    act(() => result.current.setSlotId('s1'));
    mockRequest.mockResolvedValueOnce({ venueAcceptAutoPod: { id: 'ap1' } });
    await act(async () => result.current.accept());

    expect(mockRequest).toHaveBeenLastCalledWith(
      VenueAcceptAutoPodDocument,
      { auto_pod_doc_id: 'ap1', venue_id: 'v1', slot_id: 's1' },
      { auth: true },
    );
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(false);
    expect(result.current.failure).toBe('');
  });

  it('shows the server’s reason when the accept fails', async () => {
    const { result, onAccepted } = await ready();
    act(() => result.current.setSlotId('s1'));
    mockRequest.mockRejectedValueOnce(new Error('Slot taken'));
    await act(async () => result.current.accept());
    expect(result.current.failure).toBe('Slot taken');
    expect(onAccepted).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it('falls back to the claimed-elsewhere label for a bare failure', async () => {
    const { result } = await ready();
    act(() => result.current.setSlotId('s1'));
    mockRequest.mockRejectedValueOnce({});
    await act(async () => result.current.accept());
    expect(result.current.failure).toBe('mweb.autoPods.claimedElsewhere');
  });

  it('is not acceptable while the commit is in flight', async () => {
    const { result } = await ready();
    act(() => result.current.setSlotId('s1'));
    let resolve: (v: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.accept();
    });
    expect(result.current.busy).toBe(true);
    expect(result.current.canAccept).toBe(false);
    await act(async () => {
      resolve({});
      await pending;
    });
    expect(result.current.busy).toBe(false);
  });
});
