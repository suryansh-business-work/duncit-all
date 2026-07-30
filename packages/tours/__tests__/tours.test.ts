import { describe, expect, it } from 'vitest';

import {
  HOME_TOUR_ID,
  TOURS,
  findTour,
  toursForRoles,
  isTourCompleted,
  markTourCompleted,
  readCompletedTours,
  serializeCompletedTours,
  shouldAutoStartHomeTour,
  tourStorageKey,
  type TourId,
} from '../src';

describe('TOURS registry', () => {
  it('ships every screen the tour centre lists, Home first', () => {
    expect(TOURS.map((t) => t.id)).toEqual([
      'home',
      'club',
      'pod-details',
      'create-pod',
      'profile',
      'booking',
    ]);
    expect(TOURS[0].id).toBe(HOME_TOUR_ID);
  });

  it('gives every tour a title, a route on both surfaces and at least one step', () => {
    for (const tour of TOURS) {
      expect(tour.title).not.toBe('');
      expect(tour.caption).not.toBe('');
      expect(tour.path.startsWith('/')).toBe(true);
      expect(tour.nativeRoute).not.toBe('');
      expect(tour.steps.length).toBeGreaterThan(0);
    }
  });

  it('gives every step a unique anchor and real copy', () => {
    const anchors = TOURS.flatMap((t) => t.steps.map((s) => s.anchor));
    expect(new Set(anchors).size).toBe(anchors.length);
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        expect(step.anchor).not.toBe('');
        expect(step.title).not.toBe('');
        expect(step.body.length).toBeGreaterThan(20);
      }
    }
  });

  it('covers the Home sections the brief calls out', () => {
    const home = findTour('home')!;
    expect(home.steps.map((s) => s.anchor)).toEqual([
      'home-pods',
      'home-clubs',
      'home-search',
      'home-categories',
      'home-filters',
      'home-notifications',
      'home-profile',
    ]);
  });

  // Navigating to a screen that needs params crashes on route.params being
  // undefined — PodDetails reads .podId off it. Every landing must open cold.
  it('lands every tour on a screen that opens with no params', () => {
    const needsParams = new Set(['PodDetails', 'ChatRoom', 'Checkout', 'PodPending', 'Policy']);
    for (const tour of TOURS) {
      expect(needsParams.has(tour.nativeRoute)).toBe(false);
    }
  });

  it('gates Create Pod behind the host role and leaves the rest open', () => {
    expect(findTour('create-pod')!.requiredRole).toBe('HOST');
    const gated = TOURS.filter((t) => t.requiredRole);
    expect(gated.map((t) => t.id)).toEqual(['create-pod']);
  });

  it('resolves a tour by id and shrugs off an unknown one', () => {
    expect(findTour('club')?.title).toBe('Club Page');
    expect(findTour('retired-tour')).toBeUndefined();
  });
});

describe('toursForRoles', () => {
  it('hides Create Pod from someone who cannot create a pod', () => {
    const ids = toursForRoles([]).map((t) => t.id);
    expect(ids).not.toContain('create-pod');
    expect(ids).toContain('home');
  });

  it('shows it to a host', () => {
    expect(toursForRoles(['HOST']).map((t) => t.id)).toContain('create-pod');
  });

  it('ignores unrelated roles', () => {
    expect(toursForRoles(['VENUE_OWNER']).map((t) => t.id)).not.toContain('create-pod');
  });
});

describe('completion state', () => {
  it('scopes the key to the user so a shared device does not leak state', () => {
    expect(tourStorageKey('u1')).toBe('duncit.tours.completed.u1');
    expect(tourStorageKey('u1')).not.toBe(tourStorageKey('u2'));
  });

  it('round-trips through storage', () => {
    const raw = serializeCompletedTours(['home', 'club']);
    expect(readCompletedTours(raw)).toEqual(['home', 'club']);
  });

  it('de-duplicates on write', () => {
    expect(readCompletedTours(serializeCompletedTours(['home', 'home']))).toEqual(['home']);
  });

  it.each([
    ['nothing stored', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['malformed JSON', '{oops'],
    ['a JSON object', '{"home":true}'],
  ])('reads %s as no tours completed rather than throwing', (_label, raw) => {
    expect(readCompletedTours(raw)).toEqual([]);
  });

  it('drops non-string entries from a tampered array', () => {
    expect(readCompletedTours('["home",1,null,"club"]')).toEqual(['home', 'club']);
  });

  it('marks a tour complete once and stays idempotent', () => {
    const once = markTourCompleted([], 'home');
    expect(once).toEqual(['home']);
    expect(markTourCompleted(once, 'home')).toEqual(['home']);
    expect(markTourCompleted(once, 'club')).toEqual(['home', 'club']);
  });

  it('does not mutate the list it is given', () => {
    const before: TourId[] = ['home'];
    markTourCompleted(before, 'club');
    expect(before).toEqual(['home']);
  });

  it('reports completion', () => {
    expect(isTourCompleted(['home'], 'home')).toBe(true);
    expect(isTourCompleted(['home'], 'club')).toBe(false);
  });
});

describe('shouldAutoStartHomeTour', () => {
  it('runs for a fresh signup who has never seen it', () => {
    expect(shouldAutoStartHomeTour([], true)).toBe(true);
  });

  it('does not run for a returning user', () => {
    expect(shouldAutoStartHomeTour([], false)).toBe(false);
  });

  // Skipping counts as shown — the brief says "once by default", and restarting
  // is always available from the Tour Guide centre.
  it('does not run again once the tour has been completed or skipped', () => {
    expect(shouldAutoStartHomeTour(['home'], true)).toBe(false);
  });
});
