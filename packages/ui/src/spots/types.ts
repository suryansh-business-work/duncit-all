/**
 * The words the spots control renders, supplied by the calling surface.
 *
 * The control itself ships no copy: mWeb's Create-a-Pod stepper already has
 * `mweb.createPod.*` translated in every locale, and moving those keys into
 * this package's namespace would throw that away. Each surface hands over its
 * own namespace's words instead (rule 38), and the component stays one copy
 * (rule 40).
 */
export interface SpotsStepperLabels {
  /** Field heading — "Total spots". */
  totalSpots: string;
  /** Caption under the heading on the plain stepper. */
  hint: string;
  /** Caption when the capacity is fixed and cannot be chosen. */
  fixedHint: string;
  increase: string;
  decrease: string;
}

/** A surface's translator, as these builders need it. */
export type SpotsTranslate = (
  key: string,
  options?: { count?: number; vars?: Record<string, string | number> },
) => string;
