import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import BookingOffersCard from './BookingOffersCard';
import type { BookingOffersVenue } from './queries';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

afterEach(cleanup);

type Business = BookingOffersVenue['settings']['offers']['min_business'];

const venue = (min_business: Business = [{ model: 'PER_GUEST', amount: 200 }], min_spend = 0, free_booking = false): BookingOffersVenue => ({
  id: 'v1',
  offer_min_guests: 8,
  offer_response_hours: 24,
  settings: { offers: { min_guests: 0, response_hours: 0, min_business, min_spend, free_booking } },
});

const SAVED = { updateVenueSettings: { __typename: 'Venue', id: 'v1', offer_min_guests: 8, offer_response_hours: 24 } };

const mount = (stored: BookingOffersVenue, answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) => {
  const onSaved = vi.fn<(message: string) => Promise<void>>(async () => undefined);
  const view = renderWithProviders(<BookingOffersCard venue={stored} onSaved={onSaved} />, { link: scriptedLink(answers, sent) });
  return { ...view, onSaved };
};

const row = (index: number) => within(screen.getByTestId(`booking-offers-min-business-row-${index}`));
const basisOf = (index: number) => row(index).getByRole('combobox').textContent;
const amountBox = (index: number) => row(index).getByLabelText('Amount (₹)') as HTMLInputElement;
const ADD = 'booking-offers-min-business-add';
const add = () => fireEvent.click(screen.getByTestId(ADD));
const removeButton = (index: number) => screen.getByTestId(`booking-offers-min-business-remove-${index}`) as HTMLButtonElement;
// findBy: a closing menu leaves the card hidden from the accessibility tree for a moment.
const save = async () => fireEvent.click(await screen.findByRole('button', { name: 'Save booking offers' }));

describe('BookingOffersCard — the business the venue hopes for', () => {
  it('opens on the stored amounts and adds one basis at a time — each once, never fewer than one row', async () => {
    mount(venue());
    expect(basisOf(0)).toBe('Per guest');
    expect(amountBox(0).value).toBe('200');
    expect(removeButton(0).disabled).toBe(true);

    add();
    expect(await waitFor(() => basisOf(1))).toBe('Per hour');
    expect(amountBox(1).value).toBe('');
    expect(removeButton(0).disabled).toBe(false);

    add();
    expect(await waitFor(() => basisOf(2))).toBe('Per booking');
    // Every basis is listed: there is nothing left to add.
    expect(screen.queryByTestId(ADD)).toBeNull();

    fireEvent.click(removeButton(2));
    await waitFor(() => expect(screen.queryByTestId('booking-offers-min-business-row-2')).toBeNull());
    expect(screen.getByTestId(ADD)).toBeTruthy();
  });

  it('starts a venue that named no amount on one empty row, and asks for an amount before saving', async () => {
    const sent: SentOperation[] = [];
    const { onSaved } = mount(venue(null), { UpdateVenueOfferSettings: SAVED }, sent);
    expect(basisOf(0)).toBe('Per guest');
    expect(amountBox(0).value).toBe('');

    await save();
    expect(await row(0).findByText(/^Enter an amount above 0, up to /)).toBeTruthy();
    expect(sent.some((op) => op.name === 'UpdateVenueOfferSettings')).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('refuses the same basis twice', async () => {
    const sent: SentOperation[] = [];
    mount(venue(), { UpdateVenueOfferSettings: SAVED }, sent);
    add();
    fireEvent.mouseDown(await waitFor(() => row(1).getByRole('combobox')));
    fireEvent.click(await screen.findByRole('option', { name: 'Per guest' }));
    fireEvent.change(amountBox(1), { target: { value: '300' } });
    await save();

    expect(await row(1).findByText('List each basis once')).toBeTruthy();
    expect(sent.some((op) => op.name === 'UpdateVenueOfferSettings')).toBe(false);
  });

  it('saves every amount with the two numbers, and reports the save', async () => {
    const sent: SentOperation[] = [];
    const { onSaved } = mount(venue(), { UpdateVenueOfferSettings: SAVED }, sent);
    add();
    fireEvent.change(await waitFor(() => amountBox(1)), { target: { value: '400.5' } });
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Booking offers saved.'));
    expect(sent.find((op) => op.name === 'UpdateVenueOfferSettings')?.variables).toEqual({
      venue_doc_id: 'v1',
      input: {
        offers: {
          min_guests: 0,
          response_hours: 0,
          min_business: [
            { model: 'PER_GUEST', amount: 200 },
            { model: 'PER_HOUR', amount: 400.5 },
          ],
          min_spend: 0,
          free_booking: false,
        },
      },
    });
  });

  it('opens on the stored minimum spend and saves the new one with the offers', async () => {
    const sent: SentOperation[] = [];
    const { onSaved } = mount(venue(undefined, 4500), { UpdateVenueOfferSettings: SAVED }, sent);
    const spend = screen.getByLabelText('Minimum spend per booking (₹)') as HTMLInputElement;
    expect(spend.value).toBe('4500');
    fireEvent.change(spend, { target: { value: '6000' } });
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Booking offers saved.'));
    expect(sent.find((op) => op.name === 'UpdateVenueOfferSettings')?.variables).toMatchObject({
      input: { offers: { min_business: [{ model: 'PER_GUEST', amount: 200 }], min_spend: 6000 } },
    });
  });

  it('opens on the stored free-bookings switch and saves it turned off', async () => {
    const sent: SentOperation[] = [];
    const { onSaved } = mount(venue(undefined, 0, true), { UpdateVenueOfferSettings: SAVED }, sent);
    const toggle = screen.getByRole('switch', { name: 'Your venue is open for free venue booking for initiatives' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Booking offers saved.'));
    expect(sent.find((op) => op.name === 'UpdateVenueOfferSettings')?.variables).toMatchObject({
      input: { offers: { free_booking: false } },
    });
  });

  it('refuses a negative minimum spend and sends nothing', async () => {
    const sent: SentOperation[] = [];
    mount(venue(), { UpdateVenueOfferSettings: SAVED }, sent);
    fireEvent.change(screen.getByLabelText('Minimum spend per booking (₹)'), { target: { value: '-1' } });
    await save();
    expect(await screen.findByText(/^Enter an amount from 0 to /)).toBeTruthy();
    expect(sent.some((op) => op.name === 'UpdateVenueOfferSettings')).toBe(false);
  });

  it('shows the server’s refusal in the card and reports no save', async () => {
    const { onSaved } = mount(venue(), { UpdateVenueOfferSettings: new Error('Venue is suspended') });
    await save();
    expect(await screen.findByText('Venue is suspended')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('keeps what the owner typed when the venue comes back unchanged, and starts over when its amounts change', async () => {
    const { rerenderWith, onSaved } = mount(venue());
    fireEvent.change(amountBox(0), { target: { value: '350' } });

    // A background refresh: a fresh object, the same stored values.
    rerenderWith(<BookingOffersCard venue={venue([{ model: 'PER_GUEST', amount: 200 }])} onSaved={onSaved} />);
    expect(amountBox(0).value).toBe('350');

    rerenderWith(<BookingOffersCard venue={venue([{ model: 'FLAT', amount: 9000 }])} onSaved={onSaved} />);
    await waitFor(() => expect(amountBox(0).value).toBe('9000'));
    expect(basisOf(0)).toBe('Per booking');
  });
});
