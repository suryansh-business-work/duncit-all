import { fireEvent, render, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VenueListPage from '..';
import { MY_VENUES_SWITCHER } from '../../venue-manage-page/queries';
import { SELECTED_VENUE_KEY } from '../../../hooks/useSelectedVenue';

const openPartnerPortal = vi.fn();
vi.mock('../../studio-options/openPartnerPortal', () => ({
  openPartnerPortal: (path: string) => openPartnerPortal(path),
}));

const venues = [
  { __typename: 'Venue', id: 'v-turf', venue_name: 'Turf', city: 'Lucknow', status: 'APPROVED' },
  { __typename: 'Venue', id: 'v-draft', venue_name: '', city: null, status: 'DRAFT' },
];

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

function renderPage(mock: MockedResponse) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[mock]}>
      <MemoryRouter initialEntries={['/venues/list']}>
        <Routes>
          <Route path="/venues/list" element={<VenueListPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

const listMock: MockedResponse = { request: { query: MY_VENUES_SWITCHER }, result: { data: { myVenues: venues } } };

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('VenueListPage', () => {
  it('lists each venue with its city and status', async () => {
    renderPage(listMock);
    const turf = await screen.findByTestId('venue-list-row-v-turf');
    expect(within(turf).getByText('Turf')).toBeInTheDocument();
    expect(within(turf).getByText('Lucknow')).toBeInTheDocument();
    expect(within(turf).getByText('APPROVED')).toBeInTheDocument();
    // An unnamed draft still gets a readable name.
    expect(within(screen.getByTestId('venue-list-row-v-draft')).getByText('DRAFT')).toBeInTheDocument();
  });

  it('makes a tapped venue THE venue and opens its dashboard', async () => {
    renderPage(listMock);
    fireEvent.click(await screen.findByTestId('venue-list-row-v-turf'));
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-turf');
    expect(screen.getByTestId('where')).toHaveTextContent('/venues/manage');
  });

  it('adds and edits a venue through the registration wizard in the Partner app', async () => {
    renderPage(listMock);
    fireEvent.click(await screen.findByTestId('venue-list-edit-v-turf'));
    expect(openPartnerPortal).toHaveBeenCalledWith('/register-venue/v-turf');
    fireEvent.click(screen.getByTestId('venue-list-add'));
    expect(openPartnerPortal).toHaveBeenCalledWith('/register-venue/new');
  });

  it('says so when there is no venue yet, and still offers Add', async () => {
    renderPage({ request: { query: MY_VENUES_SWITCHER }, result: { data: { myVenues: [] } } });
    expect(await screen.findByTestId('venue-list-empty')).toHaveTextContent('You have no venues yet.');
    expect(screen.getByTestId('venue-list-add')).toBeInTheDocument();
  });

  it('shows the error when the list cannot be read', async () => {
    renderPage({ request: { query: MY_VENUES_SWITCHER }, error: new Error('Network down') });
    expect(await screen.findByTestId('venue-list-error')).toHaveTextContent('Network down');
  });
});
