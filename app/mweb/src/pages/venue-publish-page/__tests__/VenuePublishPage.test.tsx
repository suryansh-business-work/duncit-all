import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VenuePublishPage from '..';
import { MY_VENUES_SWITCHER } from '../../venue-manage-page/queries';
import { SELECTED_VENUE_KEY } from '../../../hooks/useSelectedVenue';

const publishCard = vi.fn();
vi.mock('@duncit/public-page', () => ({
  PublishPageCard: (props: { kind: string; refId?: string; title: string }) => {
    publishCard(props);
    return <div data-testid="publish-card" />;
  },
}));

const venuesMock = {
  request: { query: MY_VENUES_SWITCHER },
  result: {
    data: {
      myVenues: [
        { __typename: 'Venue', id: 'v-draft', venue_name: 'New Hall', city: 'Kanpur', status: 'SUBMITTED' },
        { __typename: 'Venue', id: 'v-turf', venue_name: 'Turf', city: 'Lucknow', status: 'APPROVED' },
      ],
    },
  },
};

function renderPage() {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[venuesMock]}>
      <MemoryRouter>
        <VenuePublishPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('VenuePublishPage', () => {
  it('publishes the selected approved venue', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-turf');
    renderPage();
    expect(await screen.findByTestId('publish-card')).toBeInTheDocument();
    expect(publishCard).toHaveBeenLastCalledWith({ kind: 'VENUE', refId: 'v-turf', title: 'Turf' });
  });

  it('explains that a venue not yet approved cannot be published', async () => {
    // Nothing remembered: the in-flight application is the default venue.
    renderPage();
    expect(await screen.findByTestId('venue-publish-needs-approval')).toHaveTextContent(
      'Your venue can be published once it is approved.',
    );
    expect(screen.queryByTestId('publish-card')).not.toBeInTheDocument();
  });
});
