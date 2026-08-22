import {
  HOST_FREE_SPOT_NOTE,
  authMessageCardState,
  buildCommPreferenceLabels,
  commChannelSummary,
  commRowState,
  formatMoney,
  participationInputFrom,
  payableSpots,
  podParticipationActions,
  podRefundState,
  type CommChannelState,
  type PodParticipationFields,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

/** A real booking row as the API hands it to every surface. */
interface BookingMock {
  pod_datetime: string;
  fields: PodParticipationFields;
}

/** A pod's money, as the host sizing it sees it. */
interface SpotsMock {
  total_spots: number;
  price_per_spot: number;
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
]);
