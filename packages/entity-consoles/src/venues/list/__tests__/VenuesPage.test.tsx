import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { VENUES_TABLE } from '../queries';
import VenuesPage from '../VenuesPage';

// The Super Category filter's own document, as the page sends it.
const SUPER_CATEGORIES = gql`
  query AdminSuperCategories {
    categories(filter: { level: SUPER, parent_id: null }) {
      id
      name
    }
  }
`;

const superCategoriesMock: MockedResponse = {
  request: { query: SUPER_CATEGORIES },
  result: {
    data: {
      categories: [
        { __typename: 'Category', id: 'sc-1', name: 'For You' },
        { __typename: 'Category', id: 'sc-2', name: 'For Your Pet' },
      ],
    },
  },
};

type TableVariables = { query: { filters: { field: string; value: string | null }[] } };

const venueRow = (id: string, venue_name: string) => ({
  __typename: 'VenueTableRow',
  id,
  venue_name,
  venue_type: 'Cafe',
  city: 'Bengaluru',
  locality: 'Indiranagar',
  capacity: 40,
  status: 'APPROVED',
  is_active: true,
  pod_count: 18,
  owner_name: 'Asha Rao',
  owner_email: 'asha@duncit.com',
  owner_phone: '+919876543210',
  created_at: '2026-02-20T08:00:00.000Z',
  venue_category: {
    __typename: 'VenueCategory',
    super_category_name: 'For You',
    category_name: 'Games',
    sub_category_name: 'Board Games',
  },
});

/** A venues page answered only when the pinned super category is `superId`. */
const venuesMock = (superId: string | null, row: ReturnType<typeof venueRow>): MockedResponse => ({
  request: {
    query: VENUES_TABLE,
    variables: (variables: TableVariables) => {
      const pinned = variables.query.filters.find((f) => f.field === 'super_category_id');
      return (pinned?.value ?? null) === superId;
    },
  },
  result: { data: { venuesTable: { __typename: 'VenuesTablePage', total: 1, rows: [row] } } },
});

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/venues'],
    routes: (
      <>
        <Route path="/venues" element={<VenuesPage />} />
        <Route path="/venues/new" element={<div>NEW VENUE ROUTE</div>} />
      </>
    ),
  });

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('VenuesPage', () => {
  it('titles the page and lists every venue from the venues table query', async () => {
    renderPage([superCategoriesMock, venuesMock(null, venueRow('venue-1', 'The Board Room Cafe'))]);

    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Every venue Duncit works with — an application awaiting review and a live space taking bookings sit in one list.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('The Board Room Cafe')).toBeInTheDocument();
  });

  it('narrows the list to the super category picked in the header filter', async () => {
    renderPage([
      superCategoriesMock,
      venuesMock(null, venueRow('venue-1', 'The Board Room Cafe')),
      venuesMock('sc-2', venueRow('venue-2', 'Paws Play Park')),
    ]);
    await screen.findByText('The Board Room Cafe');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Super Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'For Your Pet' }));

    expect(await screen.findByText('Paws Play Park')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('The Board Room Cafe')).not.toBeInTheDocument());
    expect(within(screen.getByRole('combobox', { name: 'Super Category' })).getByText('For Your Pet')).toBeInTheDocument();
  });

  it('opens the empty venue editor from Add venue', async () => {
    renderPage([superCategoriesMock, venuesMock(null, venueRow('venue-1', 'The Board Room Cafe'))]);

    const add = screen.getByRole('link', { name: 'Add venue' });
    expect(add).toHaveAttribute('href', '/venues/new');
    fireEvent.click(add);

    expect(await screen.findByText('NEW VENUE ROUTE')).toBeInTheDocument();
  });
});
