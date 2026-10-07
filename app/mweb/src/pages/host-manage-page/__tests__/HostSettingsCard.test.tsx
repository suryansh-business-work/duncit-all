import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';

import HostSettingsCard from '../HostSettingsCard';

/** The card's own documents (private to it), as the server sees them. */
const MY_HOST_REQUEST_LIMIT = gql`
  query MyHostVenueRequestLimit {
    myHost {
      id
      max_venue_requests_per_month
      venue_requests_limit_override
    }
  }
`;
const SET_MY_VENUE_REQUEST_LIMIT = gql`
  mutation SetMyVenueRequestLimit($limit: Int!) {
    setMyVenueRequestLimit(limit: $limit) {
      id
      max_venue_requests_per_month
      venue_requests_limit_override
    }
  }
`;

const hostRow = (limit: number, override: number | null) => ({
  __typename: 'Host',
  id: 'host-doc',
  max_venue_requests_per_month: limit,
  venue_requests_limit_override: override,
});

const hostMock = (myHost: ReturnType<typeof hostRow> | null): MockedResponse => ({
  request: { query: MY_HOST_REQUEST_LIMIT },
  result: { data: { myHost } },
});

const LABEL = 'Maximum Venue Requests / Month';

function renderCard(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <HostSettingsCard />
    </MockedProvider>,
  );
}

let notices: string[] = [];
const onNotify = (event: Event) => notices.push((event as CustomEvent<{ message: string }>).detail.message);
beforeEach(() => {
  notices = [];
  globalThis.addEventListener('duncit:notify', onNotify);
});
afterEach(() => globalThis.removeEventListener('duncit:notify', onNotify));

describe('HostSettingsCard', () => {
  it("shows the host's own cap and Duncit's override", async () => {
    renderCard([hostMock(hostRow(12, 4))]);

    expect(screen.getByTestId('host-settings-title')).toHaveTextContent('Host Settings');
    expect(await screen.findByLabelText(LABEL)).toHaveValue(12);
    expect(screen.getByTestId('host-venue-request-limit-form-override')).toBeInTheDocument();
  });

  it('saves a new cap and says so', async () => {
    renderCard([
      hostMock(hostRow(12, null)),
      {
        request: { query: SET_MY_VENUE_REQUEST_LIMIT, variables: { limit: 30 } },
        result: { data: { setMyVenueRequestLimit: hostRow(30, null) } },
      },
    ]);
    fireEvent.change(await screen.findByLabelText(LABEL), { target: { value: '30' } });

    fireEvent.click(screen.getByTestId('host-venue-request-limit-form-save'));

    await waitFor(() => expect(notices).toEqual(['Saved.']));
    expect(screen.getByLabelText(LABEL)).toHaveValue(30);
  });

  it("keeps the server's refusal on the form", async () => {
    renderCard([
      hostMock(hostRow(12, null)),
      {
        request: { query: SET_MY_VENUE_REQUEST_LIMIT, variables: { limit: 30 } },
        result: { errors: [new GraphQLError('Only an active host can set this.')] },
      },
    ]);
    fireEvent.change(await screen.findByLabelText(LABEL), { target: { value: '30' } });

    fireEvent.click(screen.getByTestId('host-venue-request-limit-form-save'));

    expect(await screen.findByText('Only an active host can set this.')).toBeInTheDocument();
    expect(notices).toEqual([]);
  });

  it('shows a failed load as an error', async () => {
    renderCard([{ request: { query: MY_HOST_REQUEST_LIMIT }, error: new Error('Settings are unavailable') }]);

    expect(await screen.findByText('Settings are unavailable')).toBeInTheDocument();
  });

  it('renders nothing for a user with no host profile', async () => {
    const { container } = renderCard([hostMock(null)]);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
