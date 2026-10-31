import { resumeCreatePodStep } from '@duncit/utils';
import { blankCreatePodForm, hydrateDraft, type CreatePodFormValues } from './create-pod';

/** A stored form and the step it was left on — a draft, or a Host Again copy. */
interface StoredForm {
  payload: string;
  step?: number | null;
}

/**
 * What the stepper opens on: a resumed draft, else a Host Again copy, else a
 * fresh pod in the header's city with any Pod Request prefill laid over it. A
 * stored form whose city is gone opens in the header's city, since Where & when
 * can only move a pod that is in some city. A draft the old five-step stepper
 * saved opens on the step that now holds the screen it was left on.
 */
export function createPodSeed(
  stored: StoredForm | null,
  fresh: Partial<CreatePodFormValues>,
): { values: CreatePodFormValues; step: number } {
  if (stored) {
    const values = hydrateDraft(stored.payload);
    return {
      values: { ...values, location_id: values.location_id || (fresh.location_id ?? '') },
      step: resumeCreatePodStep(stored.step, stored.payload),
    };
  }
  return { values: { ...blankCreatePodForm, ...fresh }, step: 0 };
}
