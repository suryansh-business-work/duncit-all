import {
  EARN_JOURNEYS,
  earnBoxState,
  meetingNotice,
  partnerPortalUrl,
  type EarnMeeting,
} from '@duncit/onboarding';
import { defineDemo, defineDemos } from '../types';

interface EarnMock {
  roles: string[];
  meetings: EarnMeeting[];
}

export default defineDemos('onboarding', [
  defineDemo<EarnMock>({
    id: 'earn-boxes',
    title: 'Why each Earn card is open, blocked or already yours',
    note:
      "Add 'VENUE' to roles and that card flips to approved. Change the meeting's kind to HOST and the host card locks instead — one rule, read the same way by mWeb, native and Partners.",
    mock: {
      roles: ['USER', 'HOST'],
      meetings: [
        {
          id: '66f2a91c4b7e2d8a10c4f733',
          request_no: 'DUN-MTG-0412',
          kind: 'VENUE',
          status: 'SCHEDULED',
          scheduled_at: '2026-09-18T10:30:00.000Z',
          requested_at: '2026-09-10T07:15:00.000Z',
          reschedule_count: 0,
        },
      ],
    },
    compute: (mock) => {
      const rows = EARN_JOURNEYS.map((journey) => {
        const state = earnBoxState(journey, mock.roles, mock.meetings);
        // Three separate answers about one card, read left to right: can it be
        // opened, is it already yours, and — when it cannot — why not.
        const openness = state.disabled ? 'blocked' : 'open';
        const owned = state.approved ? ' · already yours' : '';
        const why = state.disabledLabel ? ` — ${state.disabledLabel}` : '';
        return [journey.title, `${openness}${owned}${why}`] as const;
      });
      const blocked = mock.meetings.find((meeting) => meeting.status === 'SCHEDULED');
      return {
        ...Object.fromEntries(rows),
        'Notice on the blocked card': blocked ? meetingNotice(blocked) : 'none',
        'Where a partner card sends you': partnerPortalUrl('/verification'),
      };
    },
  }),
]);
