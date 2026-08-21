import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  parseApiError,
  podContentViolationsOf,
  podModerationFormField,
  type PodContentViolation,
} from '@duncit/utils';
import { MODERATE_POD_CONTENT } from './queries';

/** The fields a host-facing pod form can pin an inline violation on. Both the
 * edit and the resubmit form carry exactly these three. */
const EDITABLE = new Set<string>(['pod_title', 'pod_description', 'media_text']);

/** Narrow view of RHF's `setError`, so this hook needs no generic form type. */
type SetFieldError = (field: any, error: { type: string; message: string }) => void;

/**
 * Check the content, then write — the one gate every host-facing pod write
 * goes through.
 *
 * A pod is screened when it is published, and used to be screened only then:
 * an edit could rename a clean pod into a dirty one and nothing looked again.
 * `run` closes that by putting the same deep check (rules + GPT-4o over the
 * text AND the gallery) in front of the mutation, pinning whatever it refuses
 * on the field that carries it.
 */
export function useContentCheck(setFieldError: SetFieldError) {
  const [moderate, moderateState] = useMutation(MODERATE_POD_CONTENT);
  const [blocked, setBlocked] = useState<PodContentViolation[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const applyViolations = (violations: PodContentViolation[]) => {
    setBlocked(violations);
    for (const violation of violations) {
      const field = podModerationFormField(violation.field);
      if (EDITABLE.has(field)) {
        setFieldError(field, { type: 'moderation', message: violation.message });
      }
    }
  };

  const clear = () => {
    setBlocked([]);
    setFailure(null);
  };

  /** Screens `input`, then runs `write` when it is clean. False = not written. */
  const run = async (input: unknown, write: () => Promise<unknown>): Promise<boolean> => {
    clear();
    try {
      const checked = await moderate({ variables: { input } });
      const result = checked.data?.moderatePodContent;
      if (result && !result.allowed) {
        applyViolations(result.violations);
        return false;
      }
      await write();
      return true;
    } catch (err) {
      // The server re-runs the deterministic rules as it writes, so a refusal
      // can still land here — a stale tab, or a rule the preflight did not hit.
      const violations = podContentViolationsOf(err);
      if (violations.length > 0) applyViolations(violations);
      else setFailure(parseApiError(err));
      return false;
    }
  };

  return { run, clear, blocked, failure, checking: moderateState.loading };
}
