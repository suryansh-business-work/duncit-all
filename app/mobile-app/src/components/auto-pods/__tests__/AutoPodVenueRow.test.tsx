import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mwebAutoPodLabels, venueHostsSubCategory } from '@duncit/utils';

import { AutoPodVenueRow } from '@/components/auto-pods/AutoPodVenueRow';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { graphqlRequest } from '@/services/graphql.client';
import { useSelectedVenueStore } from '@/stores/selected-venue.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/selected-venue', () => ({
  getSelectedVenueId: jest.fn().mockResolvedValue(null),
  setSelectedVenueId: jest.fn().mockResolvedValue(undefined),
}));
const mockRequest = graphqlRequest as jest.Mock;

/** Copy that reads back as its key plus any interpolated values. */
const labels = mwebAutoPodLabels((key, options) =>
  [key, ...Object.values(options?.vars ?? {})].join('|'),
);

const category = (sub_category_id: string | null, sub_category_name: string) => ({
  sub_category_id,
  super_category_name: sub_category_name ? 'Sports' : '',
  category_name: sub_category_name ? 'Racket' : '',
  sub_category_name,
});
const badminton = category('badminton', 'Badminton');
const squash = category('squash', 'Squash');
const blank = category(null, '');

const venue = (id: string, venue_name: string, over: Record<string, unknown> = {}) => ({
  id,
  venue_name,
  status: 'APPROVED',
  is_active: true,
  location_id: 'blr',
  city: 'Bengaluru',
  capacity: 20,
  capacity_items: [],
  ...over,
});

/** The venue the row last handed its screen. */
let picked: AutoPodVenueOption | null = null;

function Harness() {
  const [value, setValue] = useState<AutoPodVenueOption | null>(null);
  picked = value;
  return <AutoPodVenueRow value={value} onChange={setValue} labels={labels} />;
}

const mount = (myVenues: unknown[]) => {
  mockRequest.mockResolvedValue({ myVenues });
  renderWithProviders(<Harness />);
};

beforeEach(() => {
  mockRequest.mockReset();
  picked = null;
  useSelectedVenueStore.setState({ venueId: null, status: 'ready' });
});

describe('AutoPodVenueRow', () => {
  it('writes every category of a venue in several, primary first', async () => {
    mount([
      venue('v1', 'Arena', { venue_category: badminton, venue_categories: [badminton, squash] }),
    ]);
    expect(await screen.findByTestId('auto-pods-venue-category')).toHaveTextContent(
      'mweb.autoPods.venueCategoriesMany|Sports › Racket › Badminton · Sports › Racket › Squash',
    );
    expect(screen.queryByTestId('auto-pods-venue-no-category')).toBeNull();
  });

  it('hands on a venue that is eligible for an offer in its SECOND category', async () => {
    mount([
      venue('v1', 'Arena', { venue_category: badminton, venue_categories: [badminton, squash] }),
    ]);
    await waitFor(() => expect(picked?.id).toBe('v1'));
    expect(picked?.venue_categories.map((row) => row.sub_category_id)).toEqual([
      'badminton',
      'squash',
    ]);
    expect(venueHostsSubCategory(picked, 'squash')).toBe(true);
    expect(venueHostsSubCategory(picked, 'badminton')).toBe(true);
    expect(venueHostsSubCategory(picked, 'chess')).toBe(false);
  });

  it('reads a legacy answer with no list as its one category', async () => {
    mount([venue('v1', 'Arena', { venue_category: badminton })]);
    expect(await screen.findByTestId('auto-pods-venue-category')).toHaveTextContent(
      'mweb.autoPods.venueCategory|Sports › Racket › Badminton',
    );
    expect(venueHostsSubCategory(picked, 'badminton')).toBe(true);
    expect(venueHostsSubCategory(picked, 'squash')).toBe(false);
  });

  it('warns that a venue with no category is offered nothing', async () => {
    mount([venue('v1', 'Arena', { venue_category: blank, venue_categories: [] })]);
    expect(await screen.findByTestId('auto-pods-venue-no-category')).toHaveTextContent(
      'mweb.autoPods.noVenueCategory',
    );
    expect(screen.queryByTestId('auto-pods-venue-category')).toBeNull();
    expect(picked?.venue_categories).toEqual([]);
    expect(venueHostsSubCategory(picked, 'badminton')).toBe(false);
  });

  it("follows a chip tap to the other venue's own categories", async () => {
    mount([
      venue('v1', 'Arena', { venue_category: badminton, venue_categories: [badminton, squash] }),
      venue('v2', 'Court', { venue_category: squash, venue_categories: [squash] }),
    ]);
    await screen.findByTestId('auto-pods-venue-category');
    fireEvent.press(screen.getByTestId('auto-pods-venue-v2'));
    await waitFor(() =>
      expect(screen.getByTestId('auto-pods-venue-category')).toHaveTextContent(
        'mweb.autoPods.venueCategory|Sports › Racket › Squash',
      ),
    );
    expect(venueHostsSubCategory(picked, 'badminton')).toBe(false);
  });

  it('offers only approved, active venues, and says so when there are none', async () => {
    mount([
      venue('v1', 'Pending', { status: 'PENDING', venue_categories: [badminton] }),
      venue('v2', 'Paused', { is_active: false, venue_categories: [badminton] }),
    ]);
    expect(screen.getByTestId('auto-pod-venues-loading')).toBeOnTheScreen();
    expect(await screen.findByTestId('auto-pods-no-venues')).toHaveTextContent(
      'mweb.autoPods.noVenues',
    );
    expect(picked).toBeNull();
  });
});
