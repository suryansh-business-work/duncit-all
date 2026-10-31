/**
 * Create Pod's steps, shared by mWeb and the native app (rules 29 + 56):
 * Category/Locality/Club → Basics → Venue & Slot → Offer for Venue → Pricing.
 *
 * The offer step shows only for a pod that sends its venue an offer — a
 * physical pod that is not booking a slot it already holds (a Pod Request's,
 * or one an older draft carries) — so a virtual pod walks four steps. Step
 * numbers stay the five-step ones everywhere (drafts, the field → step map);
 * only the walk and the progress bar pass over a step that is not shown.
 */

export const CREATE_POD_STEP_COUNT = 5;

/** The "Offer for Venue" step's number. */
export const CREATE_POD_OFFER_STEP = 3;

/** What decides whether the offer step shows — the form's own fields. */
export interface CreatePodStepScope {
  pod_mode?: string | null;
  partner_request_id?: string | null;
  venue_slot_id?: string | null;
}

/** Whether the pod sends its venue an offer (and so walks the offer step). */
export const createPodSendsOffer = (scope: Readonly<CreatePodStepScope>): boolean =>
  scope.pod_mode === 'PHYSICAL' && !scope.partner_request_id && !scope.venue_slot_id;

export const createPodStepShown = (step: number, scope: Readonly<CreatePodStepScope>): boolean =>
  step !== CREATE_POD_OFFER_STEP || createPodSendsOffer(scope);

/** The shown step `direction` away from `step`, or `step` itself at either end. */
export function adjacentCreatePodStep(step: number, direction: 1 | -1, scope: Readonly<CreatePodStepScope>): number {
  for (let next = step + direction; next >= 0 && next < CREATE_POD_STEP_COUNT; next += direction) {
    if (createPodStepShown(next, scope)) return next;
  }
  return step;
}

/** Where a draft or a jump lands: the step itself, or the next shown one after it. */
export function shownCreatePodStep(step: number, scope: Readonly<CreatePodStepScope>): number {
  const clamped = Math.min(Math.max(0, Math.floor(step) || 0), CREATE_POD_STEP_COUNT - 1);
  return createPodStepShown(clamped, scope) ? clamped : adjacentCreatePodStep(clamped, 1, scope);
}

/** The shown steps' numbers, in order — one progress pill each. */
export const shownCreatePodSteps = (scope: Readonly<CreatePodStepScope>): number[] =>
  Array.from({ length: CREATE_POD_STEP_COUNT }, (_, step) => step).filter((step) => createPodStepShown(step, scope));
