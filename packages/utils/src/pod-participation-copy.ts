import type { PodCancelActor, PodTimelineKind, PodTimelineNode } from './pod-participation';

/**
 * What each state of the participation workflow says on screen.
 *
 * Beside the model rather than beside either renderer: mWeb draws these nodes
 * in MUI and the native app draws them in Tamagui, and two hand-written copies
 * of this table is exactly how the two apps start describing the same booking
 * differently (rule 27).
 *
 * The words themselves live in `podTimeline.*`; this module only decides
 * WHICH of them a node says (CLAUDE.md rule 38). Every key is written out as a
 * literal rather than built from the kind, because
 * `scripts/verify-translation-keys.mjs` greps source for the literal string —
 * a composed key reads as shipped-but-never-rendered and fails Shared Gates.
 * Same shape, and the same reason, as `pod-attendance-copy.ts`.
 */
export type TimelineTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface TimelineCopy {
  title: string;
  detail: string;
  /** Drives the icon and the colour — the renderer never reads the kind. */
  tone: 'good' | 'bad' | 'warn' | 'info';
}

const ACTOR_KEY: Record<PodCancelActor, string> = {
  HOST: 'podTimeline.actorHost',
  VENUE: 'podTimeline.actorVenue',
  CLUB_ADMIN: 'podTimeline.actorClubAdmin',
  ADMIN: 'podTimeline.actorAdmin',
  SYSTEM: 'podTimeline.actorSystem',
};

/** The key pair and the tone for each kind. The tone is not copy, so it stays. */
const BASE: Record<PodTimelineKind, { titleKey: string; detailKey: string; tone: TimelineCopy['tone'] }> = {
  JOINED: {
    titleKey: 'podTimeline.joinedTitle',
    detailKey: 'podTimeline.joinedDetail',
    tone: 'good',
  },
  DATE_ARRIVES: {
    titleKey: 'podTimeline.dateArrivesTitle',
    detailKey: 'podTimeline.dateArrivesDetail',
    tone: 'info',
  },
  ATTENDED: {
    titleKey: 'podTimeline.attendedTitle',
    detailKey: 'podTimeline.attendedDetail',
    tone: 'good',
  },
  NOT_ATTENDED: {
    titleKey: 'podTimeline.notAttendedTitle',
    detailKey: 'podTimeline.notAttendedDetail',
    tone: 'bad',
  },
  ATTENDANCE_NOT_RECORDED: {
    titleKey: 'podTimeline.attendanceNotRecordedTitle',
    detailKey: 'podTimeline.attendanceNotRecordedDetail',
    tone: 'info',
  },
  FINDING_REPLACEMENT: {
    titleKey: 'podTimeline.findingReplacementTitle',
    detailKey: 'podTimeline.findingReplacementDetail',
    tone: 'info',
  },
  BACKOUT_REQUESTED: {
    titleKey: 'podTimeline.backoutRequestedTitle',
    detailKey: 'podTimeline.backoutRequestedDetail',
    tone: 'warn',
  },
  SPOT_FILLED: {
    titleKey: 'podTimeline.spotFilledTitle',
    detailKey: 'podTimeline.spotFilledDetail',
    tone: 'good',
  },
  SPOT_NOT_FILLED: {
    titleKey: 'podTimeline.spotNotFilledTitle',
    detailKey: 'podTimeline.spotNotFilledDetail',
    tone: 'warn',
  },
  KEPT_SPOT: {
    titleKey: 'podTimeline.keptSpotTitle',
    detailKey: 'podTimeline.keptSpotDetail',
    tone: 'good',
  },
  REFUND_INITIATED: {
    titleKey: 'podTimeline.refundInitiatedTitle',
    detailKey: 'podTimeline.refundInitiatedDetail',
    tone: 'good',
  },
  REFUND_PENDING: {
    titleKey: 'podTimeline.refundPendingTitle',
    detailKey: 'podTimeline.refundPendingDetail',
    tone: 'info',
  },
  REFUND_NOT_ELIGIBLE: {
    titleKey: 'podTimeline.refundNotEligibleTitle',
    detailKey: 'podTimeline.refundNotEligibleDetail',
    tone: 'bad',
  },
  POD_CANCELLED: {
    titleKey: 'podTimeline.podCancelledTitle',
    detailKey: 'podTimeline.podCancelledDetail',
    tone: 'bad',
  },
  CANCELLED_BY: {
    titleKey: 'podTimeline.cancelledByTitle',
    detailKey: 'podTimeline.cancelledByDetail',
    tone: 'bad',
  },
};

/**
 * The words for one node, with the parts only that node knows filled in.
 *
 * A partial backout has to say so where it happened. "You backed out" is a lie
 * when somebody gave up one seat of four and is still going, and that sentence
 * is the only place on the screen where the difference is visible.
 */
export function timelineCopy(node: PodTimelineNode, t: TimelineTranslate): TimelineCopy {
  const base = BASE[node.kind];
  const copy: TimelineCopy = {
    title: t(base.titleKey),
    detail: t(base.detailKey),
    tone: base.tone,
  };

  if (node.kind === 'CANCELLED_BY' && node.cancelledBy) {
    return {
      ...copy,
      detail: t('podTimeline.cancelledByActorDetail', {
        vars: { actor: t(ACTOR_KEY[node.cancelledBy]) },
      }),
    };
  }

  if (node.kind === 'BACKOUT_REQUESTED') {
    const seats = node.seats ?? 0;
    const before = node.seatsBefore ?? 0;
    const partial = seats > 0 && before > seats;
    if (partial) {
      const kept = before - seats;
      return {
        ...copy,
        title: t('podTimeline.partialBackoutTitle'),
        detail: t('podTimeline.partialBackoutDetail', { vars: { seats, before, kept } }),
      };
    }
  }

  return copy;
}
