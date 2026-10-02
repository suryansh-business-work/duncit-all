import { formResolver } from '../../../utils/form-resolver';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useTranslation } from '@/hooks/useTranslation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import {
  STEP_FIELDS,
  STEP_TITLE_KEYS,
  hostCategoryKeyOf,
  makeCreatePodSchema,
  serializeDraft,
} from '../create-pod.form';
import type { CreatePodFormValues, PodHostOption } from '../create-pod.types';
import type { BlockedViolation } from '../ModerationBlockedDialog';
import type { CreatePodStepperProps } from './types';

type CreatePodFormArgs = Pick<
  CreatePodStepperProps,
  | 'initialValues'
  | 'initialStep'
  | 'initialDraftId'
  | 'hostCategories'
  | 'onSaveDraft'
  | 'clubAdmin'
>;

/** The stepper's form, step/busy/error state, and the host's rolling autosave. */
export function useCreatePodForm({
  initialValues,
  initialStep,
  initialDraftId,
  hostCategories,
  onSaveDraft,
  clubAdmin,
}: CreatePodFormArgs) {
  const { t } = useTranslation();
  // The schema cannot call `t` at module scope, so it is built here from the
  // reader's own catalogue — the validation messages are copy like any other.
  const schema = useMemo(() => makeCreatePodSchema(t), [t]);
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    resolver: formResolver<CreatePodFormValues>(schema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  const showProducts = useFeatureFlag('is_product_visible');

  const [step, setStep] = useState(Math.min(initialStep, STEP_TITLE_KEYS.length - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState<BlockedViolation[]>([]);
  const draftIdRef = useRef(initialDraftId);
  // The HOST's rolling autosave, which persists form state per step against a
  // draft id. Off in Club Admin mode: their pod goes straight through the
  // club-admin mutation, and their "Save as Draft" writes the pod inactive
  // instead — a different thing that happens to share a word.
  const draftsOn = !clubAdmin;
  const [hosts, setHosts] = useState<PodHostOption[]>(clubAdmin?.initialHosts ?? []);

  // With products gated off, drop any product values a stale draft may carry.
  useEffect(() => {
    if (showProducts) return;
    if (form.getValues('products_enabled') || form.getValues('product_requests').length > 0) {
      form.setValue('products_enabled', false);
      form.setValue('product_requests', []);
    }
  }, [showProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  // A host with a single onboarded category has it auto-selected, so they never
  // see the extra choice; multi-category hosts must pick (enforced in next()).
  useEffect(() => {
    const sole = hostCategories[0];
    if (hostCategories.length === 1 && sole && !form.getValues('host_category_key')) {
      form.setValue('host_category_key', hostCategoryKeyOf(sole));
    }
  }, [hostCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = async (forStep: number) => {
    const id = await onSaveDraft(draftIdRef.current, serializeDraft(form.getValues(), forStep));
    draftIdRef.current = id;
    return id;
  };
  const persistSafely = (forStep: number) => {
    if (!draftsOn) return;
    persist(forStep).catch(() => undefined);
  };
  const latest = useRef({ step, persistSafely });
  latest.current = { step, persistSafely };

  const valuesKey = JSON.stringify(form.watch());
  const dirty = form.formState.isDirty;
  useEffect(() => {
    if (!dirty || !draftsOn) return undefined;
    const handle = setTimeout(() => latest.current.persistSafely(latest.current.step), 4000);
    return () => clearTimeout(handle);
  }, [valuesKey, dirty, draftsOn]);

  const goTo = (target: number) => {
    setStep(target);
    persistSafely(target);
  };
  const next = async () => {
    // The category is on the FIRST step, so it gates it — enforced
    // by the schema (host_category_key is in STEP_FIELDS[0]) rather than by a
    // second hand-written check here, which only ran when the host already had
    // categories and so let a category-less host straight through.
    if (!(await form.trigger(STEP_FIELDS[step]))) return;
    goTo(step + 1);
  };

  return {
    t,
    form,
    showProducts,
    step,
    setStep,
    busy,
    setBusy,
    error,
    setError,
    blocked,
    setBlocked,
    hosts,
    setHosts,
    persist,
    goTo,
    next,
  };
}

export type CreatePodFormState = ReturnType<typeof useCreatePodForm>;
