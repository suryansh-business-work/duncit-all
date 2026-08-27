/**
 * The hosts card and the timeline, each on data that actually arrives.
 *
 * A host line is stitched from two sources — the attendee row (name, contact)
 * and the approved host profile (host number, status) — and the card must read
 * sensibly whichever of the two is missing. The timeline's one sentence that
 * matters is who cancelled the pod and why.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PodHostsCard from '../src/PodHostsCard';
import PodTimelineSection from '../src/PodTimelineSection';
import { POD_AUDIT_TRAIL, POD_HOST_PROFILE, type AdminPodAttendeeRow } from '../src/queries';
import { POD_ID, mountSection, settle } from './harness';

const contact = (over: Partial<AdminPodAttendeeRow>): AdminPodAttendeeRow => ({
  member_id: null,
  seats: 1,
  companions: [],
  user_id: 'host-1',
  full_name: 'Asha Rao',
  email: 'asha@duncit.com',
  phone: '9000000009',
  profile_photo: 'https://cdn.duncit.com/u/asha.jpg',
  is_host: true,
  status: null,
  joined_at: null,
  backed_out_at: null,
  source: null,
  refund_status: null,
  payment_id: null,
  backout_no: null,
  replaced_by_user_id: null,
  replaced_by_name: null,
  participation: null,
  ...over,
});

const profile = (over: Record<string, unknown> = {}) => ({
  __typename: 'Host',
  id: 'h-1',
  host_no: 'DUN-HST-0007',
  full_name: 'Asha Rao',
  email: 'asha.host@duncit.com',
  phone: '9111111111',
  status: 'APPROVED',
  ...over,
});

const hostMock = (userId: string, result: Record<string, unknown> | null): MockedResponse => ({
  request: { query: POD_HOST_PROFILE, variables: { user_id: userId, pod_id: POD_ID } },
  result: { data: { hostByUser: result } },
});

describe('PodHostsCard', () => {
  const pod = (over: Record<string, unknown> = {}) => ({
    id: POD_ID,
    pod_hosts_id: ['host-1', 'host-2'],
    host_names: ['Asha Rao', 'Ravi Kumar'],
    ...over,
  });

  it('prefers the host profile’s contacts and shows its number and status', async () => {
    mountSection(<PodHostsCard pod={pod()} attendees={[contact({})]} />, [
      hostMock('host-1', profile()),
      hostMock('host-2', null),
    ]);
    await settle();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('asha.host@duncit.com · 9111111111 · DUN-HST-0007')).toBeInTheDocument();
    // The co-host has neither a booking row nor a profile.
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('No contact on file')).toBeInTheDocument();
  });

  it('falls back to the attendee row’s contacts when the profile has none', async () => {
    mountSection(<PodHostsCard pod={pod({ pod_hosts_id: ['host-1'] })} attendees={[contact({})]} />, [
      hostMock('host-1', profile({ email: null, phone: null, host_no: null })),
    ]);
    await settle();

    expect(screen.getByText('asha@duncit.com · 9000000009')).toBeInTheDocument();
  });

  it('calls a host it cannot name "Host", and initials a blank name with ?', async () => {
    mountSection(
      <PodHostsCard
        pod={pod({ pod_hosts_id: ['host-1', 'host-3'], host_names: [] })}
        attendees={[contact({ full_name: '', profile_photo: null })]}
      />,
      [hostMock('host-1', null), hostMock('host-3', null)],
    );
    await settle();

    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('opens the host’s user page from the name', async () => {
    mountSection(<PodHostsCard pod={pod({ pod_hosts_id: ['host-1'] })} attendees={[]} />, [hostMock('host-1', null)]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Asha Rao' }));
    expect(await screen.findByText('user-page')).toBeInTheDocument();
  });

  it('says when the pod has no hosts at all', () => {
    mountSection(<PodHostsCard pod={{ id: POD_ID, pod_hosts_id: null, host_names: null }} attendees={[]} />);

    expect(screen.getByText('No hosts on this pod.')).toBeInTheDocument();
  });
});

const audit = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodAuditLog',
  id: 'audit-1',
  action: 'DELETE',
  source: 'SYSTEM',
  actor_name: 'Asha Rao',
  note: 'Too few bookings',
  ai_risk: 'NONE',
  created_at: '2026-08-20T10:00:00.000Z',
  ...over,
});

const auditMock = (entries: unknown[]): MockedResponse => ({
  request: { query: POD_AUDIT_TRAIL, variables: { id: POD_ID } },
  result: { data: { podAuditLogs: entries } },
});

describe('PodTimelineSection', () => {
  const pod = (over: Record<string, unknown> = {}) => ({
    id: POD_ID,
    created_at: '2026-08-01T09:00:00.000Z',
    pod_date_time: '2099-08-30T12:30:00.000Z',
    completed_at: null,
    is_deleted: false,
    deleted_at: null,
    ...over,
  });

  const cancelled = pod({ is_deleted: true, deleted_at: '2026-08-20T10:00:00.000Z' });

  it('names who cancelled the pod and the reason they gave', async () => {
    mountSection(<PodTimelineSection pod={cancelled} />, [auditMock([audit()])]);
    await settle();

    expect(screen.getByText('Cancelled by Asha Rao — Too few bookings')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('falls back to the source and "no reason recorded" when the log is bare', async () => {
    mountSection(<PodTimelineSection pod={cancelled} />, [auditMock([audit({ actor_name: '', note: '' })])]);
    await settle();

    expect(screen.getByText('Cancelled by SYSTEM — no reason recorded')).toBeInTheDocument();
  });

  it('still says the pod was cancelled when no log recorded it', async () => {
    mountSection(<PodTimelineSection pod={cancelled} />, [auditMock([])]);
    await settle();

    expect(screen.getByText('This pod was cancelled.')).toBeInTheDocument();
    expect(screen.getByText('No recorded activity yet.')).toBeInTheDocument();
  });

  it('marks a completed pod whose date has passed as done end to end', async () => {
    mountSection(
      <PodTimelineSection
        pod={pod({ pod_date_time: '2020-08-30T12:30:00.000Z', completed_at: '2020-08-30T15:00:00.000Z' })}
      />,
      [auditMock([audit({ action: 'COMPLETE', note: null })])],
    );
    await settle();

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
  });

  it('leaves the date step pending for a pod with no date', async () => {
    mountSection(<PodTimelineSection pod={pod({ pod_date_time: null })} />, [auditMock([])]);
    await settle();

    expect(screen.getAllByText('Pending')).toHaveLength(2);
  });

  it('shows the audit failure inside the Activity block', async () => {
    mountSection(<PodTimelineSection pod={pod()} />, [
      { request: { query: POD_AUDIT_TRAIL, variables: { id: POD_ID } }, error: new Error('audit down') },
    ]);
    await settle();

    expect(screen.getByText('audit down')).toBeInTheDocument();
  });
});
