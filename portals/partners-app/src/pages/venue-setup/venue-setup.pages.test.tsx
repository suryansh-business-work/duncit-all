import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import AmenitiesPage from './AmenitiesPage';
import FoodSettingsPage from './FoodSettingsPage';
import TypeCapacityPage from './TypeCapacityPage';
import { MY_VENUE, MY_VENUES, REGISTRATION_CONFIG } from '../register-venue-page/queries';
import { sectionConfig } from '../register-venue-page/sections/__tests__/sectionHarness';
import { shapeOf } from '../../__tests__/doc-shape';
import { renderWithProviders } from '../../__tests__/render';
import { recordNotices } from '../../__tests__/groupC-notices';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  globalThis.localStorage.clear();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});

const listed = (status: string) =>
  shapeOf(MY_VENUES, {
    myVenues: [
      {
        __typename: 'Venue',
        id: 'v1',
        status,
        venue_name: 'Cafe Mocha',
        settings: { operating_hours: { open: '09:00', close: '22:00' }, weekly_off_days: [1], holidays: [] },
      },
    ],
  });

const detail = (status: string, over: Record<string, unknown> = {}) =>
  shapeOf(MY_VENUE, {
    me: { email: 'owner@duncit.com' },
    myVenue: {
      id: 'v1',
      status,
      venue_name: 'Cafe Mocha',
      owner_name: 'Asha Rao',
      venue_type: 'Cafe',
      capacity_items: [{ label: 'Main hall', capacity: 30 }],
      amenities: ['Wi-Fi'],
      facilities: [],
      security: [],
      ...over,
    },
  });

const config = shapeOf(REGISTRATION_CONFIG, { venueRegistrationConfig: sectionConfig });

const mount = (
  ui: React.ReactElement,
  status = 'APPROVED',
  answers: Record<string, ScriptedAnswer> = {},
  sent: SentOperation[] = [],
  over: Record<string, unknown> = {},
) =>
  renderWithProviders(ui, {
    route: '/venues/setup',
    link: scriptedLink(
      {
        MyVenues: listed(status),
        MyVenue: detail(status, over),
        VenueRegistrationConfig: config,
        UpdateVenueSetup: { updateVenueSetup: { __typename: 'Venue', id: 'v1' } },
        ...answers,
      },
      sent,
    ),
  });

const setupWrites = (sent: SentOperation[]) => sent.filter((op) => op.name === 'UpdateVenueSetup');
const chip = (name: string) => screen.getByRole('button', { name });

describe('Amenities & Security setup page', () => {
  it('saves only the three chip lists for the venue, refreshes the venue and confirms', async () => {
    const sent: SentOperation[] = [];
    mount(<AmenitiesPage />, 'APPROVED', {}, sent);
    const save = await screen.findByTestId('venue-amenities-save');
    expect(save.hasAttribute('disabled')).toBe(true);
    expect(chip('Wi-Fi').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(chip('AC'));
    fireEvent.click(save);

    await waitFor(() => expect(notices.notices.map((n) => n.message)).toContain('Saved.'));
    expect(setupWrites(sent)).toEqual([
      {
        name: 'UpdateVenueSetup',
        variables: { venue_id: 'v1', input: { amenities: ['Wi-Fi', 'AC'], facilities: [], security: [] } },
      },
    ]);
    // One read on open, one after the save.
    expect(sent.filter((op) => op.name === 'MyVenue').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the server message and confirms nothing when the save is refused', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { UpdateVenueSetup: new Error('Venue is under review') });
    fireEvent.click(await screen.findByRole('button', { name: 'AC' }));
    fireEvent.click(screen.getByTestId('venue-amenities-save'));
    expect(await screen.findByText('Venue is under review')).toBeTruthy();
    expect(notices.notices).toHaveLength(0);
  });

  it('falls back to its own words when the server gives no message', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { UpdateVenueSetup: new Error('') });
    fireEvent.click(await screen.findByRole('button', { name: 'AC' }));
    fireEvent.click(screen.getByTestId('venue-amenities-save'));
    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
  });

  it('says the venue could not be loaded when its read fails', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { MyVenue: new Error('boom') });
    expect(await screen.findByText('Could not load this venue. Try again.')).toBeTruthy();
    expect(screen.queryByTestId('venue-amenities')).toBeNull();
  });

  it('says the venue could not be loaded when the server has no such venue', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { MyVenue: shapeOf(MY_VENUE, { me: { email: 'o@duncit.com' } }) });
    expect(await screen.findByText('Could not load this venue. Try again.')).toBeTruthy();
  });

  it('shows the server message when the venue list cannot be read', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { MyVenues: new Error('Venues are unavailable') });
    expect(await screen.findByText('Venues are unavailable')).toBeTruthy();
    expect(screen.queryByTestId('venue-amenities')).toBeNull();
  });

  it('says the venue could not be loaded when the registration config fails', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { VenueRegistrationConfig: new Error('config down') });
    expect(await screen.findByText('Could not load this venue. Try again.')).toBeTruthy();
  });

  it('keeps the spinner while only the registration config is still loading', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { VenueRegistrationConfig: STAY_PENDING });
    await waitFor(() => expect(screen.getByTestId('venue-amenities-page')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeTruthy());
    expect(screen.queryByTestId('venue-amenities')).toBeNull();
  });

  it('shows a spinner while the venue is loading', async () => {
    mount(<AmenitiesPage />, 'APPROVED', { MyVenue: STAY_PENDING });
    await screen.findByTestId('venue-amenities-page');
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('venue-amenities')).toBeNull();
  });
});

describe('Type, Capacity & Hours setup page', () => {
  it('locks the venue type of an approved venue, says why, and shows the hours form', async () => {
    mount(<TypeCapacityPage />, 'APPROVED');
    expect(
      await screen.findByText('Your venue type is fixed once the venue is approved. Ask Duncit support to change it.'),
    ).toBeTruthy();
    expect(screen.getByTestId('opening-hours')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /Venue type/ }).getAttribute('aria-disabled')).toBe('true');
  });

  it('leaves the venue type open before approval', async () => {
    mount(<TypeCapacityPage />, 'DRAFT');
    await screen.findByTestId('venue-type-capacity');
    expect(
      screen.queryByText('Your venue type is fixed once the venue is approved. Ask Duncit support to change it.'),
    ).toBeNull();
    expect(screen.getByRole('combobox', { name: /Venue type/ }).getAttribute('aria-disabled')).toBeNull();
  });

  it('stops a save that leaves the venue with no capacity entry and names the problem', async () => {
    const sent: SentOperation[] = [];
    mount(<TypeCapacityPage />, 'APPROVED', {}, sent);
    await screen.findByTestId('venue-type-capacity');
    fireEvent.click(screen.getByRole('button', { name: 'Remove capacity entry' }));
    fireEvent.click(screen.getByTestId('venue-type-capacity-save'));
    expect(await screen.findByText('Add at least one capacity entry for your venue')).toBeTruthy();
    expect(setupWrites(sent)).toHaveLength(0);
  });

  it('saves the type and spaces only', async () => {
    const sent: SentOperation[] = [];
    mount(<TypeCapacityPage />, 'DRAFT', {}, sent);
    const label = await screen.findByLabelText(/What is this capacity for\?/);
    fireEvent.change(label, { target: { value: 'Terrace' } });
    fireEvent.click(screen.getByTestId('venue-type-capacity-save'));
    await waitFor(() => expect(setupWrites(sent)).toHaveLength(1));
    expect(setupWrites(sent)[0].variables).toEqual({
      venue_id: 'v1',
      input: { venue_type: 'Cafe', capacity_items: [{ label: 'Terrace', capacity: 30 }] },
    });
  });
});

describe('Food Settings setup page', () => {
  it('opens the food section for an approved venue without the dish list', async () => {
    mount(<FoodSettingsPage />, 'APPROVED', {}, [], { offers_food: true, gstin: '22AAAAA0000A1Z5', food_tables: ['T1'] });
    const page = await screen.findByTestId('venue-food-settings');
    expect(await within(page).findByDisplayValue('22AAAAA0000A1Z5')).toBeTruthy();
    expect(screen.queryByTestId('register-venue-food-gstin-documents')).toBeNull();
  });

  it('points a venue still registering at Documents for its GST number', async () => {
    mount(<FoodSettingsPage />, 'DRAFT', {}, [], { offers_food: true, venue_name: null, owner_name: null });
    expect(await screen.findByTestId('register-venue-food-gstin-documents')).toBeTruthy();
  });
});
