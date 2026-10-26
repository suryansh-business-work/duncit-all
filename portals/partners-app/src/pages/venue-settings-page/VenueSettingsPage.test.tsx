import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import VenueSettingsPage from './VenueSettingsPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { SELECTED_VENUE_KEY } from '../../components/venue/useSelectedVenue';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

/** The venue's own booking-offer settings (0 = Duncit's default, with the business it hopes for) and what is in effect. */
interface OfferSettings {
  own: { min_guests: number; response_hours: number; min_business: { model: string; amount: number }[] };
  effective: { min_guests: number; response_hours: number };
}
const DEFAULT_OFFERS: OfferSettings = {
  own: { min_guests: 0, response_hours: 0, min_business: [{ model: 'PER_GUEST', amount: 200 }] },
  effective: { min_guests: 8, response_hours: 24 },
};

const venue = (
  id: string,
  name: string,
  tiers: unknown[] = [],
  rescheduleOnly = false,
  offers: OfferSettings = DEFAULT_OFFERS,
) => ({
  __typename: 'Venue',
  id,
  venue_name: name,
  status: 'APPROVED',
  offer_min_guests: offers.effective.min_guests,
  offer_response_hours: offers.effective.response_hours,
  settings: {
    __typename: 'VenueSettings',
    cancellation: {
      __typename: 'VenueCancellationPolicy',
      reschedule_only: rescheduleOnly,
      tiers: tiers.map((tier) => ({ __typename: 'VenueCancellationTier', ...(tier as object) })),
    },
    offers: {
      __typename: 'VenueOfferSettings',
      ...offers.own,
      min_business: offers.own.min_business.map((row) => ({ __typename: 'VenueMinBusiness', ...row })),
    },
  },
});

const mount = (venues: unknown[], answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<VenueSettingsPage />, {
    route: '/venues/settings',
    link: scriptedLink({ MyVenuesSettings: { myVenues: venues }, ...answers }, sent),
  });

const saved = { updateVenueSettings: { __typename: 'Venue', id: 'v1', settings: venue('v1', 'x').settings } };
const tier = { hours_before: 24, charge_type: 'PERCENT', value: 50 };

describe('VenueSettingsPage', () => {
  it('says there is nothing to set up when the owner has no venue', async () => {
    mount([]);
    expect(await screen.findByText('Register a venue first — settings apply to a venue you own.')).toBeTruthy();
  });

  it('opens on the venue picked last and shows that venue’s bands', async () => {
    globalThis.localStorage.setItem(SELECTED_VENUE_KEY, 'v2');
    mount([venue('v1', 'Court House'), venue('v2', 'Arena', [tier])]);
    expect(await screen.findByDisplayValue('24')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Venue' }).textContent).toBe('Arena');
  });

  it('says cancelling is free when there are no bands', async () => {
    mount([venue('v1', 'Court House')]);
    expect(await screen.findByText('No charges yet — cancelling is free at any time.')).toBeTruthy();
  });

  it('switches venue and loads that venue’s policy', async () => {
    mount([venue('v1', 'Court House'), venue('v2', 'Arena', [tier])]);
    await screen.findByText('No charges yet — cancelling is free at any time.');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Venue' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Arena' }));
    expect(await screen.findByDisplayValue('24')).toBeTruthy();
  });

  it('adds a band and saves the policy for the selected venue', async () => {
    const sent: SentOperation[] = [];
    mount([venue('v1', 'Court House')], { UpdateVenueCancellation: saved }, sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Add a charge' }));
    const hours = await screen.findByLabelText(/Cancel within \(hours\)/);
    fireEvent.change(hours, { target: { value: '12' } });
    // 'Amount' exactly: the Booking offers card below has its own 'Amount (₹)'.
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));

    expect(await screen.findByText('Cancellation policy saved.')).toBeTruthy();
    const save = sent.find((op) => op.name === 'UpdateVenueCancellation');
    expect(save?.variables.venue_doc_id).toBe('v1');
    expect(save?.variables.input).toEqual({
      cancellation: { reschedule_only: false, tiers: [{ hours_before: 12, charge_type: 'PERCENT', value: 25 }] },
    });
  });

  it('refuses two bands for the same window and does not call the server', async () => {
    const sent: SentOperation[] = [];
    mount([venue('v1', 'Court House')], {}, sent);
    const add = await screen.findByRole('button', { name: 'Add a charge' });
    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    await waitFor(() => expect(screen.getAllByText('Another band already covers this window').length).toBeGreaterThan(0));
    expect(sent.some((op) => op.name === 'UpdateVenueCancellation')).toBe(false);
  });

  it('greys the bands out and says so when the venue is reschedule-only', async () => {
    mount([venue('v1', 'Court House', [tier], true)]);
    expect(await screen.findByText('Cancellation charges are off because this venue is reschedule-only.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Add a charge' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByDisplayValue('24') as HTMLInputElement).disabled).toBe(true);
  });

  it('shows the server’s refusal under the form', async () => {
    mount([venue('v1', 'Court House', [tier])], { UpdateVenueCancellation: new Error('Venue is suspended') });
    fireEvent.click(await screen.findByRole('button', { name: 'Save policy' }));
    expect(await screen.findByText('Venue is suspended')).toBeTruthy();
    expect(within(screen.getByRole('alert')).getByText('Venue is suspended')).toBeTruthy();
  });
});

describe('VenueSettingsPage booking offers', () => {
  const offersSaved = {
    updateVenueSettings: { __typename: 'Venue', id: 'v1', offer_min_guests: 12, offer_response_hours: 48 },
  };
  const card = () => within(screen.getByTestId('booking-offers-card'));

  // 0 leaves it to Duncit; the hint says what that means right now.
  it('shows the venue’s own values with what is in effect under each', async () => {
    mount([venue('v1', 'Court House')]);
    expect(await screen.findByRole('heading', { name: 'Booking offers' })).toBeTruthy();
    expect((card().getByLabelText('Minimum guests') as HTMLInputElement).value).toBe('0');
    expect((card().getByLabelText('Response time (hours)') as HTMLInputElement).value).toBe('0');
    expect(card().getByText('0 uses Duncit’s default. In effect now: 8 guests.')).toBeTruthy();
    expect(card().getByText('0 uses Duncit’s default. In effect now: 24 hours.')).toBeTruthy();
    // The business the venue hopes for, one row per stored amount.
    const row = within(card().getByTestId('booking-offers-min-business-row-0'));
    expect(row.getByRole('combobox').textContent).toBe('Per guest');
    expect((row.getByLabelText('Amount (₹)') as HTMLInputElement).value).toBe('200');
    expect(card().queryByTestId('booking-offers-min-business-row-1')).toBeNull();
  });

  it('saves the two numbers and the business amounts for the selected venue, says so and re-reads the venue', async () => {
    const sent: SentOperation[] = [];
    mount([venue('v1', 'Court House')], { UpdateVenueOfferSettings: offersSaved }, sent);
    fireEvent.change(await screen.findByLabelText('Minimum guests'), { target: { value: '12' } });
    fireEvent.change(card().getByLabelText('Response time (hours)'), { target: { value: '48' } });
    fireEvent.click(card().getByRole('button', { name: 'Save booking offers' }));

    expect(await screen.findByText('Booking offers saved.')).toBeTruthy();
    const save = sent.find((op) => op.name === 'UpdateVenueOfferSettings');
    expect(save?.variables).toEqual({
      venue_doc_id: 'v1',
      input: { offers: { min_guests: 12, response_hours: 48, min_business: [{ model: 'PER_GUEST', amount: 200 }] } },
    });
    // Only the offers go: the cancellation policy is left alone.
    expect(save?.variables.input).not.toHaveProperty('cancellation');
    await waitFor(() => expect(sent.filter((op) => op.name === 'MyVenuesSettings').length).toBeGreaterThan(1));
  });

  it.each([
    ['Minimum guests', '1001', 'Enter a whole number of guests from 0 to 1000'],
    ['Minimum guests', '2.5', 'Enter a whole number of guests from 0 to 1000'],
    ['Response time (hours)', '721', 'Enter a whole number of hours from 0 to 720'],
    ['Response time (hours)', '-1', 'Enter a whole number of hours from 0 to 720'],
  ])('refuses %s of %s and does not call the server', async (label, value, message) => {
    const sent: SentOperation[] = [];
    mount([venue('v1', 'Court House')], {}, sent);
    fireEvent.change(await screen.findByLabelText(label), { target: { value } });
    fireEvent.click(card().getByRole('button', { name: 'Save booking offers' }));

    expect(await card().findByText(message)).toBeTruthy();
    expect(sent.some((op) => op.name === 'UpdateVenueOfferSettings')).toBe(false);
  });

  it('shows the server’s refusal inside the card', async () => {
    mount([venue('v1', 'Court House')], { UpdateVenueOfferSettings: new Error('Venue is suspended') });
    fireEvent.click(await within(await screen.findByTestId('booking-offers-card')).findByRole('button', { name: 'Save booking offers' }));
    expect(await card().findByText('Venue is suspended')).toBeTruthy();
  });

  it('loads the next venue’s own settings when the owner switches venue', async () => {
    const own = {
      own: {
        min_guests: 15,
        response_hours: 6,
        min_business: [
          { model: 'FLAT', amount: 5000 },
          { model: 'PER_HOUR', amount: 400 },
        ],
      },
      effective: { min_guests: 15, response_hours: 6 },
    };
    mount([venue('v1', 'Court House'), venue('v2', 'Arena', [], false, own)]);
    await screen.findByText('0 uses Duncit’s default. In effect now: 8 guests.');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Venue' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Arena' }));

    expect(await screen.findByDisplayValue('15')).toBeTruthy();
    expect(card().getByText('0 uses Duncit’s default. In effect now: 6 hours.')).toBeTruthy();
    // waitFor: the venue menu closing hides the card from the accessibility tree for a moment.
    await waitFor(() => {
      const rows = [0, 1].map((index) => within(card().getByTestId(`booking-offers-min-business-row-${index}`)));
      expect(rows.map((row) => row.getByRole('combobox').textContent)).toEqual(['Per booking', 'Per hour']);
      expect(rows.map((row) => (row.getByLabelText('Amount (₹)') as HTMLInputElement).value)).toEqual(['5000', '400']);
    });
  });
});
