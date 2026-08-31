/**
 * Where the page's two controls go — and what a host portal can redirect.
 *
 * Back and Edit default to the admin console's routes; a portal that mounts the
 * page elsewhere hands in its own. A pod with no club renders the two club
 * cards in their "no club" state rather than fetching a club called null.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import PodDetailsPage, { type PodDetailsViewProps } from '../src/PodDetailsPage';
import { POD_ATTENDEES_ADMIN, POD_DETAIL } from '../src/queries';
import { POD_ID, settle, testTheme } from './harness';

const pod = (over: Record<string, unknown> = {}) => ({
  __typename: 'Pod',
  id: POD_ID,
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_description: null,
  pod_date_time: '2026-08-30T12:30:00.000Z',
  pod_end_date_time: '2026-08-30T14:00:00.000Z',
  pod_mode: 'OFFLINE',
  meeting_platform: null,
  meeting_url: null,
  pod_type: 'PUBLIC',
  pod_amount: 250,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 8,
  seats_taken: 3,
  seats_available: 5,
  pod_attendees: [],
  pod_hosts_id: [],
  host_names: [],
  pod_hits: 0,
  zone_name: 'South',
  club_id: 'club-1',
  club_slug: 'sunset-club',
  location_id: null,
  venue_id: null,
  products_enabled: false,
  like_count: 0,
  comment_count: 0,
  is_active: true,
  is_deleted: false,
  deleted_at: null,
  venue_approval_status: 'NONE',
  completed_at: null,
  created_at: '2026-08-01T09:00:00.000Z',
  pod_images_and_videos: [],
  ...over,
});

const podMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: POD_DETAIL, variables: { id: POD_ID } },
  result: { data: { pod: pod(over) } },
});

const mount = (props: PodDetailsViewProps = {}, mocks: MockedResponse[] = [podMock()]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter initialEntries={[`/pods/${POD_ID}`]}>
          <Routes>
            <Route path="/pods/:id" element={<PodDetailsPage {...props} />} />
            <Route path="/pods" element={<div>pods-list</div>} />
            <Route path="/pods/:id/edit" element={<div>pod-editor</div>} />
            <Route path="/club/pods" element={<div>club-pods-list</div>} />
            <Route path="/club/pods/:id/change" element={<div>club-pod-editor</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );

describe('PodDetailsPage navigation', () => {
  it('Back defaults to the admin pods list', async () => {
    mount();
    await settle();

    fireEvent.click(await screen.findByText('Pods'));
    expect(await screen.findByText('pods-list')).toBeInTheDocument();
  });

  it('Edit defaults to the admin pod editor', async () => {
    mount();
    await settle();

    fireEvent.click(await screen.findByText('Edit pod'));
    expect(await screen.findByText('pod-editor')).toBeInTheDocument();
  });

  it('takes a portal’s own Back and Edit routes', async () => {
    mount({ backTo: '/club/pods', backLabel: 'Club pods', editTo: (id) => `/club/pods/${id}/change` });
    await settle();

    fireEvent.click(await screen.findByText('Edit pod'));
    expect(await screen.findByText('club-pod-editor')).toBeInTheDocument();
  });

  it('routes a portal’s Back label to its list', async () => {
    mount({ backTo: '/club/pods', backLabel: 'Club pods' });
    await settle();

    fireEvent.click(await screen.findByText('Club pods'));
    expect(await screen.findByText('club-pods-list')).toBeInTheDocument();
  });

  it('hands the resolved attendee rows to the roster below and the hosts card beside', async () => {
    const attendee = {
      __typename: 'AdminPodAttendee',
      member_id: 'pm-1',
      seats: 1,
      companions: [],
      user_id: 'u-1',
      full_name: 'Meera N',
      email: 'meera@duncit.com',
      phone: '9000000001',
      profile_photo: null,
      is_host: false,
      status: 'JOINED',
      joined_at: '2026-08-01T10:00:00.000Z',
      backed_out_at: null,
      source: 'APP',
      refund_status: null,
      payment_id: 'pay-1',
      backout_no: null,
      replaced_by_user_id: null,
      replaced_by_name: null,
      participation: null,
    };
    mount({}, [
      podMock(),
      {
        request: { query: POD_ATTENDEES_ADMIN, variables: { id: POD_ID } },
        result: { data: { adminPodAttendees: [attendee] } },
      },
    ]);
    await settle();

    expect(await screen.findByText('Meera N')).toBeInTheDocument();
    expect(screen.getByText('meera@duncit.com')).toBeInTheDocument();
  });

  it('renders a pod with no club without fetching one', async () => {
    mount({}, [podMock({ club_id: null })]);
    await settle();

    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getAllByText('No club linked to this pod.')).toHaveLength(2);
  });
});
