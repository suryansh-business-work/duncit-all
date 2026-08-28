import { describe, expect, it } from 'vitest';
import type { PodCancelActor, PodTimelineKind, PodTimelineNode } from '../src/pod-participation';
import {
  timelineCopy,
  type TimelineCopy,
  type TimelineTranslate,
} from '../src/pod-participation-copy';

/** A timeline node of one kind, with only the fields under test set deliberately. */
const node = (kind: PodTimelineKind, over: Partial<PodTimelineNode> = {}): PodTimelineNode => ({
  kind,
  state: 'done',
  ...over,
});

/**
 * A translator that answers with a marker built from the key — `t:<key>`, never
 * the bare key — so a test can tell "came out of the translator" from "an
 * English sentence still hard-coded in the package". Same device as
 * `pod-attendance-copy.test.ts`; the wording itself is the bundle's to prove.
 */
const marker: TimelineTranslate = (key) => `t:${key}`;

/**
 * A translator over a tiny catalogue, substituting `{name}` placeholders the
 * same way `@duncit/i18n` does — so a var NAME that drifts from the bundle's
 * placeholder shows up as a literal `{seats}` left in the sentence.
 */
const catalogue =
  (entries: Record<string, string>): TimelineTranslate =>
  (key, options) =>
    (entries[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
      String(options?.vars?.[name] ?? match),
    );

/**
 * The tone every kind must carry. Typed as a Record so a kind added to the
 * union without a row here fails to compile — the renderers colour and pick
 * the icon from the tone alone, so an unmapped kind would draw blank.
 */
const TONE_BY_KIND: Record<PodTimelineKind, TimelineCopy['tone']> = {
  JOINED: 'good',
  DATE_ARRIVES: 'info',
  ATTENDED: 'good',
  NOT_ATTENDED: 'bad',
  ATTENDANCE_NOT_RECORDED: 'info',
  BACKOUT_REQUESTED: 'warn',
  FINDING_REPLACEMENT: 'info',
  SPOT_FILLED: 'good',
  SPOT_NOT_FILLED: 'warn',
  KEPT_SPOT: 'good',
  REFUND_INITIATED: 'good',
  REFUND_PENDING: 'info',
  REFUND_NOT_ELIGIBLE: 'bad',
  POD_CANCELLED: 'bad',
  CANCELLED_BY: 'bad',
};

const KINDS = Object.keys(TONE_BY_KIND) as PodTimelineKind[];

/** The key each actor is named by. ADMIN reads as the brand, never "the admin". */
const ACTOR_KEY: Record<PodCancelActor, string> = {
  HOST: 'podTimeline.actorHost',
  VENUE: 'podTimeline.actorVenue',
  CLUB_ADMIN: 'podTimeline.actorClubAdmin',
  ADMIN: 'podTimeline.actorAdmin',
  SYSTEM: 'podTimeline.actorSystem',
};

const ACTORS = Object.keys(ACTOR_KEY) as PodCancelActor[];

describe('timelineCopy', () => {
  describe('every kind', () => {
    // Each kind is its own step on the timeline: nothing may render blank, and
    // no two kinds may tell the same step — a shared title or sentence would
    // show one event twice and hide the other.
    it('answers every timeline kind with its own title and detail key', () => {
      const titles = new Set<string>();
      const details = new Set<string>();
      for (const kind of KINDS) {
        const copy = timelineCopy(node(kind), marker);
        expect(copy.title.startsWith('t:podTimeline.'), kind).toBe(true);
        expect(copy.detail.startsWith('t:podTimeline.'), kind).toBe(true);
        titles.add(copy.title);
        details.add(copy.detail);
      }
      expect(titles.size).toBe(KINDS.length);
      expect(details.size).toBe(KINDS.length);
    });

    // Nothing may be left as an English literal: rule 38 is the whole point of
    // this module taking a translator at all.
    it('renders no copy of its own — every word comes from the translator', () => {
      for (const kind of KINDS) {
        const copy = timelineCopy(node(kind), marker);
        expect(copy.title.startsWith('t:'), kind).toBe(true);
        expect(copy.detail.startsWith('t:'), kind).toBe(true);
      }
    });

    it('colours each kind by its meaning — good outcomes, bad outcomes, warnings, and neutral facts', () => {
      for (const kind of KINDS) {
        expect(timelineCopy(node(kind), marker).tone, kind).toBe(TONE_BY_KIND[kind]);
      }
    });

    // The seat counts and the actor only mean something on their own kinds;
    // a JOINED node carrying them (a mis-built node) still reads as a join —
    // neither the actor sentence nor the partial-backout title may leak in.
    it('ignores seat counts and the actor on kinds that do not own them', () => {
      const decorated = timelineCopy(
        node('JOINED', { seats: 1, seatsBefore: 4, cancelledBy: 'HOST' }),
        marker,
      );
      expect(decorated).toEqual({
        title: 't:podTimeline.joinedTitle',
        detail: 't:podTimeline.joinedDetail',
        tone: 'good',
      });
    });

    // POD_CANCELLED is the parent node; the actor sentence belongs to its
    // CANCELLED_BY child only, so the parent must not repeat it.
    it('keeps the actor out of the POD_CANCELLED parent even when the node carries one', () => {
      expect(timelineCopy(node('POD_CANCELLED', { cancelledBy: 'VENUE' }), marker).detail).toBe(
        't:podTimeline.podCancelledDetail',
      );
    });
  });

  describe('policy sentences', () => {
    // Each of these is a distinct promise to the member, so each has to reach
    // its OWN key — one shared key would tell two different members the same
    // thing about two different outcomes.
    it('points the refund and attendance outcomes at their own keys', () => {
      const detailOf = (kind: PodTimelineKind) => timelineCopy(node(kind), marker).detail;
      expect(detailOf('FINDING_REPLACEMENT')).toBe(
        't:podTimeline.findingReplacementDetail',
      );
      expect(detailOf('SPOT_FILLED')).toBe('t:podTimeline.spotFilledDetail');
      expect(detailOf('SPOT_NOT_FILLED')).toBe('t:podTimeline.spotNotFilledDetail');
      expect(detailOf('KEPT_SPOT')).toBe('t:podTimeline.keptSpotDetail');
      expect(detailOf('REFUND_NOT_ELIGIBLE')).toBe('t:podTimeline.refundNotEligibleDetail');
      expect(detailOf('REFUND_INITIATED')).toBe('t:podTimeline.refundInitiatedDetail');
      expect(detailOf('REFUND_PENDING')).toBe('t:podTimeline.refundPendingDetail');
      // "You did not attend" is a claim the system cannot make when nobody
      // scanned anyone; the unrecorded node has to say that instead.
      expect(detailOf('ATTENDANCE_NOT_RECORDED')).toBe(
        't:podTimeline.attendanceNotRecordedDetail',
      );
      expect(detailOf('NOT_ATTENDED')).toBe('t:podTimeline.notAttendedDetail');
    });
  });

  describe('CANCELLED_BY', () => {
    it('names who cancelled the pod, Duncit standing in for ADMIN', () => {
      for (const actor of ACTORS) {
        const copy = timelineCopy(node('CANCELLED_BY', { cancelledBy: actor }), marker);
        expect(copy.detail, actor).toBe(
          `t:podTimeline.cancelledByActorDetail`,
        );
      }
    });

    // The actor is substituted INTO the sentence, so the var name here and the
    // {actor} placeholder in the bundle have to agree — a drift leaves a
    // literal "{actor}" on the member's screen.
    it('substitutes the actor into the sentence under the name the bundle uses', () => {
      const t = catalogue({
        'podTimeline.cancelledByActorDetail': 'The pod was cancelled by {actor}.',
        'podTimeline.actorClubAdmin': 'the club admin',
        'podTimeline.cancelledByTitle': 'Cancelled By',
      });
      expect(timelineCopy(node('CANCELLED_BY', { cancelledBy: 'CLUB_ADMIN' }), t)).toEqual({
        title: 'Cancelled By',
        detail: 'The pod was cancelled by the club admin.',
        tone: 'bad',
      });
    });

    // Rows from before the actor was recorded still say the pod was cancelled,
    // just without inventing a name.
    it('falls back to the generic sentence when the actor is unknown', () => {
      expect(timelineCopy(node('CANCELLED_BY'), marker).detail).toBe(
        't:podTimeline.cancelledByDetail',
      );
    });
  });

  describe('BACKOUT_REQUESTED', () => {
    it('reads as a full backout when every seat was released', () => {
      const copy = timelineCopy(node('BACKOUT_REQUESTED', { seats: 4, seatsBefore: 4 }), marker);
      expect(copy.title).toBe('t:podTimeline.backoutRequestedTitle');
      expect(copy.detail).toBe('t:podTimeline.backoutRequestedDetail');
    });

    // "You backed out" is a lie when somebody gave up one seat of four and is
    // still going — the partial sentence is the only place that is visible.
    it('says how many seats were released and kept on a partial backout', () => {
      const t = catalogue({
        'podTimeline.partialBackoutTitle': 'Partial Backout Requested',
        'podTimeline.partialBackoutDetail':
          'You released {seats} of {before} seats and kept {kept}.',
      });
      const copy = timelineCopy(node('BACKOUT_REQUESTED', { seats: 1, seatsBefore: 4 }), t);
      expect(copy.title).toBe('Partial Backout Requested');
      expect(copy.detail).toBe('You released 1 of 4 seats and kept 3.');
    });

    it('interpolates the real counts rather than a fixed example', () => {
      const t = catalogue({
        'podTimeline.partialBackoutDetail':
          'You released {seats} of {before} seats and kept {kept}.',
      });
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seats: 2, seatsBefore: 5 }), t).detail).toBe(
        'You released 2 of 5 seats and kept 3.',
      );
    });

    it('keeps the warn tone on a partial backout', () => {
      expect(
        timelineCopy(node('BACKOUT_REQUESTED', { seats: 1, seatsBefore: 4 }), marker).tone,
      ).toBe('warn');
    });

    // Releasing nothing is not a partial backout, whatever the booking held.
    it('does not call a zero-seat release partial', () => {
      expect(
        timelineCopy(node('BACKOUT_REQUESTED', { seats: 0, seatsBefore: 4 }), marker).title,
      ).toBe('t:podTimeline.backoutRequestedTitle');
    });

    // Requests from before seat counts were recorded carry neither number;
    // they read as a plain backout rather than as "0 of 0 seats".
    it('reads as a plain backout when the seat counts are missing', () => {
      expect(timelineCopy(node('BACKOUT_REQUESTED'), marker).title).toBe(
        't:podTimeline.backoutRequestedTitle',
      );
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seats: 2 }), marker).title).toBe(
        't:podTimeline.backoutRequestedTitle',
      );
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seatsBefore: 4 }), marker).detail).toBe(
        't:podTimeline.backoutRequestedDetail',
      );
    });
  });
});
