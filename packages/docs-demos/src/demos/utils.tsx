import {
  AUTO_POD_ROLES,
  BADGE_GOAL_KEY,
  BADGE_WINDOW,
  BADGE_WINDOW_KEY,
  HOST_FREE_SPOT_NOTE,
  POD_FEEDBACK_REMINDER_OPTIONS,
  allZero,
  buildOrderTimeline,
  fulfilmentFlow,
  fulfilmentLabel,
  isTerminalFulfilment,
  statusLabel,
  trackingUrl,
  authMessageCardState,
  autoPodActionable,
  autoPodCityLabel,
  autoPodEnrolledCount,
  autoPodHostNeedsLocation,
  autoPodMissingRoles,
  badgeProgressPercent,
  buildCommPreferenceLabels,
  buildEarningsBars,
  buildParticipantTrend,
  buildPodsOverTime,
  buildStatusSlices,
  hostRangeMeta,
  buildPodFeedbackInput,
  canCompletePod,
  canFollowBack,
  canScanTickets,
  canSubmitPodFeedback,
  commChannelSummary,
  commRowState,
  contactDraftFrom,
  contactDraftIsUnchanged,
  contactDraftValue,
  currentContactValue,
  draftHoursLeft,
  earningsBodyFor,
  followBackLabelKey,
  isDraftExpiringSoon,
  followButtonLabelKey,
  followOutcomeLabelKey,
  followRequestRowState,
  formatMoney,
  hostPodSection,
  mwebAttendanceLabels,
  needsOtp,
  normalizeUsername,
  offersFollowBack,
  orderedAspects,
  participationInputFrom,
  payableSpots,
  podParticipationActions,
  podPhase,
  podRefundState,
  sortBadgeProgress,
  splitDraftsByExpiry,
  splitHostPods,
  splitPodsByPhase,
  usernameBlocksSave,
  usernameFieldState,
  videoSourceUrl,
  type AutoPodRow,
  type HostChartRange,
  type MonthlyEarning,
  type ParticipantPod,
  type StatusCounts,
  type StatusPalette,
  type BadgeCondition,
  type CommChannelState,
  type ContactChannel,
  type ContactSnapshot,
  type PodAttendanceMode,
  type PodAttendanceViewer,
  type PodFeedbackReminderChoice,
  type PodFeedbackScores,
  type PodParticipationFields,
  type PodPhaseFields,
  type UsernameRejection,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

/** One pending pod as the rating prompt receives it, plus the guest's answers. */
interface PodFeedbackMock {
  title: string;
  /** `feedback_aspects` from the server — a virtual pod has no VENUE or FOOD. */
  serverAspects: string[];
  scores: PodFeedbackScores;
  message: string;
  closedWith: PodFeedbackReminderChoice;
}

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
interface ContactChangeMock {
  email: string;
  phone_extension: string;
  phone_number: string;
  whatsapp_extension: string;
  whatsapp_number: string;
  channel: ContactChannel;
  draftExtension: string;
  draftNumber: string;
}

interface HandleMock {
  current: string;
  typed: string;
  available: boolean | null;
  reason: UsernameRejection | null;
}

/** The head of a `podAttendanceBoard` answer — the four fields every attendance rule reads. */
interface AttendanceBoardMock {
  pod_id: string;
  viewer: PodAttendanceViewer;
  can_mark: boolean;
  otp_required: boolean;
  pod_mode: PodAttendanceMode;
}

/** A slice of the Home feed, plus the instant the rails are drawn at. */
interface PhaseMock {
  now: string;
  pods: Array<PodPhaseFields & { pod_id: string }>;
}

/** The host's own pods, as `myHostPods` hands them over. */
interface HostSectionsMock {
  pods: Array<{ pod_id: string; pod_title: string; venue_approval_status: string }>;
}

/** A pod's money, as the host sizing it sees it. */
interface SpotsMock {
  total_spots: number;
  price_per_spot: number;
}

/** One Auto Pod offer as a queue query returns it, plus the city the viewing host has selected. */
interface AutoPodAnyOrderMock {
  row: AutoPodRow;
  /** The Location id picked at the top of the host's page; '' when none. */
  selected_location_id: string;
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

/** A host’s Create-Pod drafts as `myPodDrafts` returns them, with the server’s
 * own deletion date on each, plus the instant to judge them against. */
interface DraftsMock {
  now: string;
  drafts: Array<{ id: string; pod_title: string; expires_at: string | null }>;
}

/** Profiles as `publicUserProfile` describes them to the viewer: their own
 * follow state towards the person, and whether that person follows them. */
interface FollowButtonMock {
  profiles: Array<{
    label: string;
    status: 'NONE' | 'REQUESTED' | 'FOLLOWING';
    followsViewer: boolean;
  }>;
}

/** One product order, as every surface holds it while deciding what to show. */
interface OrderMock {
  fulfilment_method: string;
  fulfilment_status: string;
  /** ShipRocket's airway bill; empty until a courier is assigned. */
  awb: string;
}

interface HostInsightsMock {
  range: HostChartRange;
  podDates: string[];
  pods: ParticipantPod[];
  statusCounts: StatusCounts;
  earnings: MonthlyEarning[];
  palette: StatusPalette;
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

  defineDemo<AutoPodAnyOrderMock>({
    id: 'auto-pod-any-order',
    title: 'An Auto Pod enrols in any order, and the first partner pins its city',
    note:
      'A club admin enrolled first here, so the offer is CLAIMING, pinned to Bengaluru by CLUB, and a venue or a host may take it next. Set location to null: it is unpinned again, and with selected_location_id empty the host cannot assign themselves — the city would come from them.',
    mock: {
      row: {
        id: '66f1a2b3c4d5e6f708192d23',
        auto_pod_no: 'APOD-000123',
        stage: 'CLAIMING',
        pod_title: 'Sunday Badminton Doubles',
        pod_description: 'Friendly doubles for intermediate players. Rackets available on site.',
        pod_images_and_videos: [
          { url: 'https://ik.imagekit.io/duncit/pods/badminton-hero.jpg', type: 'IMAGE' },
        ],
        sub_category_id: '66f1a2b3c4d5e6f708192c11',
        category_name: 'Badminton',
        pod_amount: 499,
        no_of_spots: 8,
        venue_claim: null,
        host_claim: null,
        club_claim: {
          club_id: 'club-41',
          club_name: 'Koramangala Smashers',
          user_id: 'u-9',
          claimed_at: '2026-08-26T08:05:00.000Z',
        },
        location: {
          location_id: '66f1a2b3c4d5e6f708192e01',
          location_name: 'Bengaluru',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          bound_by: 'CLUB',
          bound_at: '2026-08-26T08:05:00.000Z',
        },
        viewer_claimed: false,
        pod_id: null,
        expected_host_earnings: 2793,
      },
      selected_location_id: '',
    },
    compute: (mock) => ({
      'autoPodEnrolledCount(row)': autoPodEnrolledCount(mock.row),
      'autoPodMissingRoles(row)': autoPodMissingRoles(mock.row),
      'autoPodActionable(row, role)': Object.fromEntries(
        AUTO_POD_ROLES.map((role) => [role, autoPodActionable(mock.row, role)])
      ),
      'autoPodHostNeedsLocation(row, selected_location_id)': autoPodHostNeedsLocation(
        mock.row,
        mock.selected_location_id
      ),
      'autoPodCityLabel(row.location)': autoPodCityLabel(mock.row.location) || '(unpinned)',
    }),
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
      "Follow Back only ever rides on the FOLLOW_BACK state. Flip Riya's status from PENDING to ACCEPTED and the button appears; flip it to DENIED and it does not — a viewer answers the ask first, and denying it ends the row. Set followBackStatus to FOLLOWING and the button goes even on an accepted row, since there is nothing left to do. A NEW_FOLLOWER row has no request behind it, so it carries Follow Back alone, and it is the only follow row a public profile ever receives.",
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
          label: 'Kabir asked to follow you (you already follow him)',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4822',
          status: 'PENDING',
          actorId: 'u-kabir',
          followBackStatus: 'FOLLOWING',
        },
        {
          label: 'You denied Nikhil',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4823',
          status: 'DENIED',
          actorId: 'u-nikhil',
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
        {
          label: 'Dev asked, then withdrew the ask',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4824',
          status: 'CANCELLED',
          actorId: 'u-dev',
          followBackStatus: 'NONE',
        },
      ],
    },
    compute: (mock) =>
      Object.fromEntries(
        mock.rows.map((row) => {
          const state = followRequestRowState(row);
          const button = offersFollowBack(row)
            ? `${followBackLabelKey(row.followBackStatus)} (tappable: ${canFollowBack(row.followBackStatus)})`
            : 'no follow-back button';
          const outcome = followOutcomeLabelKey(row.status) ?? 'no outcome line';
          return [row.label, `${state}   ·   ${outcome}   ·   ${button}`];
        })
      ),
  }),
  defineDemo<FollowButtonMock>({
    id: 'follow-button-label',
    title: 'What the Follow button on a profile reads',
    note:
      'Flip followsViewer on a NONE profile and the button reads Follow Back — the same words the inbox uses for the same tap, so a profile and the notification about that person never disagree. REQUESTED and FOLLOWING ignore it: a pending ask and a mutual follow read as they always have.',
    mock: {
      profiles: [
        { label: 'Riya (follows you, you do not follow her)', status: 'NONE', followsViewer: true },
        { label: 'Aarav (neither of you follows the other)', status: 'NONE', followsViewer: false },
        { label: 'Kabir (you asked, he has not answered)', status: 'REQUESTED', followsViewer: true },
        { label: 'Meera (you follow each other)', status: 'FOLLOWING', followsViewer: true },
      ],
    },
    compute: (mock) =>
      Object.fromEntries(
        mock.profiles.map((p) => [p.label, followButtonLabelKey(p.status, p.followsViewer)])
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
      'DUN-POD-5502 has no end set, so it rides the 4h tail instead. That same crossing is ' +
      "what puts Host Studio's Complete Pod action on a pod: it is offered on a PREVIOUS " +
      'pod only, never while the door is still open.',
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
            }`,
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
  defineDemo<ContactChangeMock>({
    id: 'contact-change',
    title: 'Changing a contact detail, and the code it costs',
    note:
      'Edit `draftNumber` to a number the account does not have and `Sends a code` flips to ' +
      'true. Change only `draftExtension` — same digits, different country — and it still ' +
      'sends, because +1 9845012345 is not the same number as +91 9845012345. Blank the ' +
      "account's whatsapp_number and its row falls back to the empty line rather than " +
      'showing a lone +91.',
    mock: {
      email: 'ravi@duncit.com',
      phone_extension: '+91',
      phone_number: '9845012345',
      whatsapp_extension: '+91',
      whatsapp_number: '',
      channel: 'PHONE',
      draftExtension: '+91',
      draftNumber: '9845099999',
    },
    compute: (mock) => {
      const account: ContactSnapshot = {
        email: mock.email,
        phone_extension: mock.phone_extension,
        phone_number: mock.phone_number,
        whatsapp_extension: mock.whatsapp_extension,
        whatsapp_number: mock.whatsapp_number,
      };
      const draft = {
        email: mock.email,
        extension: mock.draftExtension,
        number: mock.draftNumber,
      };
      const nothingYet = '(nothing yet)';
      return {
        'Email row': currentContactValue(account, 'EMAIL') || nothingYet,
        'Phone row': currentContactValue(account, 'PHONE') || nothingYet,
        'WhatsApp row': currentContactValue(account, 'WHATSAPP') || nothingYet,
        'Dialog opens on': JSON.stringify(contactDraftFrom(account, mock.channel)),
        'Value stored': contactDraftValue(draft, mock.channel),
        'Sends a code': String(!contactDraftIsUnchanged(account, mock.channel, draft)),
      };
    },
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
  defineDemo<{ urls: string[] }>({
    id: 'video-source-url',
    title: 'The URL a video player is actually handed',
    note:
      'Add a `?tr=w-400` to the first url: an explicit transformation is somebody else\'s ' +
      'choice and survives untouched. A Pexels clip is left alone too — only our own ' +
      'ImageKit addresses ask for the stored file, because ImageKit re-encodes a video on ' +
      'delivery and answers 403 once that metered allowance is spent.',
    mock: {
      urls: [
        'https://ik.imagekit.io/esdata1/posts/duncit-story_rVMB846f9.mp4',
        'https://ik.imagekit.io/esdata1/posts/duncit-story_rVMB846f9.mp4?tr=orig-true',
        'https://videos.pexels.com/video-files/3195394/3195394-uhd.mp4',
      ],
    },
    compute: (mock) => Object.fromEntries(mock.urls.map((url) => [url, videoSourceUrl(url)])),
  }),
  defineDemo<PodFeedbackMock>({
    id: 'pod-feedback',
    title: 'The post-pod rating prompt, and the way out of it',
    note:
      'Drop `OVERALL` to 0 and Submit locks — it is the only required score. Score FOOD 0 ' +
      'and it leaves the payload entirely: "not scored" and "scored badly" are different ' +
      'answers. `closedWith` is what the Close button writes: LATER snoozes this pod, NEVER ' +
      'retires it, and either way the server remembers, so a reload does not ask again.',
    mock: {
      // Exactly what myPendingPodFeedback answers for a pod at a real venue.
      title: 'Sunday Chess & Filter Coffee',
      serverAspects: ['OVERALL', 'HOST', 'VENUE', 'SAFETY', 'FOOD', 'OTHER'],
      scores: { OVERALL: 4, HOST: 5, VENUE: 3, FOOD: 0 },
      message: '  Great host, room was a bit loud.  ',
      closedWith: 'LATER',
    },
    compute: (mock) => {
      const aspects = orderedAspects(mock.serverAspects);
      const chosen = POD_FEEDBACK_REMINDER_OPTIONS.find((o) => o.choice === mock.closedWith);
      return {
        Asked: aspects.join(' → '),
        'Submit enabled': String(canSubmitPodFeedback(mock.scores)),
        Payload: JSON.stringify(
          buildPodFeedbackInput({
            podId: 'DUN-POD-4821',
            scores: mock.scores,
            message: mock.message,
            aspects,
          })
        ),
        'Close offers': POD_FEEDBACK_REMINDER_OPTIONS.map((o) => o.labelKey).join(', '),
        'Close writes': chosen ? chosen.choice : '(not one of the two options)',
      };
    },
  }),
  defineDemo<AttendanceBoardMock>({
    id: 'pod-attendance',
    title: 'What the attendance board offers its host',
    note:
      'Flip pod_mode to VIRTUAL: the scanner disappears and the earnings sentence changes. ' +
      'Set viewer to CLUB_ADMIN and needsOtp answers false whatever otp_required says — the ' +
      'override exists for the attendee who cannot be reached.',
    mock: {
      pod_id: 'DUN-POD-4821',
      viewer: 'HOST',
      can_mark: true,
      otp_required: true,
      pod_mode: 'PHYSICAL',
    },
    compute: (mock) => {
      // Keys rather than copy, so the demo names WHICH sentence each surface renders.
      const labels = mwebAttendanceLabels((key) => key);
      const door = mock.pod_mode === 'VIRTUAL' ? 'VIRTUAL_JOIN' : 'HOST_SCAN';
      const scanCta = canScanTickets(mock) ? labels.scanCta : '(hidden)';
      return {
        'needsOtp(board)': needsOtp(mock),
        'canScanTickets(board)': canScanTickets(mock),
        'earningsBodyFor(board, labels)': earningsBodyFor(mock, labels),
        'Scan CTA': scanCta,
        'How a member gets marked': labels.methodLabel(door),
      };
    },
  }),

  defineDemo<HostInsightsMock>({
    id: 'host-insights',
    title: 'The Host Studio charts, as numbers',
    note: 'Change range to ALL and the series starts at the host’s first pod instead of six months back — with an empty pod list it returns nothing at all, which is what makes the screen show its empty state rather than an axis of zeroes. The donut colours come from the palette below, never from inside the package.',
    mock: {
      range: 'PAST_6_MONTHS',
      podDates: [
        '2026-08-14T12:30:00.000Z',
        '2026-08-02T09:00:00.000Z',
        '2026-06-21T15:00:00.000Z',
        '2026-04-09T06:30:00.000Z',
      ],
      pods: [
        {
          pod_date_time: '2026-08-14T12:30:00.000Z',
          pod_attendees: ['u1', 'u2', 'u3', 'u4', 'u5'],
          pod_hosts_id: ['host-1'],
        },
        {
          pod_date_time: '2026-06-21T15:00:00.000Z',
          pod_attendees: ['u1', 'u2'],
          pod_hosts_id: ['host-1'],
        },
      ],
      statusCounts: { upcoming: 3, ongoing: 1, completed: 8, cancelled: 2 },
      earnings: [
        { month: '2026-06', total: 3400 },
        { month: '2026-07', total: 5125 },
        { month: '2026-08', total: 4200 },
      ],
      palette: { warning: '#f59e0b', success: '#22c55e', info: '#3b82f6', error: '#ef4444' },
    },
    compute: (mock) => {
      const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
        Object.entries(options?.vars ?? {}).reduce<string>(
          (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
          key,
        );
      const podsByMonth = buildPodsOverTime(mock.podDates, mock.range);
      return {
        Heading: hostRangeMeta(mock.range, t),
        'Pods by month': podsByMonth,
        'Guests per pod (seats minus hosts)': buildParticipantTrend(mock.pods),
        'Status donut': buildStatusSlices(mock.statusCounts, mock.palette, t),
        'Earnings bars': buildEarningsBars(mock.earnings),
        'Chart is empty': allZero(podsByMonth),
        'Why seats, not people':
          'This sits beside the money the host is shown, and the settlement it has to agree with is priced per seat.',
      };
    },
  }),

  defineDemo<OrderMock>({
    id: 'product-orders',
    title: 'Where a product order actually is',
    note: 'Set fulfilment_method to PICKUP and fulfilment_status to PICKUP_SCHEDULED — the buyer now sees that rung. Their old ladder had no such step, so this order read back to them as "Order placed" while the seller had already scheduled it. Try CANCELLED and the whole ladder collapses to one step.',
    mock: {
      fulfilment_method: 'SHIP',
      fulfilment_status: 'AWB_ASSIGNED',
      awb: 'SR784512396',
    },
    compute: (mock) => {
      const t = (key: string) => key;
      const order = {
        fulfilment_method: mock.fulfilment_method,
        fulfilment_status: mock.fulfilment_status,
      };
      return {
        'Reads as': statusLabel(mock.fulfilment_status, t),
        'Fulfilled by': fulfilmentLabel(mock.fulfilment_method, t),
        'The flow for this method': fulfilmentFlow(mock.fulfilment_method),
        Timeline: buildOrderTimeline(order, t),
        'Order has stopped moving': isTerminalFulfilment(mock.fulfilment_status),
        'Track it at': trackingUrl(mock.awb) || '(no AWB yet — the caller shows no link)',
        'An unknown status': statusLabel('AWAITING_QUANTUM_TUNNEL', t),
      };
    },
  }),
]);
