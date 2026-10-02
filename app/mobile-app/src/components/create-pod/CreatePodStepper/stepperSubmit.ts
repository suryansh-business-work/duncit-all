import {
  MODERATION_FIELD_MAP,
  STEP_TITLE_KEYS,
  buildCreatePodInput,
  buildModerationInput,
  stepForField,
} from '../create-pod.form';
import type { CreatePodFormValues, PodModerationViolation } from '../create-pod.types';
import type { BlockedViolation } from '../ModerationBlockedDialog';
import type { CreatePodStepperProps } from './types';
import type { CreatePodFormState } from './useCreatePodForm';

type StepperSubmitArgs = Pick<CreatePodStepperProps, 'clubAdmin' | 'onModerate' | 'onPublish'> & {
  state: CreatePodFormState;
};

/** The stepper's end-of-flow handlers: moderation preflight, publish, the Club
 * Admin's draft save and the jump back to a flagged step. */
export function buildStepperSubmit({ clubAdmin, onModerate, onPublish, state }: StepperSubmitArgs) {
  const { t, form, step, setStep, setBusy, setError, setBlocked, hosts, persist } = state;

  // Map each flagged violation to its form field + step, set an inline error, and
  // jump to the first offending step so the host can fix it.
  const applyModeration = (violations: PodModerationViolation[]) => {
    const mapped = violations.map((violation, index) => {
      const formField = MODERATION_FIELD_MAP[violation.field] ?? 'pod_title';
      const stepIndex = stepForField(formField);
      form.setError(formField, { type: 'moderation', message: violation.message });
      return {
        id: `${violation.field}-${violation.type}-${index}`,
        message: violation.message,
        type: violation.type,
        stepIndex,
        // stepIndex is always an in-range STEP_TITLE_KEYS index (the cast narrows the type).
        stepTitle: t(STEP_TITLE_KEYS[stepIndex] as string),
      };
    });
    setBlocked(mapped);
    // applyModeration only runs when there is ≥1 violation, so mapped[0] is present.
    setStep((mapped[0] as BlockedViolation).stepIndex);
  };

  // The one write at the end of the stepper: the club-admin mutation with the
  // assigned hosts, or the host's draft persisted and published.
  const publishValues = async (values: CreatePodFormValues) => {
    if (clubAdmin) {
      await clubAdmin.submit(
        buildCreatePodInput(values),
        hosts.map((host) => host.user_id),
      );
      return;
    }
    const id = await persist(step);
    await onPublish(id, buildCreatePodInput(values));
  };

  /**
   * The Club Admin's "Save draft": the pod is written inactive and nothing is
   * published, so the AI content check is skipped — the portals skip it too,
   * and the server still refuses content that breaks the rules.
   */
  const saveDraft = form.handleSubmit(async (values) => {
    if (!clubAdmin) return;
    setBusy(true);
    setError('');
    try {
      await clubAdmin.submit(
        buildCreatePodInput(values),
        hosts.map((host) => host.user_id),
        { draft: true },
      );
    } catch (e: unknown) {
      setError((e as Error)?.message ?? '');
    } finally {
      setBusy(false);
    }
  });

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError('');
    try {
      const moderation = await onModerate(buildModerationInput(values));
      if (!moderation.allowed) {
        applyModeration(moderation.violations);
        return;
      }
      await publishValues(values);
    } catch (e) {
      // Two pods may share a title — the server gives the second one a link of
      // its own — so nothing here is the title's fault any more. Whatever did
      // fail is shown as written, not pinned to a field it may not belong to.
      setError(e instanceof Error ? e.message : t('mweb.createPod.createFailed'));
    } finally {
      setBusy(false);
    }
  });

  const jumpToStep = (target: number) => {
    setBlocked([]);
    setStep(target);
  };

  return { saveDraft, submit, jumpToStep };
}
