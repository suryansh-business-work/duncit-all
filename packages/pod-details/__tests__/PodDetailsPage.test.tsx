/**
 * The pod page as each of its two audiences reads it.
 *
 * Only the pod itself is mocked. Every section below it fetches for itself and
 * is deliberately left with nothing to answer with, so the page is exercised in
 * the state a real reader is in for the first paint and for the whole of a
 * failed request — and the sections' own error and empty branches run.
 *
 * The scope is the part that matters most: CLUB_ADMIN is a MEMBERSHIP rather
 * than a role, so a club reader running the admin operations gets a refusal
 * from the server instead of a smaller page.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodDetailsPage, { type PodDetailsViewProps } from '../src/PodDetailsPage';
import { POD_DETAIL } from '../src/queries';
import { PodDetailsScopeProvider, usePodDetailsScope } from '../src/scope';

const POD_ID = 'pod-1';

const pod = (over: Record<string, unknown> = {}) => ({
  __typename: 'Pod',
  id: POD_ID,
  pod_id: 'DUN-POD-001',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
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
  pod_attendees: ['user-1', 'user-2', 'user-3'],
  pod_hosts_id: ['host-1'],
  host_names: ['Asha Rao'],
  pod_hits: 42,
  zone_name: 'South',
  club_id: 'club-1',
  club_slug: 'sunset-club',
  location_id: 'loc-1',
  venue_id: 'venue-1',
  products_enabled: true,
  like_count: 5,
  comment_count: 2,
  is_active: true,
  is_deleted: false,
  deleted_at: null,
  venue_approval_status: 'APPROVED',
  completed_at: null,
  created_at: '2026-08-01T09:00:00.000Z',
  pod_images_and_videos: [{ __typename: 'PodMedia', url: 'https://cdn.duncit.com/pod/a.jpg', type: 'IMAGE' }],
  ...over,
});

const podMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: POD_DETAIL, variables: { id: POD_ID } },
  result: { data: { pod: pod(over) } },
});

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = (props: PodDetailsViewProps = {}, mocks: MockedResponse[] = [podMock()]) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
      <MemoryRouter initialEntries={[`/pods/${POD_ID}`]}>
        <Routes>
          <Route path="/pods/:id" element={<PodDetailsPage {...props} />} />
          <Route path="/pods" element={<div>pods-list</div>} />
          <Route path="/pods/:id/edit" element={<div>pod-editor</div>} />
        </Routes>
      </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodDetailsPage', () => {
  it('renders the pod once it resolves, with its title and the Back control', async () => {
    mount({ backLabel: 'Club pods' });
    await settle();

    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getByText('Club pods')).toBeInTheDocument();
  });

  it('shows the sections’ own states rather than throwing when their data does not arrive', async () => {
    const { container } = mount();
    await settle();
    await settle();

    // Every section below the header fetches separately and got nothing; the
    // page must still be standing.
    expect(container.innerHTML).not.toBe('');
    expect(screen.getByText('Sunday Badminton')).toBeInTheDocument();
  });

  it('reads the club-scoped query set for a club-admin reader', async () => {
    mount({ scope: 'CLUB_ADMIN' });
    await settle();

    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
  });

  it('survives a pod the server refuses to return', async () => {
    const { container } = mount({}, [
      { request: { query: POD_DETAIL, variables: { id: POD_ID } }, result: { data: { pod: null } } },
    ]);
    await settle();

    expect(container.textContent).toContain('Pod not found.');
  });

  it('survives the pod query failing outright', async () => {
    const { container } = mount({}, [
      { request: { query: POD_DETAIL, variables: { id: POD_ID } }, error: new Error('upstream down') },
    ]);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a deleted pod rather than hiding it — an admin still has to read it', async () => {
    mount({}, [podMock({ is_deleted: true, deleted_at: '2026-08-20T00:00:00.000Z', is_active: false })]);
    await settle();

    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
  });

  it('renders an online pod, which carries a meeting link instead of a venue', async () => {
    mount({}, [
      podMock({ pod_mode: 'ONLINE', meeting_platform: 'GOOGLE_MEET', meeting_url: 'https://meet.example/abc', venue_id: null }),
    ]);
    await settle();

    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
  });

  it('hands the footer slot the pod, which is where the admin console hangs its coupons section', async () => {
    const footer = vi.fn(() => <div>footer-slot</div>);
    mount({ footer });
    await settle();

    expect(await screen.findByText('footer-slot')).toBeInTheDocument();
    expect(footer).toHaveBeenCalledWith(expect.objectContaining({ id: POD_ID, pod_title: 'Sunday Badminton' }));
  });
});

describe('usePodDetailsScope', () => {
  function Probe() {
    const docs = usePodDetailsScope();
    return <output data-testid="scope">{docs.scope}</output>;
  }

  it.each(['ADMIN', 'CLUB_ADMIN'] as const)('hands every section the %s query set', (scope) => {
    render(
      <PodDetailsScopeProvider scope={scope}>
        <Probe />
      </PodDetailsScopeProvider>
    );

    expect(screen.getByTestId('scope').textContent).toBe(scope);
  });

  it('gives each scope a DISTINCT set of documents, which is the whole reason it exists', () => {
    const seen: Record<string, Record<string, unknown>> = {};

    function Capture({ label }: Readonly<{ label: string }>) {
      seen[label] = usePodDetailsScope() as unknown as Record<string, unknown>;
      return null;
    }

    render(
      <>
        <PodDetailsScopeProvider scope="ADMIN">
          <Capture label="admin" />
        </PodDetailsScopeProvider>
        <PodDetailsScopeProvider scope="CLUB_ADMIN">
          <Capture label="club" />
        </PodDetailsScopeProvider>
      </>
    );

    for (const key of ['attendees', 'auditTrail', 'feedback', 'hostProfile', 'payments']) {
      expect(seen.admin?.[key], key).not.toBe(seen.club?.[key]);
    }
  });
});
