import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';

import HostRequestLimitCard from '../HostRequestLimitCard';
import { UPDATE_VENUE_HOST_REQUEST_LIMIT, type SettingsVenue } from '../queries';

const LABEL = 'Maximum Host Requests / Month';

const venue = (over: Partial<SettingsVenue> = {}): SettingsVenue => ({
  id: 'venue-1',
  venue_name: 'Gomti Arena',
  status: 'APPROVED',
  settings: { rules: { max_host_requests_per_month: 8 } },
  host_requests_limit_override: null,
  ...over,
});

const saveMock = (limit: number, over: Partial<MockedResponse> = {}): MockedResponse => ({
  request: {
    query: UPDATE_VENUE_HOST_REQUEST_LIMIT,
    variables: { venue_doc_id: 'venue-1', input: { rules: { max_host_requests_per_month: limit } } },
  },
  result: { data: { updateVenueSettings: { __typename: 'Venue', id: 'venue-1' } } },
  ...over,
});

function renderCard(v: SettingsVenue, mocks: MockedResponse[] = []) {
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <HostRequestLimitCard venue={v} />
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

describe('HostRequestLimitCard', () => {
  it("starts from the venue's saved cap, without an override note when Duncit set none", () => {
    renderCard(venue());

    expect(screen.getByLabelText(LABEL)).toHaveValue(8);
    expect(screen.queryByTestId('venue-host-request-limit-form-override')).not.toBeInTheDocument();
  });

  it('reads a venue with no rules yet as 0, and shows an override when there is one', () => {
    renderCard(venue({ settings: null, host_requests_limit_override: 2 }));

    expect(screen.getByLabelText(LABEL)).toHaveValue(0);
    expect(screen.getByTestId('venue-host-request-limit-form-override')).toBeInTheDocument();
  });

  it("saves only this venue's rules.max_host_requests_per_month and says so", async () => {
    renderCard(venue(), [saveMock(15)]);
    fireEvent.change(screen.getByLabelText(LABEL), { target: { value: '15' } });

    fireEvent.click(screen.getByTestId('venue-host-request-limit-form-save'));

    await waitFor(() => expect(notices).toEqual(['Saved.']));
  });

  it("keeps the server's refusal on the form", async () => {
    renderCard(venue(), [saveMock(15, { result: { errors: [new GraphQLError('This venue is not yours.')] } })]);
    fireEvent.change(screen.getByLabelText(LABEL), { target: { value: '15' } });

    fireEvent.click(screen.getByTestId('venue-host-request-limit-form-save'));

    expect(await screen.findByText('This venue is not yours.')).toBeInTheDocument();
    expect(notices).toEqual([]);
  });
});
