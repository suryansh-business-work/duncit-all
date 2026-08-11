import { tourStepCount, visibleTourSteps } from '@/tours/visibleSteps';

describe('visibleTourSteps', () => {
  it('keeps registry order, whatever order the anchors mounted in', () => {
    const steps = visibleTourSteps('home', ['home-profile', 'home-pods', 'home-clubs']);
    expect(steps.map((s) => s.anchor)).toEqual(['home-pods', 'home-clubs', 'home-profile']);
  });

  // A screen legitimately varies — no clubs yet means no clubs section — and a
  // step with nothing to spotlight would draw an empty hole.
  it('drops steps whose element is not on screen', () => {
    expect(visibleTourSteps('home', ['home-pods'])).toHaveLength(1);
    expect(visibleTourSteps('home', [])).toEqual([]);
  });

  it('is empty for no tour and for an id no longer in the registry', () => {
    expect(visibleTourSteps(null, ['home-pods'])).toEqual([]);
    expect(visibleTourSteps('retired-tour', ['home-pods'])).toEqual([]);
  });
});

describe('tourStepCount', () => {
  it('counts a tour’s steps, and answers 0 for one that is gone', () => {
    expect(tourStepCount('home')).toBe(7);
    expect(tourStepCount('retired-tour')).toBe(0);
    expect(tourStepCount(null)).toBe(0);
  });
});
