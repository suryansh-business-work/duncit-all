import { CREATE_POD_STEPPER_VERSION } from '@duncit/utils';
import { blankCreatePodForm, type CreatePodFormValues } from './create-pod.types';

/** Serialises the live form state for a server draft (Dates -> ISO strings).
 * `stepper` says which stepper's numbers `step` uses (resumeCreatePodStep). */
export function serializeDraft(values: CreatePodFormValues, step: number) {
  return {
    payload: JSON.stringify({ ...values, stepper: CREATE_POD_STEPPER_VERSION }),
    pod_title: values.pod_title.trim(),
    pod_mode: values.pod_mode,
    step,
  };
}

/** Maps a stored pod type onto the two creation values — old drafts may
 * carry retired values that creation no longer accepts. */
const normalizePodType = (podType: string | undefined) => {
  if (!podType) return blankCreatePodForm.pod_type;
  return podType.includes('FREE') ? 'FREE' : 'PAID';
};

/** Rebuilds form values from a stored draft payload, reviving Date fields. */
export function hydrateDraft(payload: string): CreatePodFormValues {
  try {
    const parsed = JSON.parse(payload) as Partial<CreatePodFormValues>;
    return {
      ...blankCreatePodForm,
      ...parsed,
      pod_type: normalizePodType(parsed.pod_type),
      pod_date_time: parsed.pod_date_time ? new Date(parsed.pod_date_time) : null,
      pod_end_date_time: parsed.pod_end_date_time ? new Date(parsed.pod_end_date_time) : null,
    };
  } catch {
    return blankCreatePodForm;
  }
}
