import { RequestChangeDialog, fallbackT } from '@duncit/pod-change-requests';
import {
  canRequestPodChange,
  canWithdrawChangeRequest,
  changePenaltyFor,
  changeRequestBlockedKey,
  changeRequestConfirmKey,
  changeRequestMenuKey,
  changeRequestPodLink,
  changeRequestStatusKey,
  changeRequestTone,
  isChangeRequestLive,
  splitChangeRequests,
  type PodChangeRole,
  type PodChangeRow,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

/** The shape a studio actually receives back from `myPodChangeBoard`. */
const row = (over: Partial<PodChangeRow>): PodChangeRow => ({
  id: '665f2c1ab3d4e5f60718293a',
  change_request_no: 'DUN-CRQ-000042',
  role: 'VENUE',
  status: 'OPEN',
  resolution: 'NONE',
  reason: 'Court 2 is flooded after the storm and will not dry before Sunday.',
  health_penalty: 5,
  attendees_at_request: 8,
  pod: {
    id: '665f2c1ab3d4e5f607182900',
    pod_slug: 'sunday-badminton-doubles',
    pod_title: 'Sunday Badminton Doubles',
    pod_date_time: '2026-09-13T01:30:00.000Z',
    club_slug: 'noida-racquet-club',
    attendee_count: 8,
  },
  pod_cancelled: false,
  requested_by: {
    user_id: '665f2c1ab3d4e5f607182911',
    full_name: 'Rohit Sharma',
    email: 'rohit@sector62arena.in',
    phone: '+919812345670',
  },
  from_venue_id: '665f2c1ab3d4e5f607182922',
  from_venue_name: 'Sector 62 Sports Arena',
  from_club_id: null,
  from_club_name: '',
  offer: null,
  offer_history: [],
  events: [
    {
      action: 'FILED',
      actor_name: 'Rohit Sharma',
      note: 'Court 2 is flooded after the storm and will not dry before Sunday.',
      at: '2026-09-04T06:10:00.000Z',
    },
  ],
  created_at: '2026-09-04T06:10:00.000Z',
  resolved_at: null,
  ...over,
});

export default defineDemos('pod-change-requests', [
  defineDemo<{ role: PodChangeRole; penalty: number; attendeeCount: number }>({
    id: 'confirm',
    title: 'The dialog between a tap and a deduction',
    note:
      'Change attendeeCount to 0 and the second warning disappears; set penalty to 0 and the cost line changes to "does not affect your Account Health". Both numbers come from the server, never from the caller — three surfaces guessing the price is three chances to quote a number an admin has already changed.',
    mock: { role: 'VENUE', penalty: 5, attendeeCount: 8 },
    render: (mock) => (
      <RequestChangeDialog
        open
        role={mock.role}
        penalty={mock.penalty}
        attendeeCount={mock.attendeeCount}
        busy={false}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    ),
    compute: (mock) => ({
      'Menu label key': changeRequestMenuKey(mock.role),
      'Menu label': fallbackT(changeRequestMenuKey(mock.role)),
      'Confirm body': fallbackT(changeRequestConfirmKey(mock.role)),
    }),
  }),

  defineDemo<{
    status: PodChangeRow['status'];
    resolution: PodChangeRow['resolution'];
    completed: boolean;
  }>({
    id: 'state',
    title: 'What a request is called, and when the action closes',
    note:
      'Set resolution to POD_CANCELLED with status RESOLVED: the label stops saying "Resolved" and says the pod was cancelled and refunded, because those are completely different outcomes for the person who asked. Flip completed to true and the action is refused outright — a finished pod has nothing left to hand over.',
    mock: { status: 'OFFERED', resolution: 'NONE', completed: false },
    compute: (mock) => {
      const current = row({ status: mock.status, resolution: mock.resolution });
      const pod = { completed_at: mock.completed ? '2026-09-14T04:00:00.000Z' : null };
      return {
        'Status label': fallbackT(changeRequestStatusKey(current)),
        'Chip tone': changeRequestTone(current),
        'Still live': isChangeRequestLive(current),
        'Requester may withdraw': canWithdrawChangeRequest(current),
        'Pod may be asked about': canRequestPodChange(pod),
        'Why not': changeRequestBlockedKey(pod, current)
          ? fallbackT(changeRequestBlockedKey(pod, current)!)
          : '(the action is open)',
        'Pod link': changeRequestPodLink(current),
      };
    },
  }),

  defineDemo<{ venue_penalty: number; host_penalty: number; club_admin_penalty: number }>({
    id: 'board',
    title: 'How a studio splits its board',
    note:
      'The three penalties ride on the SAME query the board comes from, so a studio never has to ask twice. Lower host_penalty to 0 and a host is told the ask is free — which is exactly what an admin setting it to 0 means.',
    mock: { venue_penalty: 5, host_penalty: 3, club_admin_penalty: 2 },
    compute: (mock) => {
      const rows = [
        row({ id: 'a', status: 'OPEN' }),
        row({ id: 'b', status: 'OFFERED', role: 'HOST' }),
        row({ id: 'c', status: 'RESOLVED', resolution: 'REPLACED', role: 'HOST' }),
        row({ id: 'd', status: 'RESOLVED', resolution: 'POD_CANCELLED', role: 'CLUB_ADMIN' }),
        row({ id: 'e', status: 'WITHDRAWN' }),
      ];
      const split = splitChangeRequests(rows);
      return {
        'Still waiting': split.live.map((r) => `${r.change_request_no} · ${r.status}`),
        'Already answered': split.settled.map(
          (r) => `${r.change_request_no} · ${fallbackT(changeRequestStatusKey(r))}`
        ),
        'A venue pays': changePenaltyFor(mock, 'VENUE'),
        'A host pays': changePenaltyFor(mock, 'HOST'),
        'A club admin pays': changePenaltyFor(mock, 'CLUB_ADMIN'),
      };
    },
  }),
]);
