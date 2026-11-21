import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import BookingOffersCard from '../BookingOffersCard';
import { UPDATE_VENUE_BOOKING_OFFERS, type SettingsVenue } from '../queries';

const toast = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('../../../components/notify', () => ({ notifySuccess: toast.success }));

afterEach(() => {
  cleanup();
  toast.success.mockClear();
});

/** The venue hopes for ₹200 a guest, and set nothing else of its own. */
const venue = (over: Partial<SettingsVenue> = {}): SettingsVenue => ({
  id: 'v1',
  venue_name: 'Court House',
  status: 'APPROVED',
  city: 'Bengaluru',
  offer_min_guests: 8,
  offer_response_hours: 24,
  settings: { offers: { min_guests: 0, response_hours: 0, min_business: [{ model: 'PER_GUEST', amount: 200 }] } },
  ...over,
});

/** Answers the save and keeps what it was sent. */
const saveMock = (fail = false) => {
  const sent: Record<string, unknown>[] = [];
  const mock: MockedResponse = {
    request: {
      query: UPDATE_VENUE_BOOKING_OFFERS,
      variables: (variables: Record<string, unknown>) => {
        sent.push(variables);
        return true;
      },
    },
    ...(fail
      ? { error: new Error('Venue is suspended') }
      : {
          result: {
            data: {
              updateVenueSettings: { __typename: 'Venue', id: 'v1', offer_min_guests: 12, offer_response_hours: 48 },
            },
          },
        }),
  };
  return { mock, sent };
};

const card = (mocks: MockedResponse[], shown: SettingsVenue, onSaved: () => Promise<unknown>) => (
  <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
    <BookingOffersCard venue={shown} onSaved={onSaved} />
  </MockedProvider>
);

const mount = (mocks: MockedResponse[], over: Partial<SettingsVenue> = {}) => {
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const view = render(card(mocks, venue(over), onSaved));
  const rerender = (next: Partial<SettingsVenue>) => view.rerender(card(mocks, venue(next), onSaved));
  return { onSaved, rerender };
};
const field = (testId: string) => within(screen.getByTestId(testId)).getByRole('spinbutton');
const row = (index: number) => within(screen.getByTestId(`booking-offers-min-business-row-${index}`));

describe('BookingOffersCard', () => {
  it('starts from the venue’s stored values and amounts, one row per basis it named', () => {
    mount([], {
      settings: {
        offers: {
          min_guests: 15,
          response_hours: 6,
          min_business: [
            { model: 'PER_GUEST', amount: 200 },
            { model: 'FLAT', amount: 5000 },
          ],
        },
      },
    });
    expect(field('booking-offers-min-guests')).toHaveValue(15);
    expect(field('booking-offers-response-hours')).toHaveValue(6);
    expect(row(0).getByRole('combobox')).toHaveTextContent('Per guest');
    expect(row(0).getByRole('spinbutton')).toHaveValue(200);
    expect(row(1).getByRole('combobox')).toHaveTextContent('Per booking');
    expect(row(1).getByRole('spinbutton')).toHaveValue(5000);
  });

  it('starts a venue that never saved any at 0, with one empty amount to fill', () => {
    mount([], { settings: null });
    expect(field('booking-offers-min-guests')).toHaveValue(0);
    expect(field('booking-offers-response-hours')).toHaveValue(0);
    expect(row(0).getByRole('combobox')).toHaveTextContent('Per guest');
    expect(row(0).getByRole('spinbutton')).toHaveValue(null);
    expect(screen.queryByTestId('booking-offers-min-business-row-1')).not.toBeInTheDocument();
  });

  it('saves only the offers for the venue — the amounts with them — says so and re-reads it', async () => {
    const { mock, sent } = saveMock();
    const { onSaved } = mount([mock]);
    fireEvent.change(field('booking-offers-min-guests'), { target: { value: '12' } });
    fireEvent.change(field('booking-offers-response-hours'), { target: { value: '48' } });
    fireEvent.change(row(0).getByRole('spinbutton'), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('booking-offers-save'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      {
        venue_doc_id: 'v1',
        input: { offers: { min_guests: 12, response_hours: 48, min_business: [{ model: 'PER_GUEST', amount: 250 }] } },
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith('Booking offers saved.');
  });

  it('holds the save until the venue names an amount', async () => {
    const { mock, sent } = saveMock();
    const { onSaved } = mount([mock], { settings: null });
    fireEvent.click(screen.getByTestId('booking-offers-save'));

    expect(await screen.findByText(/^Enter an amount above 0, up to/)).toBeInTheDocument();
    expect(sent).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal and re-reads nothing', async () => {
    const { mock } = saveMock(true);
    const { onSaved } = mount([mock]);
    fireEvent.click(screen.getByTestId('booking-offers-save'));

    expect(await screen.findByTestId('booking-offers-error')).toHaveTextContent('Venue is suspended');
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  // A refetch hands back fresh objects: the same stored amounts must not wipe what is being typed.
  it('keeps a typed amount through a re-read of the same values, and starts over when the stored amounts change', () => {
    const { rerender } = mount([]);
    fireEvent.change(row(0).getByRole('spinbutton'), { target: { value: '275' } });

    rerender({ settings: { offers: { min_guests: 0, response_hours: 0, min_business: [{ model: 'PER_GUEST', amount: 200 }] } } });
    expect(row(0).getByRole('spinbutton')).toHaveValue(275);

    rerender({ settings: { offers: { min_guests: 0, response_hours: 0, min_business: [{ model: 'PER_HOUR', amount: 400 }] } } });
    expect(row(0).getByRole('combobox')).toHaveTextContent('Per hour');
    expect(row(0).getByRole('spinbutton')).toHaveValue(400);
  });
});
