import { useState } from 'react';
import type { UseFormSetError } from 'react-hook-form';
import {
  podContentViolationsOf,
  podModerationFormField,
  type PodContentViolation,
} from '@duncit/utils';

import { ModeratePodContentDocument } from '@/graphql/create-pod';
import { HostUpdatePodDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import {
  buildHostUpdateInput,
  buildPodEditModerationInput,
  type PodEditValues,
} from './pod-edit.form';

/** The form fields the edit sheet can pin an inline error on. */
const EDITABLE = new Set<string>(['pod_title', 'pod_description', 'media_text']);

/**
 * Check-then-save for the host's pod edit — the mWeb twin's submit handler
 * (`PodEditDialog` in @duncit/host-pod-actions), as a hook so the Tamagui sheet
 * stays pure layout.
 *
 * The AI content check runs BEFORE the write, exactly as it does when the pod
 * is first published: renaming a clean pod into a dirty one is the same act as
 * publishing a dirty one, and used to be the way past the guidelines.
 */
export function usePodEditSave(
  podId: string | undefined,
  setFieldError: UseFormSetError<PodEditValues>,
  onSaved: () => void,
  /** True once the server's spot range has landed — see buildHostUpdateInput. */
  includeSpots = false,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<PodContentViolation[]>([]);

  const applyViolations = (violations: PodContentViolation[]) => {
    setBlocked(violations);
    for (const violation of violations) {
      const field = podModerationFormField(violation.field);
      if (EDITABLE.has(field)) {
        setFieldError(field as keyof PodEditValues, {
          type: 'moderation',
          message: violation.message,
        });
      }
    }
  };

  const clear = () => {
    setError(null);
    setBlocked([]);
  };

  const save = async (values: PodEditValues) => {
    /* istanbul ignore next -- the sheet only mounts with a pod */
    if (!podId) return;
    setBusy(true);
    clear();
    try {
      const checked = await graphqlRequest(
        ModeratePodContentDocument,
        { input: buildPodEditModerationInput(values) },
        { auth: true },
      );
      if (!checked.moderatePodContent.allowed) {
        applyViolations(checked.moderatePodContent.violations);
        return;
      }
      await graphqlRequest(
        HostUpdatePodDocument,
        { pod_doc_id: podId, input: buildHostUpdateInput(values, { includeSpots }) },
        { auth: true },
      );
      onSaved();
    } catch (err) {
      // The server re-runs the deterministic rules as it writes, so a refusal
      // can still land here — a stale screen, or a rule the preflight missed.
      const violations = podContentViolationsOf(err);
      if (violations.length > 0) applyViolations(violations);
      else setError(toErrorMessage(err, 'Could not save the pod'));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, blocked, save, clear };
}
