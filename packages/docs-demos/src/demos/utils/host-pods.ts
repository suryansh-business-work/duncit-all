import {
  BADGE_GOAL_KEY,
  BADGE_WINDOW,
  BADGE_WINDOW_KEY,
  badgeProgressPercent,
  canCompletePod,
  canScanPodTickets,
  draftHoursLeft,
  isDraftExpiringSoon,
  hostPodSection,
  podPhase,
  sortBadgeProgress,
  splitDraftsByExpiry,
  splitHostPods,
  splitPodsByPhase,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { BadgeMock, PhaseMock, HostSectionsMock, DraftsMock } from './mocks';

export const hostPodsDemos: PackageDemo[] = [
  defineDemo<PhaseMock>({
    id: 'pod-phase',
    title: 'Which Home rail a pod lands on',
    note:
      "Move `now` past a pod's end and watch it cross from Ongoing to Previous. " +
      'DUN-POD-5502 has no end set, so it rides the 4h tail instead. That same crossing is ' +
      "what puts Host Studio's Complete Pod action on a pod: it is offered on a PREVIOUS " +
      'pod only, never while the door is still open. Scanning tickets is the exact mirror — ' +
      'the same crossing greys that row out, because a scanner belongs at a door that is ' +
      'still open.',
    mock: {
      now: '2026-08-25T19:30:00.000Z',
      pods: [
        {
          pod_id: 'DUN-POD-4821',
          pod_date_time: '2026-08-26T13:00:00.000Z',
          pod_end_date_time: '2026-08-26T15:00:00.000Z',
        },
        {
          pod_id: 'DUN-POD-4977',
          pod_date_time: '2026-08-25T18:30:00.000Z',
          pod_end_date_time: '2026-08-25T20:30:00.000Z',
        },
        {
          pod_id: 'DUN-POD-5502',
          pod_date_time: '2026-08-25T17:00:00.000Z',
          pod_end_date_time: null,
        },
        {
          pod_id: 'DUN-POD-4310',
          pod_date_time: '2026-08-24T13:00:00.000Z',
          pod_end_date_time: '2026-08-24T16:00:00.000Z',
        },
      ],
    },
    compute: (mock) => {
      const now = new Date(mock.now).getTime();
      const rails = splitPodsByPhase(mock.pods, now);
      const counts = [
        `Upcoming ${rails.upcoming.length}`,
        `Ongoing ${rails.ongoing.length}`,
        `Previous ${rails.previous.length}`,
      ].join('   ·   ');
      return {
        ...Object.fromEntries(
          mock.pods.map((pod) => [
            pod.pod_id,
            `${podPhase(pod.pod_date_time, pod.pod_end_date_time, now)}   ·   Complete Pod ${
              canCompletePod(pod, now) ? 'offered' : 'hidden'
            }   ·   Scan tickets ${canScanPodTickets(pod, now) ? 'live' : 'closed'}`,
          ])
        ),
        'Home rails': counts,
      };
    },
  }),
  defineDemo<HostSectionsMock>({
    id: 'host-pod-sections',
    title: 'Which Host Studio section a pod sits in',
    note:
      "Change DUN-POD-4977's status from PENDING to APPROVED: it leaves Requested Pods for " +
      'Your Pods, with nothing to remove it from the first list. DECLINED sends it to ' +
      'Rejected Pods, and NONE (a pod no venue has to approve) stays in Your Pods.',
    mock: {
      pods: [
        { pod_id: 'DUN-POD-4821', pod_title: 'Sunday Pottery Jam', venue_approval_status: 'APPROVED' },
        { pod_id: 'DUN-POD-4977', pod_title: 'Terrace Chess Club', venue_approval_status: 'PENDING' },
        { pod_id: 'DUN-POD-5502', pod_title: 'Indiranagar Run Club', venue_approval_status: 'DECLINED' },
        { pod_id: 'DUN-POD-4310', pod_title: 'Late Night Standup', venue_approval_status: 'NONE' },
      ],
    },
    compute: (mock) => {
      const sections = splitHostPods(mock.pods);
      const counts = [
        `Requested ${sections.requested.length}`,
        `Your Pods ${sections.yours.length}`,
        `Rejected ${sections.rejected.length}`,
      ].join('   ·   ');
      return {
        ...Object.fromEntries(
          mock.pods.map((pod) => [pod.pod_id, hostPodSection(pod.venue_approval_status)])
        ),
        'Host Studio': counts,
      };
    },
  }),
  defineDemo<DraftsMock>({
    id: 'draft-expiry',
    title: 'Which drafts Host Studio warns about',
    note:
      'Push DUN-POD-5502’s expires_at past 2026-08-28T09:00 and it drops out of the info-badge ' +
      'panel into the plain list. The panel is ordered soonest-deleted first, so the draft the ' +
      'host must publish today always leads.',
    mock: {
      now: '2026-08-27T09:00:00.000Z',
      drafts: [
        { id: 'DUN-POD-4821', pod_title: 'Sunday Pottery Jam', expires_at: '2026-08-27T20:00:00.000Z' },
        { id: 'DUN-POD-4977', pod_title: 'Terrace Chess Club', expires_at: '2026-08-27T09:30:00.000Z' },
        { id: 'DUN-POD-5502', pod_title: 'Indiranagar Run Club', expires_at: '2026-08-29T06:00:00.000Z' },
        { id: 'DUN-POD-4310', pod_title: 'Late Night Standup', expires_at: null },
      ],
    },
    compute: (mock) => {
      const now = new Date(mock.now).getTime();
      const { expiring, rest } = splitDraftsByExpiry(mock.drafts, now);
      return {
        ...Object.fromEntries(
          mock.drafts.map((draft) => [
            draft.pod_title,
            isDraftExpiringSoon(draft, now)
              ? `warned · ${draftHoursLeft(draft, now)}h left`
              : 'listed as usual',
          ])
        ),
        'Info badge panel': expiring.map((draft) => draft.pod_title).join('   ·   ') || '(empty)',
        'Below it': rest.map((draft) => draft.pod_title).join('   ·   ') || '(empty)',
      };
    },
  }),
  defineDemo<BadgeMock>({
    id: 'badges',
    title: 'What a badge asks for, and how far along you are',
    note:
      'Flip `achieved` on the Monthly Maverick row: the bar pins to 100 and it jumps to the ' +
      'top of the list. Note the window is read from the CONDITION — nothing here configures it.',
    mock: {
      rows: [
        {
          title: 'Legend',
          condition_type: 'POD_ATTEND_COUNT',
          current: 7,
          target: 10,
          achieved: false,
        },
        {
          title: 'Monthly Maverick',
          condition_type: 'MONTHLY_POD_ATTEND_COUNT',
          current: 2,
          target: 6,
          achieved: false,
        },
        {
          title: 'Duncit Host Partner',
          condition_type: 'ROLE_GRANTED',
          current: 1,
          target: 1,
          achieved: true,
        },
      ],
    },
    compute: (mock) =>
      Object.fromEntries(
        sortBadgeProgress(mock.rows).map((row) => [
          row.title,
          [
            BADGE_GOAL_KEY[row.condition_type],
            BADGE_WINDOW_KEY[BADGE_WINDOW[row.condition_type]],
            `${badgeProgressPercent(row)}%`,
          ].join(' · '),
        ])
      ),
  }),
];
