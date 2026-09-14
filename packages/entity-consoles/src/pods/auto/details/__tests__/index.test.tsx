import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../../__tests__/testkit';
import { hostClaim, makeDetailsRow } from '../../__tests__/fixtures';
import {
  ADMIN_AUTO_POD_DETAILS,
  AUTO_POD_AUDIENCE_COUNTS,
  AUTO_POD_HOST_DETAILS,
  type AutoPodDetailsRow,
} from '../../queries';
import AutoPodDetailsPage from '..';

function LocationProbe() {
  return <span data-testid="pathname">{useLocation().pathname}</span>;
}

/** The row as the server sends it — every object tagged with its __typename. */
const asResponse = (row: AutoPodDetailsRow) => ({
  __typename: 'AutoPod',
  ...row,
  pod_images_and_videos: row.pod_images_and_videos.map((media) => ({ __typename: 'PodMedia', ...media })),
  host_claim: row.host_claim && { __typename: 'AutoPodHostClaim', ...row.host_claim },
});

const detailsMock = (autoPod: AutoPodDetailsRow | null, id = 'ap-doc-1'): MockedResponse => ({
  request: { query: ADMIN_AUTO_POD_DETAILS, variables: { auto_pod_doc_id: id } },
  result: { data: { autoPod: autoPod && asResponse(autoPod) } },
});

const audienceMock: MockedResponse = {
  request: { query: AUTO_POD_AUDIENCE_COUNTS, variables: { sub_category_id: 'sub-badminton' } },
  result: {
    data: {
      autoPodAudience: { __typename: 'AutoPodAudience', venue_count: 6, host_count: 4, club_admin_count: 2 },
    },
  },
};

const renderPage = (entry: string, mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/auto-pods/:id" element={<AutoPodDetailsPage />} />
        <Route path="/auto-pods/details" element={<AutoPodDetailsPage />} />
        <Route path="/auto-pods" element={<div>AUTO PODS LIST ROUTE</div>} />
        <Route
          path="/pods/:id"
          element={
            <>
              <div>POD DETAIL ROUTE</div>
              <LocationProbe />
            </>
          }
        />
      </>
    ),
  });

describe('AutoPodDetailsPage / guard', () => {
  it('shows the loader while the offer is read', () => {
    renderPage('/auto-pods/ap-doc-1', [detailsMock(makeDetailsRow())]);
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
  });

  it('says the offer could not be loaded when the read fails', async () => {
    renderPage('/auto-pods/ap-doc-1', [
      {
        request: { query: ADMIN_AUTO_POD_DETAILS, variables: { auto_pod_doc_id: 'ap-doc-1' } },
        result: { errors: [new GraphQLError('Forbidden')] },
      },
    ]);
    expect(await screen.findByText('Could not load this Auto Pod.')).toBeInTheDocument();
  });

  it('says the offer no longer exists when the server returns nothing', async () => {
    renderPage('/auto-pods/ap-doc-1', [detailsMock(null)]);
    expect(await screen.findByText('This Auto Pod no longer exists.')).toBeInTheDocument();
  });

  it('reads nothing and says not found when the route carries no id', () => {
    renderPage('/auto-pods/details', []);
    expect(screen.getByText('This Auto Pod no longer exists.')).toBeInTheDocument();
  });

  it('goes back to the list from the back button', () => {
    renderPage('/auto-pods/details', []);
    fireEvent.click(screen.getByRole('button', { name: 'Back to Auto Pods' }));
    expect(screen.getByText('AUTO PODS LIST ROUTE')).toBeInTheDocument();
  });
});

describe('AutoPodDetailsPage / an offer', () => {
  it('heads with the title, number, stage and status, then the places and the template', async () => {
    renderPage('/auto-pods/ap-doc-1', [detailsMock(makeDetailsRow()), audienceMock]);
    expect(await screen.findByRole('heading', { name: 'Sunday Badminton Doubles' })).toBeInTheDocument();
    expect(screen.getByText('DUN-AP-4821')).toBeInTheDocument();
    expect(screen.getByText('Enrolling')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open pod' })).not.toBeInTheDocument();
    expect(await screen.findByText('6 eligible')).toBeInTheDocument();
    expect(screen.getByText('4 eligible')).toBeInTheDocument();
    expect(screen.getByText('2 eligible')).toBeInTheDocument();
    expect(screen.getByText('Pod details')).toBeInTheDocument();
  });

  it('opens the pod a live offer became', async () => {
    renderPage('/auto-pods/ap-doc-1', [
      detailsMock(makeDetailsRow({ is_active: false, stage: 'LIVE', pod_id: 'DUN-POD-4821' })),
      audienceMock,
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open pod' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods/DUN-POD-4821');
  });

  it('shows the paused status chip', async () => {
    renderPage('/auto-pods/ap-doc-1', [detailsMock(makeDetailsRow({ is_active: false })), audienceMock]);
    expect(await screen.findByText('Inactive')).toBeInTheDocument();
  });

  it('opens who took a place from its card, and closes it again', async () => {
    renderPage('/auto-pods/ap-doc-1', [
      detailsMock(makeDetailsRow({ host_claim: hostClaim })),
      audienceMock,
      {
        request: { query: AUTO_POD_HOST_DETAILS, variables: { user_id: 'usr-902' } },
        result: {
          data: {
            hostByUser: {
              __typename: 'Host',
              id: 'host-12',
              full_name: 'Asha K. Menon',
              email: 'asha@duncit.com',
              phone: '+91 99000 11223',
              full_address: 'HSR Layout, Bengaluru',
            },
          },
        },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'View details' }));
    const dialog = await screen.findByTestId('auto-pod-host-details');
    expect(within(dialog).getByText('Host details')).toBeInTheDocument();
    expect(await within(dialog).findByText('Asha K. Menon')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('auto-pod-host-details')).not.toBeInTheDocument());
  });
});
