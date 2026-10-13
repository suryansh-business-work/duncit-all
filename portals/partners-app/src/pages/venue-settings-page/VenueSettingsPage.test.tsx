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

const venue = (id: string, name: string, tiers: unknown[] = [], rescheduleOnly = false) => ({
  __typename: 'Venue',
  id,
  venue_name: name,
  status: 'APPROVED',
  settings: {
    __typename: 'VenueSettings',
    cancellation: {
      __typename: 'VenueCancellationPolicy',
      reschedule_only: rescheduleOnly,
      tiers: tiers.map((tier) => ({ __typename: 'VenueCancellationTier', ...(tier as object) })),
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
    fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: '25' } });
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
