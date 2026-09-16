import { describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCH_TARGET, launchProgress, showsWaitlist } from '../src/city-launch';

describe('DEFAULT_LAUNCH_TARGET', () => {
  it('is the 2000-person goal a city gets when an admin sets none', () => {
    expect(DEFAULT_LAUNCH_TARGET).toBe(2000);
  });
});

describe('launchProgress', () => {
  it('is the whole percent of the way to the target', () => {
    expect(launchProgress(1252, 2000)).toBe(63);
    expect(launchProgress(0, 2000)).toBe(0);
  });

  it('stops at 100 once the target is reached or passed', () => {
    expect(launchProgress(2000, 2000)).toBe(100);
    expect(launchProgress(2600, 2000)).toBe(100);
  });

  it('never goes below 0', () => {
    expect(launchProgress(-5, 2000)).toBe(0);
  });

  it('is 0 for a zero or negative target', () => {
    expect(launchProgress(40, 0)).toBe(0);
    expect(launchProgress(40, -1)).toBe(0);
  });
});

describe('showsWaitlist', () => {
  it('is true only for a city explicitly not launched', () => {
    expect(showsWaitlist({ is_launched: false })).toBe(true);
  });

  it('treats a launched city, and one from before the flag existed, as live', () => {
    expect(showsWaitlist({ is_launched: true })).toBe(false);
    expect(showsWaitlist({ is_launched: null })).toBe(false);
    expect(showsWaitlist({})).toBe(false);
  });
});
