import { describe, expect, it } from 'vitest';
import type { PodCancelActor, PodTimelineKind, PodTimelineNode } from '../src/pod-participation';
import { timelineCopy, type TimelineCopy } from '../src/pod-participation-copy';

/** A timeline node of one kind, with only the fields under test set deliberately. */
const node = (kind: PodTimelineKind, over: Partial<PodTimelineNode> = {}): PodTimelineNode => ({
  kind,
  state: 'done',
  ...over,
});

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

/** How each actor is named in the sentence. ADMIN reads as the brand, never "the admin". */
const ACTOR_NAME: Record<PodCancelActor, string> = {
  HOST: 'the host',
  VENUE: 'the venue',
  CLUB_ADMIN: 'the club admin',
  ADMIN: 'Duncit',
  SYSTEM: 'the system',
};

const ACTORS = Object.keys(ACTOR_NAME) as PodCancelActor[];

describe('timelineCopy', () => {
  describe('every kind', () => {
    // Each kind is its own step on the timeline: nothing may render blank, and
    // no two kinds may tell the same step — a shared title or sentence would
    // show one event twice and hide the other.
    it('answers every timeline kind with its own non-empty title and detail', () => {
      const titles = new Set<string>();
      const details = new Set<string>();
      for (const kind of KINDS) {
        const copy = timelineCopy(node(kind));
        expect(copy.title.trim().length, kind).toBeGreaterThan(0);
        expect(copy.detail.trim().length, kind).toBeGreaterThan(0);
        titles.add(copy.title);
        details.add(copy.detail);
      }
      expect(titles.size).toBe(KINDS.length);
      expect(details.size).toBe(KINDS.length);
    });

    it('colours each kind by its meaning — good outcomes, bad outcomes, warnings, and neutral facts', () => {
      for (const kind of KINDS) {
        expect(timelineCopy(node(kind)).tone, kind).toBe(TONE_BY_KIND[kind]);
      }
    });

    // The seat counts and the actor only mean something on their own kinds;
    // a JOINED node carrying them (a mis-built node) still reads as a join —
    // neither the actor sentence nor the partial-backout title may leak in.
    it('ignores seat counts and the actor on kinds that do not own them', () => {
      const decorated = timelineCopy(
        node('JOINED', { seats: 1, seatsBefore: 4, cancelledBy: 'HOST' }),
      );
      expect(decorated).toEqual({
        title: 'Pod Joined',
        detail: 'You have successfully joined the pod.',
        tone: 'good',
      });
    });

    // POD_CANCELLED is the parent node; the actor sentence belongs to its
    // CANCELLED_BY child only, so the parent must not repeat it.
    it('keeps the actor out of the POD_CANCELLED parent even when the node carries one', () => {
      expect(timelineCopy(node('POD_CANCELLED', { cancelledBy: 'VENUE' })).detail).toBe(
        'The pod has been cancelled.',
      );
    });
  });

  describe('policy sentences', () => {
    // The refund follows the SEAT, not the request — this sentence is where the
    // member learns that, so the wording is the rule.
    it('tells a member with a seat on sale that the refund follows once somebody takes it', () => {
      expect(timelineCopy(node('FINDING_REPLACEMENT')).detail).toBe(
        'Your seat is back on sale. The refund follows once somebody takes it.',
      );
    });

    // Flow 3 forks on whether somebody took the released seat; a kept spot
    // released nothing at all. Each end has to say which one happened.
    it('tells the three ends of a backout apart — seat taken, seat nobody took, spot kept', () => {
      expect(timelineCopy(node('SPOT_FILLED')).detail).toBe(
        'Your spot was filled by someone else.',
      );
      expect(timelineCopy(node('SPOT_NOT_FILLED')).detail).toBe(
        'Your spot could not be filled by anyone.',
      );
      expect(timelineCopy(node('KEPT_SPOT')).detail).toBe(
        'You reserved your spot back and stayed in the pod.',
      );
    });

    it('says a declined refund is a matter of policy, not of processing', () => {
      expect(timelineCopy(node('REFUND_NOT_ELIGIBLE')).detail).toBe(
        'Refund is not eligible as per policy.',
      );
    });

    it('distinguishes a refund that has left from one still with finance', () => {
      expect(timelineCopy(node('REFUND_INITIATED')).detail).toBe(
        'Refund has been initiated to your original payment method.',
      );
      expect(timelineCopy(node('REFUND_PENDING')).detail).toBe(
        'Your refund is with our finance team and has not left yet.',
      );
    });

    // "You did not attend" is a claim the system cannot make when nobody
    // scanned anyone; the unrecorded node has to say that instead.
    it('blames the missing scan, not the member, when attendance was never taken', () => {
      expect(timelineCopy(node('ATTENDANCE_NOT_RECORDED')).detail).toBe(
        'Nobody scanned tickets at this pod, so attendance was never taken.',
      );
      expect(timelineCopy(node('NOT_ATTENDED')).detail).toBe('You did not attend the pod.');
    });
  });

  describe('CANCELLED_BY', () => {
    it('names who cancelled the pod, Duncit standing in for ADMIN', () => {
      for (const actor of ACTORS) {
        expect(timelineCopy(node('CANCELLED_BY', { cancelledBy: actor })).detail, actor).toBe(
          `The pod was cancelled by ${ACTOR_NAME[actor]}.`,
        );
      }
    });

    // The actor fills in the sentence only; the row keeps the generic title
    // and the bad tone, and nothing else rides along.
    it('keeps the title and bad tone while only the sentence changes', () => {
      expect(timelineCopy(node('CANCELLED_BY', { cancelledBy: 'CLUB_ADMIN' }))).toEqual({
        title: 'Cancelled By',
        detail: 'The pod was cancelled by the club admin.',
        tone: 'bad',
      });
    });

    // Rows from before the actor was recorded still say the pod was cancelled,
    // just without inventing a name.
    it('falls back to the generic sentence when the actor is unknown', () => {
      expect(timelineCopy(node('CANCELLED_BY')).detail).toBe('The pod was cancelled.');
    });
  });

  describe('BACKOUT_REQUESTED', () => {
    it('reads as a full backout when every seat was released', () => {
      const copy = timelineCopy(node('BACKOUT_REQUESTED', { seats: 4, seatsBefore: 4 }));
      expect(copy.title).toBe('Pod Backout Requested');
      expect(copy.detail).toBe('You have requested to back out from the pod.');
    });

    // "You backed out" is a lie when somebody gave up one seat of four and is
    // still going — the partial sentence is the only place that is visible.
    it('says how many seats were released and kept on a partial backout', () => {
      const copy = timelineCopy(node('BACKOUT_REQUESTED', { seats: 1, seatsBefore: 4 }));
      expect(copy.title).toBe('Partial Backout Requested');
      expect(copy.detail).toBe('You released 1 of 4 seats and kept 3.');
    });

    it('interpolates the real counts rather than a fixed example', () => {
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seats: 2, seatsBefore: 5 })).detail).toBe(
        'You released 2 of 5 seats and kept 3.',
      );
    });

    it('keeps the warn tone on a partial backout', () => {
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seats: 1, seatsBefore: 4 })).tone).toBe(
        'warn',
      );
    });

    // Releasing nothing is not a partial backout, whatever the booking held.
    it('does not call a zero-seat release partial', () => {
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seats: 0, seatsBefore: 4 })).title).toBe(
        'Pod Backout Requested',
      );
    });

    // Requests from before seat counts were recorded carry neither number;
    // they read as a plain backout rather than as "0 of 0 seats".
    it('reads as a plain backout when the seat counts are missing', () => {
      expect(timelineCopy(node('BACKOUT_REQUESTED')).title).toBe('Pod Backout Requested');
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seats: 2 })).title).toBe(
        'Pod Backout Requested',
      );
      expect(timelineCopy(node('BACKOUT_REQUESTED', { seatsBefore: 4 })).detail).toBe(
        'You have requested to back out from the pod.',
      );
    });
  });
});
