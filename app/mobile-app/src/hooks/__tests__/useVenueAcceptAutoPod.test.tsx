import { act, renderHook } from '@testing-library/react-native';
import { mwebAutoPodLabels } from '@duncit/utils';

import { VenueOfferModel } from '@/generated/graphql/graphql';
import { AutoPodVenueQuoteDocument, VenueAcceptAutoPodDocument } from '@/graphql/auto-pods';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { graphqlRequest } from '@/services/graphql.client';
import { useVenueAcceptAutoPod } from '@/hooks/useVenueAcceptAutoPod';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

/** Labels that read back as their own keys, so assertions name the copy used. */
const labels = mwebAutoPodLabels((key) => key);

const venue = { id: 'v1', location_id: 'blr' } as AutoPodVenueOption;
const elsewhere = { id: 'v2', location_id: 'del' } as AutoPodVenueOption;

const OFFER = {
  start_at: '2030-01-01T10:00:00.000Z',
  end_at: '2030-01-01T13:00:00.000Z',
  space_label: '',
  model: VenueOfferModel.Flat,
  rate: 5000,
  pax: 12,
};
/** What the server is sent: the window and terms — the guests are the pod's spots. */
const TERMS = {
  start_at: OFFER.start_at,
  end_at: OFFER.end_at,
  space_label: '',
  model: VenueOfferModel.Flat,
  rate: 5000,
};

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

describe('useVenueAcceptAutoPod — pricing', () => {
  it('prices a window and terms at the chosen venue, without the guests', async () => {
    const answer = { ok: true, message: null, quote: { total: 5500 } };
    mockRequest.mockResolvedValueOnce({ autoPodVenueQuote: answer });
    const { result } = mount({ autoPodId: 'ap1', venue, pinned: 'blr' });

    await expect(result.current.priceOf(OFFER)).resolves.toEqual(answer);
    expect(mockRequest).toHaveBeenCalledWith(
      AutoPodVenueQuoteDocument,
      { auto_pod_doc_id: 'ap1', venue_id: 'v1', offer: TERMS },
      { auth: true },
    );
  });

  it('asks nothing without an offer or a venue', async () => {
    const { result } = mount({ autoPodId: null, venue, pinned: null });
    await expect(result.current.priceOf(OFFER)).rejects.toThrow('No offer or venue to price');
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('useVenueAcceptAutoPod — accepting', () => {
  it('books the window at those terms and reports it', async () => {
    mockRequest.mockResolvedValueOnce({ venueAcceptAutoPod: { id: 'ap1' } });
    const { result, onAccepted } = mount({ autoPodId: 'ap1', venue, pinned: 'blr' });

    await act(async () => {
      await result.current.accept(OFFER);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      VenueAcceptAutoPodDocument,
      { auto_pod_doc_id: 'ap1', venue_id: 'v1', offer: TERMS },
      { auth: true },
    );
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(result.current.failure).toBe('');
    expect(result.current.busy).toBe(false);
  });

  it('says why when the server refuses, and lets the venue try again', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Another venue took it'));
    const { result, onAccepted } = mount({ autoPodId: 'ap1', venue, pinned: 'blr' });

    await act(async () => {
      await result.current.accept(OFFER);
    });
    expect(result.current.failure).toBe('Another venue took it');
    expect(onAccepted).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it('falls back to the claimed-elsewhere line for a failure with no message', async () => {
    mockRequest.mockRejectedValueOnce({});
    const { result } = mount({ autoPodId: 'ap1', venue, pinned: 'blr' });
    await act(async () => {
      await result.current.accept(OFFER);
    });
    expect(result.current.failure).toBe(labels.claimedElsewhere);
  });

  it('sends nothing without an offer or a venue', async () => {
    const { result, onAccepted } = mount({ autoPodId: 'ap1', venue: null, pinned: null });
    await act(async () => {
      await result.current.accept(OFFER);
    });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('clears an earlier failure for a different offer or venue', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Refused'));
    const { result, rerender } = mount({ autoPodId: 'ap1', venue, pinned: 'blr' });
    await act(async () => {
      await result.current.accept(OFFER);
    });
    expect(result.current.failure).toBe('Refused');
    rerender({ autoPodId: 'ap2', venue, pinned: 'blr' });
    expect(result.current.failure).toBe('');
  });
});

describe('useVenueAcceptAutoPod — the pinned city', () => {
  it('takes a venue in the pinned city, or any venue when nothing is pinned', () => {
    expect(mount({ autoPodId: 'ap1', venue, pinned: 'blr' }).result.current.venueInCity).toBe(true);
    expect(
      mount({ autoPodId: 'ap1', venue: elsewhere, pinned: null }).result.current.venueInCity,
    ).toBe(true);
  });

  it('refuses a venue from another city, and no venue at all', () => {
    expect(
      mount({ autoPodId: 'ap1', venue: elsewhere, pinned: 'blr' }).result.current.venueInCity,
    ).toBe(false);
    expect(mount({ autoPodId: 'ap1', venue: null, pinned: null }).result.current.venueInCity).toBe(
      false,
    );
  });
});
