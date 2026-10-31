/**
 * Create Pod's steps, shared by mWeb and the native app (rules 29 + 56):
 * What → Where & when → Money → Details.
 *
 * Every pod walks all four. A pod that sends its venue no offer — a virtual
 * pod, or one booking a slot it already holds (a Pod Request's, or one an older
 * draft carries) — simply shows no offer on Money, only its ticket.
 */

export const CREATE_POD_STEP_COUNT = 4;

/** "Where & when": the place, the club, the venue and the time (or a virtual pod's meeting). */
export const CREATE_POD_WHERE_STEP = 1;

/** "Money": the offer to the venue and the ticket. */
export const CREATE_POD_MONEY_STEP = 2;

/**
 * Written into every draft payload this stepper saves, as `stepper`. A payload
 * without it was saved by the five-step stepper, whose step numbers meant
 * other screens.
 */
export const CREATE_POD_STEPPER_VERSION = 2;

/** Where each five-step screen's fields now live: Location & Club → What,
 * Basics → Details, Venue & Slot → Where & when, Offer and Pricing → Money. */
const FIVE_STEP_TO_STEP = [0, 3, 1, 2, 2];

/** What decides whether the pod sends its venue an offer — the form's own fields. */
export interface CreatePodStepScope {
  pod_mode?: string | null;
  partner_request_id?: string | null;
  venue_slot_id?: string | null;
}

/** Whether the pod sends its venue an offer (and so shows one on Money). */
export const createPodSendsOffer = (scope: Readonly<CreatePodStepScope>): boolean =>
  scope.pod_mode === 'PHYSICAL' && !scope.partner_request_id && !scope.venue_slot_id;

const wholeStep = (step: number | null | undefined) => Math.floor(Number(step)) || 0;

/** `step` held to the steps that exist. */
export const clampCreatePodStep = (step: number | null | undefined): number =>
  Math.min(Math.max(0, wholeStep(step)), CREATE_POD_STEP_COUNT - 1);

const payloadStepper = (payload: string | null | undefined): unknown => {
  try {
    return (JSON.parse(payload ?? '') as { stepper?: unknown } | null)?.stepper;
  } catch {
    return undefined;
  }
};

/**
 * The step a stored draft reopens on. A draft this stepper saved names its own
 * step; one the five-step stepper saved opens on the step that now holds the
 * screen it was left on, so a host is never sent back past what they filled.
 */
export function resumeCreatePodStep(step: number | null | undefined, payload: string | null | undefined): number {
  if (payloadStepper(payload) === CREATE_POD_STEPPER_VERSION) return clampCreatePodStep(step);
  const fiveStep = Math.min(Math.max(0, wholeStep(step)), FIVE_STEP_TO_STEP.length - 1);
  return FIVE_STEP_TO_STEP[fiveStep] ?? 0;
}
