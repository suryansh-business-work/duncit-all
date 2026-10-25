import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notify, notifySuccess } from '@duncit/dialogs';
import HostOfferActions from '../src/offers/host/HostOfferActions';
import { ACCEPT_VENUE_COUNTER, COUNTER_AS_HOST, HOST_COUNTER_OFFER_QUOTE, REJECT_VENUE_COUNTER, type PodOffer } from '../src/offers/host/queries';
import OfferTermsPanel from '../src/offers/OfferTermsPanel';
import {
  SETTLED,
  counteredPodOffer,
  failWith,
  makeCounter,
  makePodOffer,
  mockOf,
  offerChanged,
  quote,
  quoteMin,
  withApollo,
  type Vars,
} from './offer-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn(), notify: vi.fn() }));

const subject = { pod_id: 'pod-1', pod_title: 'Pottery night', venue_name: 'Skyline Banquets' };
const dialog = () => within(screen.getByRole('dialog'));

const renderActions = (offer: PodOffer, mocks: Parameters<typeof withApollo>[0] = [], onDone = vi.fn()) => {
  withApollo(mocks, <HostOfferActions offer={offer} subject={subject} onDone={onDone} />);
  return onDone;
};

const hostQuote = (seen: Vars[]) =>
  mockOf(
    HOST_COUNTER_OFFER_QUOTE,
    () => ({ data: { hostCounterQuote: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote, quote_min: quoteMin } } }),
    seen,
  );

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notify).mockClear();
});

describe('OfferTermsPanel, as the host reads it', () => {
  it('names their own offer, says it waits on the venue, and reads what it costs the pod', () => {
    withApollo([], <OfferTermsPanel offer={makePodOffer()} podIsFree={false} side="HOST" />);
    expect(screen.getByText('Your offer')).toBeInTheDocument();
    expect(screen.getByTestId('offer-status')).toHaveTextContent('Waiting for the venue to answer');
    expect(screen.getByText(/^Costs the pod/)).toHaveTextContent('₹2,640 – ₹6,600');
    expect(screen.getByText(/^The venue receives/)).toHaveTextContent('₹2,400 – ₹6,000');
    // The breakdown's payout row is the venue's money, so a host reads it as the venue's.
    expect(screen.queryByText(/^You receive/)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('price-breakdown')).getByText('Venue receives')).toBeInTheDocument();
  });

  it("names the venue's counter as theirs to answer, at one amount", () => {
    withApollo([], <OfferTermsPanel offer={counteredPodOffer()} podIsFree={false} side="HOST" />);
    expect(screen.getByText("The venue's counter")).toBeInTheDocument();
    expect(screen.getByTestId('offer-status')).toHaveTextContent('The venue countered — your answer');
    expect(screen.getByText(/^Costs the pod/)).toHaveTextContent('₹7,700');
    expect(screen.getByText('Note from the venue')).toBeInTheDocument();
  });

  it.each([
    ['ACCEPTED', 'Accepted'],
    ['DECLINED', 'Declined'],
  ])('says the offer is %s', (status, label) => {
    withApollo([], <OfferTermsPanel offer={makePodOffer({ status, awaiting: null })} podIsFree={false} side="HOST" />);
    expect(screen.getByTestId('offer-status')).toHaveTextContent(label);
    expect(screen.queryByTestId('offer-answer-by')).not.toBeInTheDocument();
  });

  it('shows no chip for a status it does not know, and no money on a free pod', () => {
    withApollo([], <OfferTermsPanel offer={makePodOffer({ status: 'EXPIRED' })} podIsFree side="HOST" />);
    expect(screen.queryByTestId('offer-status')).not.toBeInTheDocument();
    expect(screen.getByText(/Free pod: you settle the venue's charges/)).toBeInTheDocument();
    expect(screen.queryByTestId('offer-money')).not.toBeInTheDocument();
  });
});

describe('HostOfferActions', () => {
  it('offers nothing while the offer waits on the venue', () => {
    renderActions(makePodOffer());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("accepts the venue's counter for the round read, naming what goes live and what the venue receives", async () => {
    const sent: Vars[] = [];
    const onDone = renderActions(counteredPodOffer(), [
      mockOf(ACCEPT_VENUE_COUNTER, () => ({ data: { acceptVenueCounterOffer: counteredPodOffer({ status: 'ACCEPTED', awaiting: null }) } }), sent),
    ]);
    fireEvent.click(screen.getByTestId('host-offer-accept'));
    expect(dialog().getByText("Accept the venue's terms?")).toBeInTheDocument();
    expect(dialog().getByText(/goes live at Skyline Banquets/)).toHaveTextContent('“Pottery night” goes live');
    expect(dialog().getByText(/goes live at Skyline Banquets/)).toHaveTextContent('The venue receives ₹7,000.');
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ pod_id: 'pod-1', round: 2 }]);
    expect(notifySuccess).toHaveBeenCalledWith('Accepted — your pod is live.');
  });

  it("rejects the venue's counter for the round read, with a reason for the venue", async () => {
    const sent: Vars[] = [];
    renderActions(counteredPodOffer(), [mockOf(REJECT_VENUE_COUNTER, () => ({ data: { rejectVenueCounterOffer: true } }), sent)]);
    fireEvent.click(screen.getByTestId('host-offer-reject'));
    expect(dialog().getByText("Reject the venue's terms?")).toBeInTheDocument();
    expect(dialog().getByText(/you can send a new offer/)).toBeInTheDocument();
    fireEvent.change(dialog().getByLabelText('Reason for the venue (optional)'), { target: { value: ' Over budget ' } });
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(sent).toEqual([{ pod_id: 'pod-1', reason: 'Over budget', round: 2 }]), SETTLED);
    expect(notifySuccess).toHaveBeenCalledWith('Rejected — you can send a new offer.');
  });

  it("keeps the dialog open with the server's reason when the answer is refused", async () => {
    const onDone = renderActions(counteredPodOffer(), [mockOf(REJECT_VENUE_COUNTER, failWith('This pod already started'))]);
    fireEvent.click(screen.getByTestId('host-offer-reject'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    expect(await dialog().findByText('This pod already started')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('says the terms changed, closes and re-reads when the venue moved first', async () => {
    const onDone = renderActions(counteredPodOffer(), [mockOf(ACCEPT_VENUE_COUNTER, offerChanged())]);
    fireEvent.click(screen.getByTestId('host-offer-accept'));
    fireEvent.click(dialog().getByTestId('answer-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(notify).toHaveBeenCalledWith('The terms changed while you were reading them. Here are the latest.', 'warning');
    expect(notifySuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it("counters back from the venue's terms, priced for the pod, and sends them for the round read", async () => {
    const sent: Vars[] = [];
    const seen: Vars[] = [];
    const offer = counteredPodOffer({ counter: makeCounter({ offerings: ['A stage'], note: 'Weekend rate' }) });
    const onDone = renderActions(offer, [
      hostQuote(seen),
      mockOf(COUNTER_AS_HOST, () => ({ data: { counterVenueOfferAsHost: makePodOffer({ round: 3 }) } }), sent),
    ]);
    fireEvent.click(screen.getByTestId('host-offer-counter'));
    const form = dialog();
    expect(form.getByText('Counter the venue')).toBeInTheDocument();
    expect(form.getByText(/It can accept them, reject them or counter again/)).toBeInTheDocument();
    expect(form.getByLabelText('Amount (₹)')).toHaveValue(7000);
    expect(form.getByLabelText('What the venue provides')).toHaveValue('A stage');
    await waitFor(() => expect(seen).toContainEqual({ pod_id: 'pod-1', terms: { model: 'FLAT', rate: 7000 } }), SETTLED);

    fireEvent.mouseDown(form.getByRole('combobox', { name: /Pricing option/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Per guest' }));
    fireEvent.change(form.getByLabelText('Amount (₹)'), { target: { value: '350' } });
    fireEvent.change(form.getByLabelText('Fewest guests paid for'), { target: { value: '10' } });
    fireEvent.change(form.getByLabelText('Note to the venue (optional)'), { target: { value: 'We can do 350 a head' } });
    await waitFor(() => expect(seen).toContainEqual({ pod_id: 'pod-1', terms: { model: 'PER_GUEST', rate: 350, min_guests: 10 } }), SETTLED);
    const preview = within(screen.getByTestId('counter-offer-preview'));
    expect(await preview.findByText(/^Costs the pod/)).toHaveTextContent('₹2,640 – ₹6,600');

    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([
      {
        pod_id: 'pod-1',
        terms: { model: 'PER_GUEST', rate: 350, min_guests: 10, offerings: ['A stage'] },
        note: 'We can do 350 a head',
        round: 2,
      },
    ]);
    expect(notifySuccess).toHaveBeenCalledWith('Your counter was sent to the venue.');
  });
});
