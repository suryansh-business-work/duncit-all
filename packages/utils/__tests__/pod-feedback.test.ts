import { describe, expect, it } from 'vitest';
import {
  POD_FEEDBACK_ASPECTS,
  POD_FEEDBACK_ASPECT_KEY,
  POD_FEEDBACK_ASPECT_LABEL,
  buildPodFeedbackInput,
  canSubmitPodFeedback,
  orderedAspects,
  podFeedbackLink,
  podFeedbackPath,
  scoresFromMyFeedback,
  type MyPodFeedback,
  type PodFeedbackAspect,
} from '../src/pod-feedback';

/** A rating the guest already left, as the server returns it. */
const mine = (over: Partial<MyPodFeedback> = {}): MyPodFeedback => ({
  rating: 4,
  ratings: [],
  message: '',
  ...over,
});

describe('POD_FEEDBACK_ASPECTS', () => {
  it('asks OVERALL first — it is the only required question', () => {
    expect(POD_FEEDBACK_ASPECTS[0]).toBe('OVERALL');
  });

  it('lists every aspect exactly once, in the asking order both surfaces share', () => {
    expect(POD_FEEDBACK_ASPECTS).toEqual([
      'OVERALL',
      'HOST',
      'VENUE',
      'CLUB_ADMIN',
      'SAFETY',
      'FOOD',
      'OTHER',
    ]);
    expect(new Set(POD_FEEDBACK_ASPECTS).size).toBe(POD_FEEDBACK_ASPECTS.length);
  });
});

describe('POD_FEEDBACK_ASPECT_KEY', () => {
  it('keys each aspect to its own mweb.podFeedback.* entry, spelled exactly as the bundle ships it', () => {
    // Keys, not copy (rule 38): the i18n bundle carries these exact names, so
    // a misspelt key renders a blank row and a swapped one (HOST under
    // aspectVenue) asks the wrong question — distinct-and-well-formed alone
    // would let both through. No entry exists for an aspect the form never asks.
    expect(POD_FEEDBACK_ASPECT_KEY).toEqual({
      OVERALL: 'mweb.podFeedback.aspectOverall',
      HOST: 'mweb.podFeedback.aspectHost',
      VENUE: 'mweb.podFeedback.aspectVenue',
      CLUB_ADMIN: 'mweb.podFeedback.aspectClubAdmin',
      SAFETY: 'mweb.podFeedback.aspectSafety',
      FOOD: 'mweb.podFeedback.aspectFood',
      OTHER: 'mweb.podFeedback.aspectOther',
    });
  });
});

describe('POD_FEEDBACK_ASPECT_LABEL', () => {
  it('labels each aspect with its own plain-English name for the admin portals', () => {
    // A portal reads a rating back next to this label: a swapped pair (HOST
    // shown as "Venue") misreports who the guest scored, which a
    // distinct-and-non-empty check would not catch.
    expect(POD_FEEDBACK_ASPECT_LABEL).toEqual({
      OVERALL: 'Overall',
      HOST: 'Host',
      VENUE: 'Venue',
      CLUB_ADMIN: 'Club admin',
      SAFETY: 'Safety',
      FOOD: 'Food',
      OTHER: 'Other',
    });
  });

  it('spells the club admin label the one way the portals must all share', () => {
    // The whole reason this map exists: stop a fourth spelling of "Club admin".
    expect(POD_FEEDBACK_ASPECT_LABEL.CLUB_ADMIN).toBe('Club admin');
  });
});

describe('orderedAspects', () => {
  it('keeps the asking order no matter how the server ordered them', () => {
    expect(orderedAspects(['FOOD', 'HOST', 'OVERALL', 'VENUE'])).toEqual([
      'OVERALL',
      'HOST',
      'VENUE',
      'FOOD',
    ]);
  });

  it('always includes OVERALL even when the server left it out', () => {
    // A form with nothing required could never be submitted at all.
    expect(orderedAspects(['SAFETY'])).toEqual(['OVERALL', 'SAFETY']);
  });

  it('asks only OVERALL when the server sent nothing', () => {
    expect(orderedAspects([])).toEqual(['OVERALL']);
    expect(orderedAspects(null)).toEqual(['OVERALL']);
    expect(orderedAspects(undefined)).toEqual(['OVERALL']);
  });

  it('drops an aspect name this build does not know', () => {
    // A new aspect released server-first must not render as a blank row.
    expect(orderedAspects(['HOST', 'PARKING', 'food'])).toEqual(['OVERALL', 'HOST']);
  });

  it('collapses duplicates into a single question', () => {
    expect(orderedAspects(['HOST', 'HOST', 'OVERALL', 'OVERALL'])).toEqual(['OVERALL', 'HOST']);
  });

  it('asks everything, in order, when the server names every aspect', () => {
    expect(orderedAspects([...POD_FEEDBACK_ASPECTS].reverse())).toEqual([...POD_FEEDBACK_ASPECTS]);
  });
});

describe('canSubmitPodFeedback', () => {
  it('allows submission once the overall score is set', () => {
    expect(canSubmitPodFeedback({ OVERALL: 1 })).toBe(true);
    expect(canSubmitPodFeedback({ OVERALL: 5 })).toBe(true);
  });

  it('blocks submission while the overall score is missing or zero', () => {
    expect(canSubmitPodFeedback({})).toBe(false);
    expect(canSubmitPodFeedback({ OVERALL: 0 })).toBe(false);
  });

  it('does not let the optional aspects stand in for the required one', () => {
    // Every other star is optional; only OVERALL unlocks the button.
    expect(canSubmitPodFeedback({ HOST: 5, VENUE: 5, FOOD: 5 })).toBe(false);
  });
});

describe('podFeedbackPath', () => {
  it('routes to the feedback page scoped to the given pod', () => {
    // The pod id sits between the route's fixed halves, so the mWeb route and
    // the native deep link resolve the same pod from the same string.
    expect(podFeedbackPath('pod-123')).toBe('/pod/pod-123/feedback');
    expect(podFeedbackPath('64f0c2a1b7e3')).toBe('/pod/64f0c2a1b7e3/feedback');
  });
});

describe('podFeedbackLink', () => {
  it('is the pod path appended verbatim to whichever origin the surface runs on', () => {
    // One URL shape for the route, the deep link and the message a host sends;
    // the origin is the caller's (prod, staging), never baked in here.
    expect(podFeedbackLink('pod-123', 'https://mweb.duncit.com')).toBe(
      'https://mweb.duncit.com/pod/pod-123/feedback',
    );
    expect(podFeedbackLink('pod-9', 'https://staging.mweb.duncit.com')).toBe(
      'https://staging.mweb.duncit.com/pod/pod-9/feedback',
    );
  });
});

describe('scoresFromMyFeedback', () => {
  it('renders a blank form when the guest has not rated yet', () => {
    expect(scoresFromMyFeedback(null)).toEqual({});
    expect(scoresFromMyFeedback(undefined)).toEqual({});
  });

  it('puts the stored overall rating back under OVERALL', () => {
    expect(scoresFromMyFeedback(mine({ rating: 3 }))).toEqual({ OVERALL: 3 });
  });

  it('restores each per-aspect star the guest left', () => {
    expect(
      scoresFromMyFeedback(
        mine({
          rating: 5,
          ratings: [
            { aspect: 'HOST', rating: 4 },
            { aspect: 'FOOD', rating: 2 },
          ],
        }),
      ),
    ).toEqual({ OVERALL: 5, HOST: 4, FOOD: 2 });
  });

  it('ignores a stored aspect this build no longer knows', () => {
    expect(
      scoresFromMyFeedback(mine({ rating: 5, ratings: [{ aspect: 'PARKING', rating: 1 }] })),
    ).toEqual({ OVERALL: 5 });
  });

  it('leaves an aspect the guest never scored absent rather than zero', () => {
    const scores = scoresFromMyFeedback(mine({ rating: 5, ratings: [{ aspect: 'HOST', rating: 4 }] }));
    expect('VENUE' in scores).toBe(false);
    expect(canSubmitPodFeedback(scores)).toBe(true);
  });
});

describe('buildPodFeedbackInput', () => {
  const aspects: readonly PodFeedbackAspect[] = ['OVERALL', 'HOST', 'VENUE', 'FOOD'];

  it('sends OVERALL on `rating` and the other aspects as the list', () => {
    expect(
      buildPodFeedbackInput({
        podId: 'pod-1',
        scores: { OVERALL: 5, HOST: 4, VENUE: 3, FOOD: 2 },
        message: 'Lovely evening',
        aspects,
      }),
    ).toEqual({
      pod_id: 'pod-1',
      rating: 5,
      message: 'Lovely evening',
      ratings: [
        { aspect: 'HOST', rating: 4 },
        { aspect: 'VENUE', rating: 3 },
        { aspect: 'FOOD', rating: 2 },
      ],
    });
  });

  it('never repeats OVERALL inside the list', () => {
    const input = buildPodFeedbackInput({
      podId: 'pod-1',
      scores: { OVERALL: 5 },
      message: '',
      aspects: ['OVERALL'],
    });
    expect(input.rating).toBe(5);
    expect(input.ratings).toEqual([]);
  });

  it('omits an aspect the guest left alone instead of sending a zero', () => {
    const input = buildPodFeedbackInput({
      podId: 'pod-1',
      scores: { OVERALL: 5, HOST: 4, VENUE: 0 },
      message: '',
      aspects,
    });
    expect(input.ratings).toEqual([{ aspect: 'HOST', rating: 4 }]);
  });

  it('only sends aspects the server asked for, even if a stray score exists', () => {
    // A score for an aspect this pod does not have would be rejected server-side.
    const input = buildPodFeedbackInput({
      podId: 'pod-1',
      scores: { OVERALL: 5, HOST: 4, SAFETY: 5 },
      message: '',
      aspects: ['OVERALL', 'HOST'],
    });
    expect(input.ratings).toEqual([{ aspect: 'HOST', rating: 4 }]);
  });

  it('sends the aspects in the asking order it was given', () => {
    const input = buildPodFeedbackInput({
      podId: 'pod-1',
      scores: { OVERALL: 5, FOOD: 1, HOST: 2 },
      message: '',
      aspects: ['OVERALL', 'FOOD', 'HOST'],
    });
    expect(input.ratings.map((r) => r.aspect)).toEqual(['FOOD', 'HOST']);
  });

  it('sends a zero overall when none was scored, which canSubmitPodFeedback is meant to prevent', () => {
    const input = buildPodFeedbackInput({ podId: 'pod-1', scores: {}, message: '', aspects });
    expect(input.rating).toBe(0);
    expect(input.ratings).toEqual([]);
  });

  it('trims the message and sends null rather than an empty string', () => {
    const trimmed = buildPodFeedbackInput({
      podId: 'pod-1',
      scores: { OVERALL: 5 },
      message: '  great   ',
      aspects,
    });
    expect(trimmed.message).toBe('great');

    const blank = buildPodFeedbackInput({
      podId: 'pod-1',
      scores: { OVERALL: 5 },
      message: '   ',
      aspects,
    });
    expect(blank.message).toBeNull();
  });
});
