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

const venue = (over: Partial<SettingsVenue> = {}): SettingsVenue => ({
  id: 'v1',
  venue_name: 'Court House',
  status: 'APPROVED',
  city: 'Bengaluru',
  offer_min_guests: 8,
  offer_response_hours: 24,
  settings: { offers: { min_guests: 0, response_hours: 0 } },
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

const mount = (mocks: MockedResponse[], over: Partial<SettingsVenue> = {}) => {
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <BookingOffersCard venue={venue(over)} onSaved={onSaved} />
    </MockedProvider>,
  );
  return onSaved;
};
const field = (testId: string) => within(screen.getByTestId(testId)).getByRole('spinbutton');

describe('BookingOffersCard', () => {
  it('starts from the venue’s stored values, a venue that never saved any at 0', () => {
    mount([], { settings: { offers: { min_guests: 15, response_hours: 6 } } });
    expect(field('booking-offers-min-guests')).toHaveValue(15);
    expect(field('booking-offers-response-hours')).toHaveValue(6);
    cleanup();

    mount([], { settings: null });
    expect(field('booking-offers-min-guests')).toHaveValue(0);
    expect(field('booking-offers-response-hours')).toHaveValue(0);
  });

  it('saves only the offers for the venue, says so and re-reads it', async () => {
    const { mock, sent } = saveMock();
    const onSaved = mount([mock]);
    fireEvent.change(field('booking-offers-min-guests'), { target: { value: '12' } });
    fireEvent.change(field('booking-offers-response-hours'), { target: { value: '48' } });
    fireEvent.click(screen.getByTestId('booking-offers-save'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([{ venue_doc_id: 'v1', input: { offers: { min_guests: 12, response_hours: 48 } } }]);
    expect(toast.success).toHaveBeenCalledWith('Booking offers saved.');
  });

  it('shows the server’s refusal and re-reads nothing', async () => {
    const { mock } = saveMock(true);
    const onSaved = mount([mock]);
    fireEvent.click(screen.getByTestId('booking-offers-save'));

    expect(await screen.findByTestId('booking-offers-error')).toHaveTextContent('Venue is suspended');
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
