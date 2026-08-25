import {
  BADGE_GOAL_KEY,
  BADGE_WINDOW,
  BADGE_WINDOW_KEY,
  HOST_FREE_SPOT_NOTE,
  authMessageCardState,
  badgeProgressPercent,
  buildCommPreferenceLabels,
  canFollowBack,
  commChannelSummary,
  commRowState,
  followBackLabelKey,
  followRequestRowState,
  formatMoney,
  normalizeUsername,
  participationInputFrom,
  payableSpots,
  podParticipationActions,
  podPhase,
  podRefundState,
  sortBadgeProgress,
  splitPodsByPhase,
  usernameBlocksSave,
  usernameFieldState,
  type BadgeCondition,
  type CommChannelState,
  type PodParticipationFields,
  type PodPhaseFields,
  type UsernameRejection,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

/** One badge's standing for one member, exactly as `myBadgeProgress` reports it. */
interface BadgeMock {
  rows: Array<{
    title: string;
    condition_type: BadgeCondition;
    current: number;
    target: number;
    achieved: boolean;
  }>;
}

/** A real booking row as the API hands it to every surface. */
interface BookingMock {
  pod_datetime: string;
  fields: PodParticipationFields;
}

/** What the @handle field holds, plus the server's last answer about it. */
interface HandleMock {
  current: string;
  typed: string;
  available: boolean | null;
  reason: UsernameRejection | null;
}

/** A slice of the Home feed, plus the instant the rails are drawn at. */
interface PhaseMock {
  now: string;
  pods: Array<PodPhaseFields & { pod_id: string }>;
}

/** A pod's money, as the host sizing it sees it. */
interface SpotsMock {
  total_spots: number;
  price_per_spot: number;
}

/** Notification rows exactly as `myNotifications` hands them over. */
interface FollowRowsMock {
  rows: Array<{
    label: string;
    actionType: string | null;
    requestId: string | null;
    status: string | null;
    actorId: string | null;
    followBackStatus: string;
  }>;
}

export default defineDemos('utils', [
  defineDemo<SpotsMock>({
    id: 'host-free-spot',
    title: 'The host sits in the pod and never pays',
    note:
      'Change total_spots: every money figure on the platform bills one seat fewer, because the host occupies one of them.',
    mock: { total_spots: 8, price_per_spot: 450 },
    compute: (mock) => {
      const payable = payableSpots(mock.total_spots);
      return {
        'payableSpots(total_spots)': payable,
        'Seats billed': `${payable} of ${mock.total_spots}`,
        'Pod earns': formatMoney(payable * mock.price_per_spot),
        'If the host were billed too': formatMoney(mock.total_spots * mock.price_per_spot),
        'The rule, in words': HOST_FREE_SPOT_NOTE,
      };
    },
  }),

  defineDemo<BookingMock>({
    id: 'participation',
    title: 'What one booking is actually entitled to',
    note:
      'Flip attended, or add a backout with status SPOT_FILLED, and watch the refund the policy allows change with it.',
    mock: {
      pod_datetime: '2026-09-14T18:30:00.000Z',
      fields: {
        joined_at: '2026-08-30T09:12:00.000Z',
        attended: false,
        attendance_recorded: false,
        refund_status: 'NONE',
        backouts: [
          {
            backout_no: 'DUN-BKO-0912',
            status: 'SPOT_FILLED',
            attempt_no: 1,
            seats: 1,
            seats_before: 1,
            refund_amount: 450,
            coins_refunded: 450,
            refund_status: 'PROCESSED',
            created_at: '2026-09-02T11:40:00.000Z',
          },
        ],
      },
    },
    compute: (mock) => {
      const input = participationInputFrom(mock.fields, mock.pod_datetime);
      const actions = podParticipationActions(input);
      return {
        'podRefundState(...)': podRefundState(input),
        'Can still back out': actions.canBackout,
        'Show the refund state': actions.showRefundState,
        'Coins coming back': actions.coinsRefunded,
        'Joined label': actions.joinedLabelKind,
      };
    },
  }),

  defineDemo<{ channels: CommChannelState[] }>({
    id: 'comm-preference',
    title: 'Where a member is allowed to be messaged',
    note:
      'Switch otp_enabled off on EMAIL: WhatsApp is then the last channel that can reach them, so the server clears its otp_can_disable and its switch locks. Set reachable false and the switch disappears entirely — "off" and "there is no number" are different answers.',
    mock: {
      channels: [
        {
          channel: 'EMAIL',
          reachable: true,
          destination: 'ravi@duncit.com',
          otp_enabled: true,
          otp_can_disable: true,
        },
        {
          channel: 'WHATSAPP',
          reachable: true,
          destination: '+91 87912 34693',
          otp_enabled: true,
          otp_can_disable: false,
        },
        {
          channel: 'SMS',
          reachable: false,
          destination: '',
          otp_enabled: false,
          otp_can_disable: true,
        },
      ],
    },
    compute: (mock) => {
      // The shipped fallback copy, so the demo reads exactly as the screen
      // does rather than echoing key names back.
      const copy: Record<string, string> = {
        'mweb.commPreference.title': 'Communication Preferences',
        'mweb.commPreference.blurb': 'Pick a channel to choose what Duncit sends you there.',
        'mweb.commPreference.entryHint': 'Email, WhatsApp and SMS',
        'mweb.commPreference.authTitle': 'Authentication messages',
        'mweb.commPreference.authBody':
          'The messages that prove it is you — signing in, and marking attendance at a pod.',
        'mweb.commPreference.authSentTo': 'Sent to {destination}.',
        'mweb.commPreference.authLocked':
          'This is the only channel that can reach you, so authentication messages stay on here.',
        'mweb.commPreference.authOn': 'Authentication messages on',
        'mweb.commPreference.authOff': 'Authentication messages off',
        'mweb.commPreference.email': 'Email',
        'mweb.commPreference.whatsapp': 'WhatsApp',
        'mweb.commPreference.sms': 'SMS',
        'mweb.commPreference.emailHint': 'Choose which emails we send you',
        'mweb.commPreference.whatsappHint': 'Choose which WhatsApp messages we send you',
        'mweb.commPreference.smsHint': 'Choose which text messages we send you',
        'mweb.commPreference.emailMissing': 'Add an email address to get messages here.',
        'mweb.commPreference.whatsappMissing': 'Add a WhatsApp number to get messages here.',
        'mweb.commPreference.smsMissing': 'Add a phone number to get messages here.',
        'mweb.commPreference.saved': 'Preferences updated',
        'mweb.commPreference.saveFailed': 'Could not change that. Please try again.',
        'mweb.commPreference.loadFailed': 'Could not load your communication preferences.',
      };
      const t = (key: string, options?: { vars?: Record<string, string | number> }) => {
        const line = copy[key] ?? key;
        const destination = options?.vars?.destination;
        return destination === undefined ? line : line.replace('{destination}', String(destination));
      };
      const labels = buildCommPreferenceLabels(t);
      return Object.fromEntries(
        mock.channels.map((row) => [
          row.channel,
          [
            `hub: ${commChannelSummary(row, labels)}`,
            `card note: ${authMessageCardState(row, labels).note}`,
            `switch: ${JSON.stringify(commRowState(row))}`,
          ].join('   ·   '),
        ])
      );
    },
  }),
  defineDemo<FollowRowsMock>({
    id: 'follow-notification-rows',
    title: 'What each follow row in the inbox offers',
    note:
      "Set a row's followBackStatus to FOLLOWING and its Follow Back disappears — that is the whole point of the field. A NEW_FOLLOWER row has no request behind it, so it never shows Accept/Deny, and it is the only follow row a public profile ever receives.",
    mock: {
      rows: [
        {
          label: 'Riya asked to follow you',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4821',
          status: 'PENDING',
          actorId: 'u-riya',
          followBackStatus: 'NONE',
        },
        {
          label: 'You accepted Riya',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4821',
          status: 'ACCEPTED',
          actorId: 'u-riya',
          followBackStatus: 'NONE',
        },
        {
          label: 'Aarav started following you',
          actionType: 'NEW_FOLLOWER',
          requestId: null,
          status: null,
          actorId: 'u-aarav',
          followBackStatus: 'NONE',
        },
        {
          label: 'Meera started following you (you already follow her)',
          actionType: 'NEW_FOLLOWER',
          requestId: null,
          status: null,
          actorId: 'u-meera',
          followBackStatus: 'FOLLOWING',
        },
      ],
    },
    compute: (mock) =>
      Object.fromEntries(
        mock.rows.map((row) => {
          const state = followRequestRowState(row);
          const button =
            state === 'FOLLOW_BACK'
              ? `${followBackLabelKey(row.followBackStatus)} (tappable: ${canFollowBack(row.followBackStatus)})`
              : 'no follow-back button';
          return [row.label, `${state}   ·   ${button}`];
        })
      ),
  }),
  defineDemo<{ amounts: number[] }>({
    id: 'money',
    title: 'Money, the way every surface prints it',
    note: 'en-IN grouping (1,25,000), and compact notation once a figure passes a lakh.',
    mock: { amounts: [450, 12500, 125000, 4821500] },
    compute: (mock) =>
      Object.fromEntries(
        mock.amounts.map((amount) => [
          String(amount),
          `${formatMoney(amount)}   ·   compact ${formatMoney(amount, { compact: true })}   ·   2dp ${formatMoney(amount, { decimals: 2 })}`,
        ])
      ),
  }),
  defineDemo<PhaseMock>({
    id: 'pod-phase',
    title: 'Which Home rail a pod lands on',
    note:
      "Move `now` past a pod's end and watch it cross from Ongoing to Previous. " +
      'DUN-POD-5502 has no end set, so it rides the 4h tail instead.',
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
            podPhase(pod.pod_date_time, pod.pod_end_date_time, now),
          ])
        ),
        'Home rails': counts,
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
  defineDemo<HandleMock>({
    id: 'username',
    title: 'The @handle field, and the Save button it gates',
    note:
      "Type into `typed` and watch the status and the link move together. `available` is the " +
      "server's debounced answer — set it false with reason TAKEN to see Save lock.",
    mock: {
      current: 'ravi-9x3m',
      typed: 'ravi-plays',
      available: true,
      reason: null,
    },
    compute: (mock) => {
      const view = usernameFieldState({
        value: normalizeUsername(mock.typed),
        current: mock.current,
        check: { checking: false, available: mock.available, reason: mock.reason },
        origin: 'https://mweb.duncit.com',
      });
      return {
        Status: view.status,
        'Save disabled': String(usernameBlocksSave(view.status, !!mock.current)),
        'Shows as an error': String(view.errored),
        'Profile link': view.link,
      };
    },
  }),
]);
