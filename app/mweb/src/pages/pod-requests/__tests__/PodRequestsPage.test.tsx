import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PodRequestsPage from '../PodRequestsPage';
import { MY_VENUES_SWITCHER } from '../../venue-manage-page/queries';
import { SELECTED_VENUE_KEY } from '../../../hooks/useSelectedVenue';

const section = vi.fn();
vi.mock('../PodRequestsSection', () => ({
  default: (props: { side: string; venueId?: string }) => {
    section(props);
    return <div data-testid="pod-requests-section" />;
  },
}));

const venuesMock = {
  request: { query: MY_VENUES_SWITCHER },
  result: {
    data: {
      myVenues: [
        { __typename: 'Venue', id: 'v-turf', venue_name: 'Turf', city: 'Lucknow', status: 'APPROVED' },
        { __typename: 'Venue', id: 'v-hall', venue_name: 'Hall', city: 'Kanpur', status: 'APPROVED' },
      ],
    },
  },
};

function renderPage(side: 'HOST' | 'VENUE') {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[venuesMock]}>
      <MemoryRouter>
        <PodRequestsPage side={side} />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('PodRequestsPage', () => {
  it('reads the selected venue’s requests on the venue side, with the switcher on top', async () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-hall');
    renderPage('VENUE');
    expect(await screen.findByTestId('pod-requests-section')).toBeInTheDocument();
    expect(screen.getByTestId('venue-switcher')).toBeInTheDocument();
    // Never every venue's inbox first: the section waits for the venue list.
    expect(section.mock.calls.map(([props]) => props)).toEqual([{ side: 'VENUE', venueId: 'v-hall' }]);
  });

  it('keeps the host side venue-free', () => {
    renderPage('HOST');
    expect(section).toHaveBeenCalledWith({ side: 'HOST', venueId: undefined });
    expect(screen.queryByTestId('venue-switcher')).not.toBeInTheDocument();
  });
});
