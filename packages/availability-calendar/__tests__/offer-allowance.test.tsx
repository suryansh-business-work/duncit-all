import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import OfferDecisionActions from '../src/offers/OfferDecisionActions';
import HostOfferActions from '../src/offers/host/HostOfferActions';
import { HOST_COUNTER_OFFER_QUOTE, type PodOffer } from '../src/offers/host/queries';
import { VENUE_COUNTER_QUOTE, type BookingOffer } from '../src/offers/queries';
import { counteredPodOffer, flatQuote, makeOffer, makeRequest, mockOf, withApollo } from './offer-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/media-picker', async () => ({ MediaPickerDialog: (await import('./media-picker-stub')).MediaPickerStub }));

const subject = { pod_id: 'pod-1', pod_title: 'Pottery night', venue_name: 'Skyline Banquets' };
const priced = (field: string) => () => ({ data: { [field]: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote: flatQuote, quote_min: flatQuote } } });

const renderVenue = (offer: BookingOffer) =>
  withApollo(
    [mockOf(VENUE_COUNTER_QUOTE, priced('venueCounterQuote'))],
    <OfferDecisionActions request={makeRequest({ offer })} offer={offer} onDone={vi.fn()} />,
  );

const renderHost = (offer: PodOffer) =>
  withApollo([mockOf(HOST_COUNTER_OFFER_QUOTE, priced('hostCounterQuote'))], <HostOfferActions offer={offer} subject={subject} onDone={vi.fn()} />);

describe("the venue's counters", () => {
  it('says under its answers how many it has left, and again in the counter dialog', () => {
    renderVenue(makeOffer({ venue_counters_used: 1 }));
    expect(screen.getByTestId('counter-allowance-venue')).toHaveTextContent('2 of 3 counters left');
    fireEvent.click(screen.getByTestId('offer-counter-slot-1'));
    const dialog = within(screen.getByRole('dialog', { name: 'Counter offer' }));
    expect(dialog.getByTestId('counter-offer-allowance')).toHaveTextContent('2 of 3 counters left');
    expect(dialog.getByText('Offer your own terms for this booking. The host can accept or decline them.')).toBeInTheDocument();
  });

  it('offers no counter once its share is used — only accept or reject — and says so', () => {
    renderVenue(makeOffer({ venue_counters_used: 3 }));
    expect(screen.queryByTestId('offer-counter-slot-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('offer-accept-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('offer-reject-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('counter-allowance-venue')).toHaveTextContent('You have used all your counters — accept or reject');
  });

  it('never reads more counters used than its share as fewer than none left', () => {
    renderVenue(makeOffer({ venue_counters_used: 5 }));
    expect(screen.queryByTestId('offer-counter-slot-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('counter-allowance-venue')).toHaveTextContent('You have used all your counters');
  });
});

describe("the host's counters", () => {
  it('says under their answers how many they have left', () => {
    renderHost(counteredPodOffer({ host_counters_used: 2 }));
    expect(screen.getByTestId('counter-allowance-host')).toHaveTextContent('1 of 3 counters left');
    expect(screen.getByTestId('host-offer-counter')).toBeInTheDocument();
  });

  it('offers no counter back once theirs are used — only accept or reject — and says so', () => {
    renderHost(counteredPodOffer({ host_counters_used: 3 }));
    expect(screen.queryByTestId('host-offer-counter')).not.toBeInTheDocument();
    expect(screen.getByTestId('host-offer-accept')).toBeInTheDocument();
    expect(screen.getByTestId('host-offer-reject')).toBeInTheDocument();
    expect(screen.getByTestId('counter-allowance-host')).toHaveTextContent('You have used all your counters — accept or reject');
  });

  it('counts only their own counters, not the venue’s', () => {
    renderHost(counteredPodOffer({ host_counters_used: 0, venue_counters_used: 3 }));
    expect(screen.getByTestId('counter-allowance-host')).toHaveTextContent('3 of 3 counters left');
    expect(screen.getByTestId('host-offer-counter')).toBeInTheDocument();
  });
});

describe('an offer from a server that names no limit', () => {
  it('shows no allowance and keeps countering open for the host, in the dialog too', () => {
    renderHost(counteredPodOffer({ counters_per_side: undefined, host_counters_used: undefined }));
    expect(screen.queryByTestId('counter-allowance-host')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('host-offer-counter'));
    const dialog = within(screen.getByRole('dialog', { name: 'Counter the venue' }));
    expect(dialog.queryByTestId('counter-offer-allowance')).not.toBeInTheDocument();
    expect(dialog.getByTestId('counter-offer-submit')).toHaveTextContent('Send counter');
  });

  it('shows no allowance and keeps countering open for the venue', () => {
    renderVenue(makeOffer({ counters_per_side: undefined, venue_counters_used: undefined }));
    expect(screen.queryByTestId('counter-allowance-venue')).not.toBeInTheDocument();
    expect(screen.getByTestId('offer-counter-slot-1')).toBeInTheDocument();
  });
});
