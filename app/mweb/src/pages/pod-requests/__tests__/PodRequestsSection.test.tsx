import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { MemoryRouter } from 'react-router';
import type { PodRequestSide, PodRequestStatus } from '@duncit/utils';

import PodRequestsSection from '../PodRequestsSection';
import { MY_POD_PARTNER_REQUESTS, RESPOND_POD_PARTNER_REQUEST, type PodRequestRowData } from '../queries';

vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDate: (d: string) => d }),
}));

const row = (
  id: string,
  direction: PodRequestRowData['direction'],
  status: PodRequestStatus,
  viewer_side: PodRequestSide = 'HOST',
) => ({
  __typename: 'PodPartnerRequest',
  id,
  direction,
  status,
  viewer_side,
  note: '',
  venue: {
    __typename: 'PartnerVenueSummary',
    id: `venue-${id}`,
    venue_name: `Venue ${id}`,
    category: 'Sports',
    locality: 'Gomti Nagar',
    city: 'Lucknow',
    cover_image_url: '',
  },
  host: { __typename: 'PartnerHostSummary', user_id: `host-${id}`, name: `Host ${id}`, photo_url: '', categories: [] },
  created_at: '2026-10-01T10:00:00.000Z',
});

/** A host's view: one to answer, one accepted, one declined (gone from both tabs), one they sent. */
const HOST_REQUESTS = [
  row('in', 'VENUE_TO_HOST', 'REQUESTED'),
  row('acc', 'VENUE_TO_HOST', 'SLOT_REQUESTED'),
  row('rej', 'VENUE_TO_HOST', 'REJECTED'),
  row('sent', 'HOST_TO_VENUE', 'REQUESTED'),
];

const listMock = (
  side: PodRequestSide,
  venueId: string | null,
  requests: ReturnType<typeof row>[],
): MockedResponse => ({
  request: { query: MY_POD_PARTNER_REQUESTS, variables: { side, venue_id: venueId } },
  result: { data: { myPodPartnerRequests: requests } },
});

const respondMock = (id: string, accept: boolean, over: Partial<MockedResponse> = {}): MockedResponse => ({
  request: { query: RESPOND_POD_PARTNER_REQUEST, variables: { id, accept } },
  result: {
    data: { respondPodPartnerRequest: { __typename: 'PodPartnerRequest', id, status: accept ? 'ACCEPTED' : 'REJECTED' } },
  },
  ...over,
});

function renderSection(side: PodRequestSide, mocks: MockedResponse[], venueId?: string) {
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter>
        <PodRequestsSection side={side} venueId={venueId} />
      </MemoryRouter>
    </MockedProvider>,
  );
}

const selected = (testId: string) => screen.getByTestId(testId).getAttribute('aria-selected');

describe('PodRequestsSection — host side', () => {
  it('splits the requests: received ones to answer, the ones this host sent, and declined ones nowhere', async () => {
    renderSection('HOST', [listMock('HOST', null, HOST_REQUESTS)]);

    const incoming = await screen.findByTestId('pod-requests-incoming');
    expect(within(incoming).getByText('Venue in')).toBeInTheDocument();
    expect(within(incoming).queryByText('Venue acc')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-request-respond-in')).toBeInTheDocument();
    expect(within(screen.getByTestId('pod-requests-sent')).getByText('Venue sent')).toBeInTheDocument();
    expect(screen.queryByText('Venue rej')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-requests-title')).toHaveTextContent('Pod Requests from Venues');
    expect(screen.getByTestId('pod-requests-sent-title')).toHaveTextContent('Your requests to venues');
    expect(screen.getByTestId('pod-requests-search')).toHaveAttribute('href', '/host/nearby-venues');
    expect(screen.getByTestId('pod-requests-search')).toHaveTextContent('Search Nearby Venues');
  });

  it('shows the accepted requests, without answer buttons, on the Venue Accepted tab', async () => {
    renderSection('HOST', [listMock('HOST', null, HOST_REQUESTS)]);
    await screen.findByTestId('pod-requests-incoming');

    fireEvent.click(screen.getByTestId('pod-requests-tab-accepted'));

    const accepted = await screen.findByTestId('pod-requests-accepted');
    expect(screen.getByTestId('pod-requests-tab-accepted')).toHaveTextContent('Venue Accepted Requests');
    expect(within(accepted).getByText('Venue acc')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-requests-incoming')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-request-respond-acc')).not.toBeInTheDocument();
  });

  it('accepting inline answers the request and moves to the Accepted tab where the row now sits', async () => {
    renderSection('HOST', [
      listMock('HOST', null, HOST_REQUESTS),
      respondMock('in', true),
      listMock('HOST', null, [row('in', 'VENUE_TO_HOST', 'ACCEPTED'), ...HOST_REQUESTS.slice(1)]),
    ]);
    await screen.findByTestId('pod-requests-incoming');

    fireEvent.click(screen.getByTestId('pod-request-respond-in-accept'));

    await waitFor(() => expect(selected('pod-requests-tab-accepted')).toBe('true'));
    const accepted = await screen.findByTestId('pod-requests-accepted');
    expect(within(accepted).getByText('Venue in')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-requests-action-error')).not.toBeInTheDocument();
  });

  it('declining inline stays on the Requests tab', async () => {
    renderSection('HOST', [
      listMock('HOST', null, HOST_REQUESTS),
      respondMock('in', false),
      listMock('HOST', null, [row('in', 'VENUE_TO_HOST', 'REJECTED'), ...HOST_REQUESTS.slice(1)]),
    ]);
    await screen.findByTestId('pod-requests-incoming');

    fireEvent.click(screen.getByTestId('pod-request-respond-in-decline'));

    expect(await screen.findByTestId('pod-requests-incoming-empty')).toHaveTextContent('No new Pod Requests yet.');
    expect(selected('pod-requests-tab-requests')).toBe('true');
  });

  it("shows the server's refusal of a stale answer, stays put, and lets it be dismissed", async () => {
    renderSection('HOST', [
      listMock('HOST', null, HOST_REQUESTS),
      respondMock('in', true, { result: { errors: [new GraphQLError('This request was already answered.')] } }),
    ]);
    await screen.findByTestId('pod-requests-incoming');

    fireEvent.click(screen.getByTestId('pod-request-respond-in-accept'));

    const alert = await screen.findByTestId('pod-requests-action-error');
    expect(alert).toHaveTextContent('This request was already answered.');
    expect(selected('pod-requests-tab-requests')).toBe('true');

    fireEvent.click(within(alert).getByRole('button'));
    await waitFor(() => expect(screen.queryByTestId('pod-requests-action-error')).not.toBeInTheDocument());
  });

  it('shows a failed list load as an error', async () => {
    renderSection('HOST', [
      {
        request: { query: MY_POD_PARTNER_REQUESTS, variables: { side: 'HOST', venue_id: null } },
        error: new Error('Requests are unavailable'),
      },
    ]);

    expect(await screen.findByText('Requests are unavailable')).toBeInTheDocument();
  });
});

describe('PodRequestsSection — venue side', () => {
  it("reads the selected venue's requests and uses the venue wording, with every list's empty line", async () => {
    renderSection('VENUE', [listMock('VENUE', 'venue-9', [])], 'venue-9');

    expect(await screen.findByTestId('pod-requests-incoming-empty')).toBeInTheDocument();
    expect(screen.getByTestId('pod-requests-sent-empty')).toHaveTextContent('Requests you send appear here.');
    expect(screen.getByTestId('pod-requests-section-venue')).toBeInTheDocument();
    expect(screen.getByTestId('pod-requests-title')).toHaveTextContent('Pod Requests from Hosts');
    expect(screen.getByTestId('pod-requests-sent-title')).toHaveTextContent('Your requests to hosts');
    expect(screen.getByTestId('pod-requests-search')).toHaveAttribute('href', '/venues/nearby-hosts');
    expect(screen.getByTestId('pod-requests-tab-accepted')).toHaveTextContent('Host Accepted Requests');

    fireEvent.click(screen.getByTestId('pod-requests-tab-accepted'));
    expect(await screen.findByTestId('pod-requests-accepted-empty')).toHaveTextContent(
      'Requests you accept appear here.',
    );
  });
});
