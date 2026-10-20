import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { notifySuccess } from '@duncit/dialogs';
import EventRequestRespondActions, { type RespondableRequest } from '../src/event-requests/EventRequestRespondActions';
import OfferSummary from '../src/event-requests/OfferSummary';
import VenueEventRequestList from '../src/event-requests/VenueEventRequestList';
import { MY_VENUE_EVENT_REQUESTS, RESPOND_TO_EVENT_REQUEST, type VenueEventRequest } from '../src/event-requests/queries';
import { VENUE_PRICE_QUOTE } from '../src/pricing/queries';
import { breakdownResult, makeBreakdown } from './pricing-fixtures';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@mui/x-date-pickers/TimePicker', async () => ({ TimePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn() }));

const SETTLED = { timeout: 3000 };
const at = (d: number, h: number, m = 0) => new Date(2026, 11, d, h, m).toISOString();

const request = (over: Partial<RespondableRequest> = {}): RespondableRequest => ({
  id: 'req-1',
  status: 'OPEN',
  target_id: 'venue-1',
  requester_name: 'Asha',
  offer: null,
  ...over,
});

const respondedRow = (variables: Record<string, any>) => ({
  __typename: 'EventRequest',
  id: variables.id,
  status: variables.response === 'REJECT' ? 'REJECTED' : 'ACCEPTED',
  closed_at: null,
  response_note: variables.note ?? '',
  responded_at: '2026-12-01T06:30:00.000Z',
  offer: null,
});

/** Records what each respond carried and answers it (or fails it). */
function respondMock(sent: Record<string, any>[], fail?: Error | GraphQLError): MockedResponse {
  return {
    request: { query: RESPOND_TO_EVENT_REQUEST, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Record<string, any>) => {
      sent.push(variables);
      return (fail ? { errors: [fail] } : { data: { respondToEventRequest: respondedRow(variables) } }) as never;
    },
  };
}

function quoteMock(seen: Record<string, any>[], fail?: GraphQLError): MockedResponse {
  return {
    request: { query: VENUE_PRICE_QUOTE, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Record<string, any>) => {
      seen.push(variables);
      return (fail ? { errors: [fail] } : { data: { venuePriceQuote: breakdownResult(makeBreakdown()) } }) as never;
    },
  };
}

const withApollo = (mocks: MockedResponse[], ui: ReactNode) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );

function renderActions(mocks: MockedResponse[], over: Partial<RespondableRequest> = {}, targetType: 'VENUE' | 'HOST' = 'VENUE', onDone = vi.fn()) {
  withApollo(mocks, <EventRequestRespondActions request={request(over)} targetType={targetType} onDone={onDone} />);
  return onDone;
}

const dialog = () => within(screen.getByRole('dialog'));

describe('Workshop & event requests', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 1, 12));
    vi.mocked(notifySuccess).mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('respond actions', () => {
    it.each(['REJECTED', 'FULFILLED', 'DISMISSED'] as const)('offers nothing on a %s request', (status) => {
      renderActions([], { status });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('accepts with a note, confirms it, closes and refreshes the list', async () => {
      const sent: Record<string, any>[] = [];
      const onDone = renderActions([respondMock(sent)]);
      fireEvent.click(screen.getByTestId('event-request-accept-req-1'));

      expect(dialog().getByText('Accept this request')).toBeInTheDocument();
      expect(dialog().getByText('Requested by Asha')).toBeInTheDocument();
      // Accept and reject ask for no window.
      expect(dialog().queryByLabelText('Date')).not.toBeInTheDocument();
      fireEvent.change(dialog().getByLabelText('Message to the member (optional)'), { target: { value: '  See you on the 5th  ' } });
      fireEvent.click(dialog().getByTestId('respond-submit'));

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(sent).toEqual([{ id: 'req-1', response: 'ACCEPT', note: 'See you on the 5th', offer: null }]);
      expect(notifySuccess).toHaveBeenCalledWith('Your answer was sent.');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('rejects without a note', async () => {
      const sent: Record<string, any>[] = [];
      renderActions([respondMock(sent)]);
      fireEvent.click(screen.getByTestId('event-request-reject-req-1'));
      expect(dialog().getByText('Reject this request')).toBeInTheDocument();
      fireEvent.click(dialog().getByRole('button', { name: 'Reject' }));
      await waitFor(() => expect(sent).toEqual([{ id: 'req-1', response: 'REJECT', note: null, offer: null }]));
    });

    it('keeps a note within 280 characters', async () => {
      const sent: Record<string, any>[] = [];
      renderActions([respondMock(sent)]);
      fireEvent.click(screen.getByTestId('event-request-reject-req-1'));
      fireEvent.change(dialog().getByLabelText('Message to the member (optional)'), { target: { value: 'x'.repeat(281) } });
      fireEvent.click(dialog().getByTestId('respond-submit'));
      expect(await dialog().findByText('At most 280 characters')).toBeInTheDocument();
      expect(sent).toHaveLength(0);
    });

    it("shows the server's reason and keeps the dialog open when the answer fails", async () => {
      const sent: Record<string, any>[] = [];
      const onDone = renderActions([respondMock(sent, new GraphQLError('This request is already closed'))]);
      fireEvent.click(screen.getByTestId('event-request-accept-req-1'));
      fireEvent.click(dialog().getByTestId('respond-submit'));

      expect(await dialog().findByText('This request is already closed')).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
      expect(notifySuccess).not.toHaveBeenCalled();
    });

    it('closes once the answer is saved even if the list fails to refresh', async () => {
      const sent: Record<string, any>[] = [];
      const onDone = vi.fn().mockRejectedValue(new Error('offline'));
      renderActions([respondMock(sent)], {}, 'VENUE', onDone);
      fireEvent.click(screen.getByTestId('event-request-accept-req-1'));
      fireEvent.click(dialog().getByTestId('respond-submit'));
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(notifySuccess).toHaveBeenCalledWith('Your answer was sent.');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('cancels without answering', async () => {
      const sent: Record<string, any>[] = [];
      renderActions([respondMock(sent)]);
      fireEvent.click(screen.getByTestId('event-request-reject-req-1'));
      fireEvent.click(dialog().getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(sent).toHaveLength(0);
    });
  });

  describe('counter offer', () => {
    it("prices the offered window with the venue's pricing and sends it", async () => {
      const sent: Record<string, any>[] = [];
      const quotes: Record<string, any>[] = [];
      renderActions([respondMock(sent), quoteMock(quotes)]);
      fireEvent.click(screen.getByTestId('event-request-counter-req-1'));

      expect(dialog().getByText('Offer another time')).toBeInTheDocument();
      expect(dialog().getByText('Price at your venue')).toBeInTheDocument();
      // Starts on tomorrow evening for 10 guests, priced from the venue's SAVED pricing.
      expect(await dialog().findByTestId('price-breakdown', undefined, SETTLED)).toHaveTextContent('Total₹6,600');
      expect(quotes[0]).toEqual({ venue_id: 'venue-1', booking: { start_at: at(2, 18), end_at: at(2, 20), pax: 10, pets: false }, draft: null });

      fireEvent.change(dialog().getByLabelText('Guests'), { target: { value: '30' } });
      fireEvent.change(dialog().getByLabelText('Date'), { target: { value: '2026-12-05T00:00' } });
      expect(dialog().getByRole('progressbar', { name: 'Working out the price' })).toBeInTheDocument();
      await waitFor(() => expect(quotes.at(-1)?.booking).toMatchObject({ start_at: at(5, 18), pax: 30 }), SETTLED);

      fireEvent.click(dialog().getByRole('button', { name: 'Send offer' }));
      await waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0]).toEqual({ id: 'req-1', response: 'COUNTER', note: null, offer: { start_at: at(5, 18), end_at: at(5, 20), pax: 30 } });
    });

    it('reopens on the current offer', async () => {
      const offer = { start_at: at(8, 17, 30), end_at: at(8, 19), pax: 12, quote: { total: 4400, venue_payout: 4000 } };
      renderActions([respondMock([]), quoteMock([])], { status: 'COUNTERED', offer });
      fireEvent.click(screen.getByTestId('event-request-counter-req-1'));
      expect(dialog().getByLabelText('Guests')).toHaveValue(12);
      expect(dialog().getByLabelText('Date')).toHaveValue(new Date(2026, 11, 8).toISOString());
    });

    it('refuses a window that ends before it starts, and asks no price for it', async () => {
      const sent: Record<string, any>[] = [];
      const quotes: Record<string, any>[] = [];
      renderActions([respondMock(sent), quoteMock(quotes)]);
      fireEvent.click(screen.getByTestId('event-request-counter-req-1'));
      await dialog().findByTestId('price-breakdown', undefined, SETTLED);

      fireEvent.change(dialog().getByLabelText('Ends'), { target: { value: '2026-12-02T17:00' } });
      expect(dialog().queryByTestId('price-breakdown')).not.toBeInTheDocument();
      expect(dialog().queryByRole('progressbar')).not.toBeInTheDocument();
      fireEvent.click(dialog().getByRole('button', { name: 'Send offer' }));
      expect(await dialog().findByText('Must be after the start')).toBeInTheDocument();
      expect(sent).toHaveLength(0);
      expect(quotes).toHaveLength(1);
    });

    it('needs a date for the offer', async () => {
      const sent: Record<string, any>[] = [];
      renderActions([respondMock(sent), quoteMock([])]);
      fireEvent.click(screen.getByTestId('event-request-counter-req-1'));
      fireEvent.change(dialog().getByLabelText('Date'), { target: { value: 'not a date' } });
      fireEvent.click(dialog().getByRole('button', { name: 'Send offer' }));
      expect(await dialog().findByText('Pick at least one date')).toBeInTheDocument();
      expect(sent).toHaveLength(0);
    });

    it("says when the venue's pricing cannot price the window", async () => {
      renderActions([respondMock([]), quoteMock([], new GraphQLError('Venue is closed on that date'))]);
      fireEvent.click(screen.getByTestId('event-request-counter-req-1'));
      expect(await dialog().findByText('Venue is closed on that date', undefined, SETTLED)).toBeInTheDocument();
    });

    it("prices nothing for a host's request — the offer is only a time", async () => {
      const sent: Record<string, any>[] = [];
      const quotes: Record<string, any>[] = [];
      renderActions([respondMock(sent), quoteMock(quotes)], {}, 'HOST');
      fireEvent.click(screen.getByTestId('event-request-counter-req-1'));
      expect(dialog().queryByText('Price at your venue')).not.toBeInTheDocument();
      fireEvent.click(dialog().getByRole('button', { name: 'Send offer' }));
      await waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0].offer).toEqual({ start_at: at(2, 18), end_at: at(2, 20), pax: 10 });
      expect(quotes).toHaveLength(0);
    });
  });

  describe('OfferSummary', () => {
    it('shows nothing when there is no offer or note', () => {
      const { container } = render(
        <MockedProvider mocks={[]}>
          <OfferSummary offer={null} responseNote="" />
        </MockedProvider>,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('shows the offered window, its frozen price and the note', () => {
      withApollo([], <OfferSummary offer={{ start_at: at(5, 18), end_at: at(5, 20), pax: 30, quote: { total: 9900, venue_payout: 9000 } }} responseNote="Bring mats" />);
      const summary = screen.getByTestId('event-request-offer');
      expect(summary).toHaveTextContent(/Offered: .+ · 30 guests/);
      expect(summary).toHaveTextContent('Total ₹9,900 · you receive ₹9,000');
      expect(summary).toHaveTextContent('Your note: Bring mats');
    });

    it('shows a note alone, or an offer with no price', () => {
      withApollo([], <OfferSummary offer={undefined} responseNote="Fully booked" />);
      expect(screen.getByTestId('event-request-offer')).toHaveTextContent(/^Your note: Fully booked$/);
    });

    it('shows an unpriced offer without a price line', () => {
      withApollo([], <OfferSummary offer={{ start_at: at(5, 18), end_at: at(5, 20), pax: 8, quote: null }} />);
      const summary = screen.getByTestId('event-request-offer');
      expect(summary).toHaveTextContent('8 guests');
      expect(summary).not.toHaveTextContent('Total');
    });
  });

  describe('VenueEventRequestList', () => {
    const row = (over: Partial<VenueEventRequest>) => ({
      __typename: 'EventRequest',
      id: 'req-1',
      target_id: 'venue-1',
      target_name: 'Skyline Banquets',
      requester_name: 'Asha',
      note: '',
      status: 'OPEN',
      response_note: '',
      responded_at: null,
      created_at: '2026-11-28T10:00:00.000Z',
      offer: null,
      ...over,
    });
    const rows = [
      row({ id: 'req-1', note: 'A pottery workshop for 20' }),
      row({
        id: 'req-2',
        requester_name: 'Ravi',
        status: 'COUNTERED',
        response_note: 'Saturday works better',
        offer: { __typename: 'EventRequestOffer', start_at: at(5, 18), end_at: at(5, 20), pax: 20, quote: { __typename: 'VenuePriceBreakdown', total: 6600, venue_payout: 6000 } } as never,
      }),
      row({ id: 'req-3', requester_name: 'Meera', status: 'REJECTED' }),
    ];

    function listMock(answer: () => object, seen: Record<string, any>[] = [], delay?: number): MockedResponse {
      return {
        request: { query: MY_VENUE_EVENT_REQUESTS, variables: () => true },
        maxUsageCount: Number.POSITIVE_INFINITY,
        delay,
        result: (variables: Record<string, any>) => {
          seen.push(variables);
          return answer() as never;
        },
      };
    }
    const page = (total: number, list: unknown[]) => () => ({
      data: { myReceivedEventRequestsTable: { __typename: 'EventRequestTablePage', total, rows: list } },
    });

    it('shows a skeleton while the requests load', () => {
      withApollo([listMock(page(0, []), [], 60_000)], <VenueEventRequestList />);
      expect(screen.getByLabelText('Loading event requests')).toHaveAttribute('aria-busy', 'true');
    });

    it('says when the requests could not be loaded', async () => {
      withApollo([listMock(() => ({ errors: [new GraphQLError('boom')] }))], <VenueEventRequestList />);
      expect(await screen.findByText("We couldn't load event requests.")).toBeInTheDocument();
    });

    it('says when there are no requests yet', async () => {
      withApollo([listMock(page(0, []))], <VenueEventRequestList />);
      expect(await screen.findByText('No event requests yet.')).toBeInTheDocument();
    });

    it("lists each request with its status chip, note, offer and the actions still open, newest first", async () => {
      const seen: Record<string, any>[] = [];
      withApollo([listMock(page(3, rows), seen)], <VenueEventRequestList />);
      const items = within(await screen.findByTestId('venue-event-request-list')).getAllByRole('listitem');

      expect(seen[0]).toEqual({ query: { page: 1, page_size: 20, sort_by: 'created_at', sort_dir: 'desc' } });
      expect(items).toHaveLength(3);
      expect(within(items[0]).getByText('Open')).toBeInTheDocument();
      expect(within(items[0]).getByText('A pottery workshop for 20')).toBeInTheDocument();
      expect(within(items[0]).getByText(/^Skyline Banquets · /)).toBeInTheDocument();
      expect(within(items[0]).queryByTestId('event-request-offer')).not.toBeInTheDocument();
      expect(within(items[1]).getByText('Offer sent')).toBeInTheDocument();
      expect(within(items[1]).getByTestId('event-request-offer')).toHaveTextContent('Total ₹6,600 · you receive ₹6,000');
      expect(within(items[1]).getByTestId('event-request-accept-req-2')).toBeInTheDocument();
      expect(within(items[2]).getByText('Rejected')).toBeInTheDocument();
      expect(within(items[2]).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    });

    it('grows the page with Show more and re-reads after an answer', async () => {
      const seen: Record<string, any>[] = [];
      const sent: Record<string, any>[] = [];
      withApollo([listMock(page(45, rows), seen), respondMock(sent)], <VenueEventRequestList />);
      fireEvent.click(await screen.findByRole('button', { name: 'Show more' }));
      await waitFor(() => expect(seen.at(-1)?.query.page_size).toBe(40));

      const reads = seen.length;
      fireEvent.click(screen.getByTestId('event-request-reject-req-1'));
      fireEvent.click(dialog().getByTestId('respond-submit'));
      await waitFor(() => expect(sent).toHaveLength(1));
      await waitFor(() => expect(seen.length).toBeGreaterThan(reads));
    });

    it('stops offering more at the page-size ceiling', async () => {
      const seen: Record<string, any>[] = [];
      withApollo([listMock(page(500, rows), seen)], <VenueEventRequestList />);
      for (const size of [40, 60, 80, 100]) {
        fireEvent.click(await screen.findByRole('button', { name: 'Show more' }));
        await waitFor(() => expect(seen.at(-1)?.query.page_size).toBe(size));
      }
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument());
    });
  });
});
