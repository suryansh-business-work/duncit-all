import { blankCreatePodForm, hydrateDraft, STEP_TITLES, type CreatePodFormValues } from './create-pod';

/** A stored form and the step it was left on — a draft, or a Host Again copy. */
interface StoredForm {
  payload: string;
  step?: number | null;
}

const clampStep = (step: number | null | undefined) => Math.min(Math.max(step ?? 0, 0), STEP_TITLES.length - 1);

/**
 * What the stepper opens on: a resumed draft, else a Host Again copy, else a
 * fresh pod in the header's city with any Pod Request prefill laid over it. A
 * stored form whose city is gone opens in the header's city, since step 1 can
 * only move a pod that is in some city.
 */
export function createPodSeed(
  stored: StoredForm | null,
  fresh: Partial<CreatePodFormValues>,
): { values: CreatePodFormValues; step: number } {
  if (stored) {
    const values = hydrateDraft(stored.payload);
    return {
      values: { ...values, location_id: values.location_id || (fresh.location_id ?? '') },
      step: clampStep(stored.step),
    };
  }
  return { values: { ...blankCreatePodForm, ...fresh }, step: 0 };
}
