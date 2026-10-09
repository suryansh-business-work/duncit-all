import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import { STUDIO_OPTION_LIST } from '@duncit/utils';
import { partnerUser, renderWithProviders } from '../../__tests__/render';
import { myVenue as venue, myVenuesMock as venuesMock } from '../../__tests__/venue-fixtures';
import { SELECTED_VENUE_KEY } from '../../components/venue/useSelectedVenue';
import StudioOptionsPage from './StudioOptionsPage';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const flagsMock = (autoPods: boolean): MockedResponse => ({
  request: { query: PUBLIC_FEATURE_FLAGS, variables: {} },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { publicFeatureFlags: [{ __typename: 'PublicFeatureFlag', key: 'auto_pods', enabled: autoPods }] } },
});

const optionLinks = () => within(screen.getByRole('list')).getAllByRole('link');

describe('StudioOptionsPage', () => {
  it('lists every Host option as a link to its page, with its hint', async () => {
    renderWithProviders(<StudioOptionsPage mode="HOST" />, {
      mocks: [flagsMock(false)],
      user: partnerUser({ roles: ['USER', 'HOST'] }),
    });

    expect(await screen.findByRole('heading', { name: 'Host Options' })).toBeTruthy();
    const expected = STUDIO_OPTION_LIST.HOST.filter((option) => !option.autoPods);
    await screen.findByText('Start a new pod in a few steps');
    expect(optionLinks().map((link) => link.getAttribute('href'))).toEqual(expected.map((o) => o.portal));
    expect(screen.getByTestId('studio-option-item-publish').textContent).toContain('Publish Your Host Page');
    expect(screen.queryByText('Auto Pods')).toBeNull();
  });

  it('adds Auto Pods while the auto_pods flag is on', async () => {
    renderWithProviders(<StudioOptionsPage mode="CLUB" />, {
      mocks: [flagsMock(true)],
      user: partnerUser({ roles: ['USER', 'CLUB_ADMIN'] }),
    });

    expect(await screen.findByText('Auto Pods')).toBeTruthy();
    expect(screen.getByTestId('studio-option-item-auto-pods').getAttribute('href')).toBe('/club-admin/auto-pods');
  });

  it('lists nothing for a studio the user does not hold', async () => {
    renderWithProviders(<StudioOptionsPage mode="ECOMM" />, {
      mocks: [flagsMock(true)],
      user: partnerUser({ roles: ['USER', 'HOST'] }),
    });

    expect(await screen.findByRole('heading', { name: 'Brand Options' })).toBeTruthy();
    expect(within(screen.getByRole('list')).queryAllByRole('link')).toHaveLength(0);
  });

  it('opens Venue Options on the remembered venue, and remembers a new pick', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-2');
    renderWithProviders(<StudioOptionsPage mode="VENUE" />, {
      mocks: [flagsMock(false), venuesMock([venue('v-1', 'Rooftop'), venue('v-2', 'Garden')])],
      user: partnerUser({ roles: ['USER', 'VENUE_OWNER'] }),
    });

    const select = await screen.findByRole('combobox');
    expect(select.textContent).toContain('Garden');
    expect(screen.getByText('Every venue option opens for this venue')).toBeTruthy();

    fireEvent.mouseDown(select);
    fireEvent.click(await screen.findByRole('option', { name: /Rooftop/ }));
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-1');
    expect(screen.getByRole('combobox').textContent).toContain('Rooftop');
    expect(screen.getByTestId('studio-option-item-availability').getAttribute('href')).toBe('/venues/availability');
  });

  it('invites a venue owner with no venue to add one', async () => {
    renderWithProviders(<StudioOptionsPage mode="VENUE" />, {
      mocks: [flagsMock(false), venuesMock([])],
      user: partnerUser({ roles: ['USER', 'VENUE_OWNER'] }),
    });

    expect(await screen.findByText('You have no venues yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add a venue' }).getAttribute('href')).toBe('/register-venue/new');
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
