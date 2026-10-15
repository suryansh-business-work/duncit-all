import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import HostPodsSection from '../HostPodsSection';
import { USER_HOSTED_PODS } from '../../../components/profile-tabs/queries';

// The request card has its own suite; here only whether and for whom it is offered.
vi.mock('../../../components/event-request', () => ({
  RequestEventCard: (props: { targetType: string; targetId: string; targetName: string }) => (
    <div data-testid="request-event-stub">
      {props.targetType}|{props.targetId}|{props.targetName}
    </div>
  ),
}));

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();

const pod = (id: string, title: string, startsIn: number) => ({
  id,
  pod_id: `POD-${id}`,
  pod_title: title,
  pod_date_time: iso(startsIn),
  pod_end_date_time: iso(startsIn + 2 * HOUR),
  pod_type: 'PAID',
  pod_amount: 500,
  pod_attendees: 2,
  seats_taken: 2,
  no_of_spots: 10,
  pod_hosts_id: ['h1'],
  host_names: ['Asha'],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 'club-one',
  location_id: null,
  zone_name: null,
  place_label: 'Cafe',
  place_detail: 'Indiranagar',
});

const hostedMock = (pods: unknown[]): MockedResponse => ({
  request: { query: USER_HOSTED_PODS, variables: { user_id: 'h1' } },
  result: { data: { pods } },
});

const renderSection = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter>
        <HostPodsSection hostUserId="h1" name="Asha" />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('HostPodsSection', () => {
  it('names the host in its title and waits for the pods before offering anything', () => {
    renderSection([hostedMock([])]);
    expect(screen.getByTestId('host-page-pods-header')).toHaveTextContent('Pods by Asha');
    expect(screen.queryByTestId('request-event-stub')).not.toBeInTheDocument();
  });

  it('with no pods, shows the empty state and then the request card for this host', async () => {
    renderSection([hostedMock([])]);
    expect(await screen.findByTestId('host-page-no-pods')).toHaveTextContent('No pods yet. Check back soon.');
    const card = screen.getByTestId('request-event-stub');
    expect(card).toHaveTextContent('HOST|h1|Asha');
    // Under the empty state, not above it.
    expect(screen.getByTestId('host-page-no-pods').compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers the request card under the Previous rail when every pod is over', async () => {
    renderSection([hostedMock([pod('p1', 'Old Jam', -3 * DAY)])]);
    expect(await screen.findByText('Old Jam')).toBeInTheDocument();
    expect(screen.getByTestId('request-event-stub')).toBeInTheDocument();
  });

  it('offers nothing while a pod is coming up', async () => {
    renderSection([hostedMock([pod('p2', 'Next Jam', 3 * DAY)])]);
    expect(await screen.findByText('Next Jam')).toBeInTheDocument();
    expect(screen.queryByTestId('request-event-stub')).not.toBeInTheDocument();
  });
});
