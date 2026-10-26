import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notify, notifySuccess } from '@duncit/dialogs';
import type { VenueChatOfferMove } from '@duncit/utils';
import OfferChatCard from '../src/offers/chat/OfferChatCard';
import type { OfferChatViewer } from '../src/offers/chat/chat-lines';
import type { PodOffer } from '../src/offers/host/queries';
import { EDIT_COUNTER_QUOTE, EDIT_VENUE_OFFER_COUNTER, WITHDRAW_VENUE_OFFER_COUNTER } from '../src/offers/queries';
import { nextPicks } from './media-picker-stub';
import {
  PHOTO_A,
  PHOTO_B,
  SETTLED,
  counteredPodOffer,
  failWith,
  flatQuote,
  makeCounter,
  makeMove,
  makePodOffer,
  mockOf,
  offerChanged,
  withApollo,
  type Vars,
} from './offer-fixtures';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/media-picker', async () => ({ MediaPickerDialog: (await import('./media-picker-stub')).MediaPickerStub }));

const subject = { pod_id: 'pod-1', pod_title: 'Pottery night', venue_name: 'Skyline Banquets' };

/** The venue's flat counter on round 2, with a photo of the set-up, as its chat line carries it. */
const venueCounter = makeMove({
  event: 'COUNTER',
  by: 'VENUE',
  round: 2,
  model: 'FLAT',
  rate: 7000,
  offerings: ['A stage'],
  note: 'Weekend rate',
  images: [PHOTO_A],
});
/** The live offer behind it: the venue's counter, still waiting on the host. */
const venueCounterLive = () => counteredPodOffer({ counter: makeCounter({ offerings: ['A stage'], note: 'Weekend rate', images: [PHOTO_A] }) });

/** The host's per-guest counter back on round 3, waiting on the venue. */
const hostCounter = makeMove({ event: 'COUNTER', by: 'HOST', round: 3, rate: 350, min_guests: 10, offerings: ['A stage'] });
/** The live offer behind it: the host's own terms on the table (no venue counter), from a server that sends no photos. */
const hostCounterLive = () =>
  makePodOffer({
    round: 3,
    rate: 350,
    min_guests: 10,
    offerings: ['A stage'],
    note: 'We can do 350 a head',
    images: undefined,
    host_counters_used: 1,
    venue_counters_used: 1,
  });

interface Options {
  viewer: OfferChatViewer;
  live: PodOffer;
  mocks?: Parameters<typeof withApollo>[0];
  seen?: boolean;
}

function renderCard(move: VenueChatOfferMove, { viewer, live, mocks = [], seen }: Options) {
  const onAnswered = vi.fn();
  withApollo(mocks, <OfferChatCard move={move} viewer={viewer} newest answering={{ live, subject, onAnswered }} seen={seen} />);
  return { onAnswered, card: within(screen.getByRole('article')) };
}

const editQuote = (seen: Vars[]) =>
  mockOf(
    EDIT_COUNTER_QUOTE,
    () => ({ data: { editCounterQuote: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote: flatQuote, quote_min: flatQuote } } }),
    seen,
  );
/** The offer as a saved change answers it: the round has moved on. */
const offerRow = (field: string, status: string) => () => ({
  data: { [field]: { __typename: 'VenueBookingOffer', slot_id: 'slot-1', status, round: 4 } },
});
const editMock = (sent: Vars[], answer: (v: Vars) => object = offerRow('editVenueOfferCounter', 'COUNTERED')) =>
  mockOf(EDIT_VENUE_OFFER_COUNTER, answer, sent);
const withdrawMock = (sent: Vars[], answer: (v: Vars) => object = offerRow('withdrawVenueOfferCounter', 'SENT')) =>
  mockOf(WITHDRAW_VENUE_OFFER_COUNTER, answer, sent);
const ANSWERS = /^(Accept|Reject|Counter)$/;

const openEdit = (card: ReturnType<typeof renderCard>['card']) => {
  fireEvent.click(card.getByRole('button', { name: 'Edit counter' }));
  return within(screen.getByRole('dialog', { name: 'Edit your counter' }));
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notify).mockClear();
  nextPicks.length = 0;
});

describe('their own counter, before the other side has seen it', () => {
  it('lets the venue edit or withdraw it, and answer nothing while the host decides', () => {
    const { card } = renderCard(venueCounter, { viewer: 'VENUE', live: venueCounterLive() });
    expect(card.getByRole('heading')).toHaveTextContent('You countered');
    const revise = within(card.getByTestId('offer-revise'));
    expect(revise.getByText('Not seen yet — you can still edit or withdraw it.')).toBeInTheDocument();
    expect(revise.getAllByRole('button').map((button) => button.textContent)).toEqual(['Withdraw', 'Edit counter']);
    expect(card.queryByRole('button', { name: ANSWERS })).not.toBeInTheDocument();
  });

  it('offers nothing once the other side has seen it', () => {
    const { card } = renderCard(venueCounter, { viewer: 'VENUE', live: venueCounterLive(), seen: true });
    expect(card.queryByTestId('offer-revise')).not.toBeInTheDocument();
    expect(card.queryByRole('button', { name: /Edit counter|Withdraw/ })).not.toBeInTheDocument();
    expect(card.queryByRole('button', { name: ANSWERS })).not.toBeInTheDocument();
  });

  it('offers nothing once the offer has moved past it to another round', () => {
    const { card } = renderCard(venueCounter, { viewer: 'VENUE', live: counteredPodOffer({ round: 3 }) });
    expect(card.queryByTestId('offer-revise')).not.toBeInTheDocument();
    expect(card.queryByRole('button', { name: /Edit counter|Withdraw/ })).not.toBeInTheDocument();
  });
});

describe('editing a counter', () => {
  it("starts the venue from its counter whole — terms, note and photos — prices it as an edit and saves it for the round read", async () => {
    const seen: Vars[] = [];
    const sent: Vars[] = [];
    const { card, onAnswered } = renderCard(venueCounter, { viewer: 'VENUE', live: venueCounterLive(), mocks: [editQuote(seen), editMock(sent)] });
    const form = openEdit(card);
    expect(form.getByText('They have not seen it yet, so you can still change it. Your new terms replace it.')).toBeInTheDocument();
    // An edit replaces a counter already counted, so no allowance is named.
    expect(form.queryByTestId('counter-offer-allowance')).not.toBeInTheDocument();
    expect(form.getByLabelText('Amount (₹)')).toHaveValue(7000);
    expect(form.getByLabelText('What the venue provides')).toHaveValue('A stage');
    expect(form.getByLabelText('Note to the host (optional)')).toHaveValue('Weekend rate');
    expect(form.getByRole('img', { name: 'Photo 1 attached to the terms' })).toHaveAttribute('src', PHOTO_A);
    expect(form.getByTestId('counter-offer-submit')).toHaveTextContent('Save changes');
    await waitFor(() => expect(seen).toContainEqual({ pod_id: 'pod-1', terms: { model: 'FLAT', rate: 7000 } }), SETTLED);

    fireEvent.change(form.getByLabelText('Amount (₹)'), { target: { value: '6500' } });
    nextPicks.push(PHOTO_B);
    fireEvent.click(form.getByRole('button', { name: 'Add photo' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Attach a photo' })).getByRole('button', { name: 'Pick photo' }));
    await waitFor(() => expect(seen).toContainEqual({ pod_id: 'pod-1', terms: { model: 'FLAT', rate: 6500 } }), SETTLED);

    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([
      { pod_id: 'pod-1', terms: { model: 'FLAT', rate: 6500, offerings: ['A stage'], images: [PHOTO_A, PHOTO_B] }, note: 'Weekend rate', round: 2 },
    ]);
    expect(notifySuccess).toHaveBeenCalledWith('Your counter was updated.');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it("starts the host from their own terms on the table — there is no venue counter — with no photos from an older server", async () => {
    const seen: Vars[] = [];
    const sent: Vars[] = [];
    const { card, onAnswered } = renderCard(hostCounter, { viewer: 'HOST', live: hostCounterLive(), mocks: [editQuote(seen), editMock(sent)] });
    expect(card.getByRole('heading')).toHaveTextContent('You countered');
    const form = openEdit(card);
    expect(form.getByLabelText('Amount (₹)')).toHaveValue(350);
    expect(form.getByLabelText('Fewest guests paid for')).toHaveValue(10);
    expect(form.getByLabelText('Note to the venue (optional)')).toHaveValue('We can do 350 a head');
    expect(form.queryByRole('img')).not.toBeInTheDocument();
    await waitFor(() => expect(seen).toContainEqual({ pod_id: 'pod-1', terms: { model: 'PER_GUEST', rate: 350, min_guests: 10 } }), SETTLED);

    fireEvent.click(form.getByTestId('counter-offer-submit'));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([
      { pod_id: 'pod-1', terms: { model: 'PER_GUEST', rate: 350, min_guests: 10, offerings: ['A stage'] }, note: 'We can do 350 a head', round: 3 },
    ]);
  });

  it("keeps the edit open with the server's reason when the other side saw it first, and cancels cleanly", async () => {
    const { card, onAnswered } = renderCard(venueCounter, {
      viewer: 'VENUE',
      live: venueCounterLive(),
      mocks: [editQuote([]), editMock([], failWith('The host has already seen your counter'))],
    });
    const form = openEdit(card);
    fireEvent.click(form.getByTestId('counter-offer-submit'));
    expect(await form.findByText('The host has already seen your counter', {}, SETTLED)).toBeInTheDocument();
    expect(onAnswered).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });
});

describe('withdrawing a counter', () => {
  const openWithdraw = (card: ReturnType<typeof renderCard>['card']) => {
    fireEvent.click(card.getByRole('button', { name: 'Withdraw' }));
    return within(screen.getByRole('dialog', { name: 'Withdraw your counter?' }));
  };

  it('asks first, then withdraws it for the round read and re-reads the offer', async () => {
    const sent: Vars[] = [];
    const { card, onAnswered } = renderCard(hostCounter, { viewer: 'HOST', live: hostCounterLive(), mocks: [withdrawMock(sent)] });
    const question = openWithdraw(card);
    expect(question.getByText('It is taken out of the chat and the terms before it are back on the table.')).toBeInTheDocument();
    expect(sent).toEqual([]);
    fireEvent.click(question.getByRole('button', { name: 'Withdraw counter' }));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ pod_id: 'pod-1', round: 3 }]);
    expect(notifySuccess).toHaveBeenCalledWith('Your counter was withdrawn.');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });

  it('shows why it was refused inside the question, and forgets it once closed', async () => {
    const { card, onAnswered } = renderCard(venueCounter, {
      viewer: 'VENUE',
      live: venueCounterLive(),
      mocks: [withdrawMock([], failWith('The host has already seen your counter'))],
    });
    let question = openWithdraw(card);
    fireEvent.click(question.getByRole('button', { name: 'Withdraw counter' }));
    expect(await question.findByRole('alert', {}, SETTLED)).toHaveTextContent('The host has already seen your counter');
    expect(onAnswered).not.toHaveBeenCalled();

    fireEvent.click(question.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
    question = openWithdraw(card);
    expect(question.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says the terms changed, closes and re-reads when the other side moved first', async () => {
    const { card, onAnswered } = renderCard(venueCounter, { viewer: 'VENUE', live: venueCounterLive(), mocks: [withdrawMock([], offerChanged())] });
    fireEvent.click(openWithdraw(card).getByRole('button', { name: 'Withdraw counter' }));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1), SETTLED);
    expect(notify).toHaveBeenCalledWith('The terms changed while you were reading them. Here are the latest.', 'warning');
    expect(notifySuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SETTLED);
  });
});
