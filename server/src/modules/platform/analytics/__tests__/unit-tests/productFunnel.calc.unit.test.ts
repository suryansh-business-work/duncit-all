import { computeFunnel, firstBetween, journeyOf } from '../../product/product.funnel.calc';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const FROM = Date.parse('2026-10-01T00:00:00Z');
const TO = Date.parse('2026-10-08T00:00:00Z');
const at = (hours: number) => FROM + hours * HOUR;

describe('firstBetween', () => {
  it('answers the earliest time inside the bounds, inclusive at both ends', () => {
    expect(firstBetween([5, 10, 15], 10, 20)).toBe(10);
    expect(firstBetween([5, 10, 15], 11, 15)).toBe(15);
  });

  it('answers null when every time is before, after or between the bounds', () => {
    expect(firstBetween([5, 10], 11, 20)).toBeNull();
    expect(firstBetween([25, 30], 0, 20)).toBeNull();
    expect(firstBetween([], 0, 20)).toBeNull();
  });
});

describe('journeyOf', () => {
  it('enters at the first step-1 event inside the period and follows each next step in order', () => {
    const steps = [[at(1), at(5)], [at(2), at(6)], [at(3)]];
    expect(journeyOf(steps, FROM, TO, 7 * DAY)).toEqual([at(1), at(2), at(3)]);
  });

  it('ignores a step-1 event before the period, entering at the first one inside it', () => {
    const steps = [[FROM - HOUR, at(4)], [at(1), at(5)]];
    expect(journeyOf(steps, FROM, TO, 7 * DAY)).toEqual([at(4), at(5)]);
  });

  it('does not enter a person whose step 1 is outside the period', () => {
    expect(journeyOf([[TO + HOUR], [TO + 2 * HOUR]], FROM, TO, 7 * DAY)).toEqual([]);
    expect(journeyOf([[], [at(1)]], FROM, TO, 7 * DAY)).toEqual([]);
  });

  it('stops at a step done only before the step before it — order matters', () => {
    // Paid at hour 1, viewed the pod at hour 2: never "viewed, then paid".
    const steps = [[at(2)], [at(1)]];
    expect(journeyOf(steps, FROM, TO, 7 * DAY)).toEqual([at(2)]);
  });

  it('counts a next step at the same moment as the step before (a server outcome stamped with its click)', () => {
    expect(journeyOf([[at(1)], [at(1)]], FROM, TO, DAY)).toEqual([at(1), at(1)]);
  });

  it('stops at a step reached after the conversion window, measured from entry', () => {
    const steps = [[at(0)], [at(10)], [at(30)]];
    expect(journeyOf(steps, FROM, TO, DAY)).toEqual([at(0), at(10)]);
  });

  it('lets a person who entered on the last day finish after the period ends', () => {
    const steps = [[TO - HOUR], [TO + HOUR]];
    expect(journeyOf(steps, FROM, TO, DAY)).toEqual([TO - HOUR, TO + HOUR]);
  });
});

describe('computeFunnel', () => {
  it('counts each step, the conversion from the step before and from the start, the drop-off and the typical time', () => {
    const people = [
      [[at(0)], [at(1)], [at(3)]], // finished: 1 h, then 2 h
      [[at(0)], [at(3)], []], // stopped at step 2: 3 h
      [[at(0)], [], []], // stopped at step 1
      [[at(0)], [at(5)], [at(6)]], // finished: 5 h, then 1 h
    ];
    const result = computeFunnel(people, 3, { from: FROM, to: TO }, 7 * DAY);
    expect(result.map((step) => step.entered)).toEqual([4, 3, 2]);
    expect(result[0]).toMatchObject({ conversion_from_previous: null, conversion_from_start: 100, dropped: 0, median_ms_from_previous: null });
    expect(result[1]).toMatchObject({ conversion_from_previous: 75, conversion_from_start: 75, dropped: 1, median_ms_from_previous: 3 * HOUR });
    // Gaps of 2 h and 1 h: the median of an even list is the mean of the middle two.
    expect(result[2]).toMatchObject({ conversion_from_previous: 66.7, conversion_from_start: 50, dropped: 1, median_ms_from_previous: 1.5 * HOUR });
  });

  it('reads an empty funnel as zeros, with no rate rather than a division by zero', () => {
    const result = computeFunnel([], 2, { from: FROM, to: TO }, DAY);
    expect(result).toEqual([
      { entered: 0, conversion_from_previous: null, conversion_from_start: null, dropped: 0, median_ms_from_previous: null },
      { entered: 0, conversion_from_previous: null, conversion_from_start: null, dropped: 0, median_ms_from_previous: null },
    ]);
  });
});
