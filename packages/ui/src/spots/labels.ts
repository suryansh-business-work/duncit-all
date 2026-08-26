import type { SpotsStepperLabels, SpotsTranslate } from './types';

/**
 * Every key is written out as a literal `t('…')` call rather than built from a
 * namespace + suffix — `scripts/verify-translation-keys.mjs` greps source for
 * the literal key, so a computed one reads as shipped-but-never-rendered and
 * fails the Shared Gates job. Same shape as @duncit/slots' buildSlotLabels.
 */

/** `mweb.createPod.*` — mWeb and the native app (rule 27: one namespace for both). */
export function mwebSpotsLabels(t: SpotsTranslate): SpotsStepperLabels {
  return {
    totalSpots: t('mweb.createPod.totalSpots'),
    hint: t('mweb.createPod.spotsHint'),
    fixedHint: t('mweb.createPod.spotsFixedHint'),
    increase: t('mweb.createPod.increaseSpots'),
    decrease: t('mweb.createPod.decreaseSpots'),
  };
}

/** `shell.createPod.*` — every MUI portal. */
export function shellSpotsLabels(t: SpotsTranslate): SpotsStepperLabels {
  return {
    totalSpots: t('shell.createPod.totalSpots'),
    hint: t('shell.createPod.spotsHint'),
    fixedHint: t('shell.createPod.spotsFixedHint'),
    increase: t('shell.createPod.increaseSpots'),
    decrease: t('shell.createPod.decreaseSpots'),
  };
}

/** Pick the namespace the calling surface ships. */
export function buildSpotsLabels(
  t: SpotsTranslate,
  namespace: 'mweb.createPod' | 'shell.createPod',
): SpotsStepperLabels {
  return namespace === 'mweb.createPod' ? mwebSpotsLabels(t) : shellSpotsLabels(t);
}
