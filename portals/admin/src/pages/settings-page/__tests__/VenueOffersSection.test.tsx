import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/testkit';
import VenueOffersSection from '../venue-offers';
import { APP_SETTINGS_VENUE_OFFERS, UPDATE_APP_SETTINGS_VENUE_OFFERS } from '../venue-offers/queries';

const settings = (minGuests: number, hours: number) => ({
  __typename: 'AppSettings',
  venue_offer_min_guests_default: minGuests,
  venue_offer_response_hours_default: hours,
  updated_at: '2026-10-01T00:00:00.000Z',
});

/** The read; `reads` counts how often it answered, which is how a save's re-read shows. */
const settingsMock = (answers: ReturnType<typeof settings>[]) => {
  const state = { reads: 0 };
  const mock: MockedResponse = {
    request: { query: APP_SETTINGS_VENUE_OFFERS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: () => {
      const answer = answers[Math.min(state.reads, answers.length - 1)];
      state.reads += 1;
      return { data: { appSettings: answer } };
    },
  };
  return { mock, state };
};

const saveMock = (input: Record<string, number>, fail = false): MockedResponse => ({
  request: { query: UPDATE_APP_SETTINGS_VENUE_OFFERS, variables: { input } },
  ...(fail
    ? { error: new Error('venue_offer_min_guests_default is out of range') }
    : { result: { data: { updateAppSettings: settings(input.venue_offer_min_guests_default, input.venue_offer_response_hours_default) } } }),
});

const renderSection = (mocks: MockedResponse[]) => {
  const onToast = vi.fn();
  renderWithProviders(<VenueOffersSection onToast={onToast} />, { mocks });
  return { onToast };
};

const minGuests = () => screen.getByRole('spinbutton', { name: /Minimum guests/ });
const responseHours = () => screen.getByRole('spinbutton', { name: /Response time \(hours\)/ });
const saveButton = () => screen.getByTestId('save-venue-offers');

describe('VenueOffersSection', () => {
  it('shows the stored defaults and keeps Save off until one changes', async () => {
    renderSection([settingsMock([settings(8, 24)]).mock]);

    await waitFor(() => expect(minGuests()).toHaveValue(8));
    expect(responseHours()).toHaveValue(24);
    expect(screen.getByText('A whole number of guests from 1 to 1000.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    fireEvent.change(minGuests(), { target: { value: '10' } });
    expect(saveButton()).toBeEnabled();
  });

  it('saves both defaults, toasts and re-reads them', async () => {
    const read = settingsMock([settings(8, 24), settings(10, 48)]);
    const { onToast } = renderSection([
      read.mock,
      saveMock({ venue_offer_min_guests_default: 10, venue_offer_response_hours_default: 48 }),
    ]);

    await waitFor(() => expect(minGuests()).toHaveValue(8));
    fireEvent.change(minGuests(), { target: { value: '10' } });
    fireEvent.change(responseHours(), { target: { value: '48' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Venue offer defaults saved'));
    expect(read.state.reads).toBeGreaterThan(1);
    await waitFor(() => expect(responseHours()).toHaveValue(48));
  });

  it.each([
    ['minimum guests', '0', 'Enter a whole number of guests from 1 to 1000'],
    ['minimum guests', '1001', 'Enter a whole number of guests from 1 to 1000'],
    ['minimum guests', '2.5', 'Enter a whole number of guests from 1 to 1000'],
    ['response hours', '0', 'Enter a whole number of hours from 1 to 720'],
    ['response hours', '721', 'Enter a whole number of hours from 1 to 720'],
    ['response hours', '', 'Enter a whole number of hours from 1 to 720'],
  ])('refuses %s of %j and sends nothing', async (field, value, message) => {
    const { onToast } = renderSection([settingsMock([settings(8, 24)]).mock]);

    await waitFor(() => expect(minGuests()).toHaveValue(8));
    fireEvent.change(field === 'minimum guests' ? minGuests() : responseHours(), { target: { value } });
    fireEvent.click(saveButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
  });

  it('accepts the boundaries 1 and 1000 guests, 1 and 720 hours', async () => {
    const { onToast } = renderSection([
      settingsMock([settings(8, 24)]).mock,
      saveMock({ venue_offer_min_guests_default: 1000, venue_offer_response_hours_default: 1 }),
    ]);

    await waitFor(() => expect(minGuests()).toHaveValue(8));
    fireEvent.change(minGuests(), { target: { value: '1000' } });
    fireEvent.change(responseHours(), { target: { value: '1' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Venue offer defaults saved'));
  });

  it('shows the server’s refusal and does not toast', async () => {
    const { onToast } = renderSection([
      settingsMock([settings(8, 24)]).mock,
      saveMock({ venue_offer_min_guests_default: 10, venue_offer_response_hours_default: 24 }, true),
    ]);

    await waitFor(() => expect(minGuests()).toHaveValue(8));
    fireEvent.change(minGuests(), { target: { value: '10' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('venue_offer_min_guests_default is out of range')).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
  });

  it('says the defaults could not be loaded', async () => {
    renderSection([{ request: { query: APP_SETTINGS_VENUE_OFFERS }, error: new Error('offline settings') }]);
    expect(await screen.findByText('offline settings')).toBeInTheDocument();
  });

  it('says the defaults could not be loaded when the server has none to give', async () => {
    renderSection([{ request: { query: APP_SETTINGS_VENUE_OFFERS }, result: { data: { appSettings: null } } }]);
    expect(await screen.findByText('Could not load the venue offer defaults.')).toBeInTheDocument();
  });
});
