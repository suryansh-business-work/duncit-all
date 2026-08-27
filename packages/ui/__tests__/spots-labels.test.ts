import { describe, it, expect, vi } from 'vitest';
import { buildSpotsLabels, mwebSpotsLabels, shellSpotsLabels } from '../src/spots';
import type { SpotsTranslate } from '../src/spots';

const t: SpotsTranslate = (key) => `[${key}]`;

describe('mwebSpotsLabels', () => {
  it('reads every label from the mweb.createPod namespace', () => {
    expect(mwebSpotsLabels(t)).toEqual({
      totalSpots: '[mweb.createPod.totalSpots]',
      hint: '[mweb.createPod.spotsHint]',
      fixedHint: '[mweb.createPod.spotsFixedHint]',
      increase: '[mweb.createPod.increaseSpots]',
      decrease: '[mweb.createPod.decreaseSpots]',
    });
  });
});

describe('shellSpotsLabels', () => {
  it('reads every label from the shell.createPod namespace', () => {
    expect(shellSpotsLabels(t)).toEqual({
      totalSpots: '[shell.createPod.totalSpots]',
      hint: '[shell.createPod.spotsHint]',
      fixedHint: '[shell.createPod.spotsFixedHint]',
      increase: '[shell.createPod.increaseSpots]',
      decrease: '[shell.createPod.decreaseSpots]',
    });
  });
});

describe('buildSpotsLabels', () => {
  it('picks the mweb namespace for mweb.createPod', () => {
    expect(buildSpotsLabels(t, 'mweb.createPod')).toEqual(mwebSpotsLabels(t));
  });

  it('picks the shell namespace for shell.createPod', () => {
    expect(buildSpotsLabels(t, 'shell.createPod')).toEqual(shellSpotsLabels(t));
  });

  it('calls the surface translator once per label', () => {
    const spy = vi.fn((key: string) => key);
    buildSpotsLabels(spy, 'shell.createPod');
    expect(spy).toHaveBeenCalledTimes(5);
  });
});
