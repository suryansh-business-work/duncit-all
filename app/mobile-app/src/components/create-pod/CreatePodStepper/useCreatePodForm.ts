import { formResolver } from '../../../utils/form-resolver';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { adjacentCreatePodStep, shownCreatePodStep, venueOfferFloor } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSmartIncentiveSettings } from '@/hooks/useSmartIncentiveSettings';
import { offerMoney } from '@/components/venue-offer/offer-format';
import {
  hostCategoryKeyOf,
  makeCreatePodSchema,
  serializeDraft,
  stepFieldsFor,
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
  | 'venues'
>;

/** The stepper's form, step/busy/error state, and the host's rolling autosave. */
export function useCreatePodForm({
  initialValues,
  initialStep,
  initialDraftId,
  hostCategories,
  onSaveDraft,
  clubAdmin,
  venues,
}: CreatePodFormArgs) {
  const { t } = useTranslation();
  // Step 4 shows the Smart Incentive only while Loyalty's programme is known to
  // be on; only then is its percentage checked (a null maximum skips it) and
  // published as the form holds it. mWeb twin: useCreatePodSchema.
  const smartIncentive = useSmartIncentiveSettings();
  const smartIncentiveMaxPct = smartIncentive.enabled ? smartIncentive.maxPct : null;
  // The schema cannot call `t` at module scope, so it is built here from the
  // reader's own catalogue — the validation messages are copy like any other.
  // An offer below the picked venue's business amount on its basis is held on
  // the offer step; the server refuses it too (BELOW_MIN_BUSINESS).
  const schema = useMemo(
    () =>
      makeCreatePodSchema(t, smartIncentiveMaxPct, (values) =>
        venueOfferFloor(
          venues.find((venue) => venue.id === values.venue_id)?.offer_min_business,
          values.venue_offer_model,
          t,
          offerMoney,
        ),
      ),
    [t, smartIncentiveMaxPct, venues],
  );
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    resolver: formResolver<CreatePodFormValues>(schema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  const showProducts = useFeatureFlag('is_product_visible');

  // A draft saved on a step this pod no longer walks resumes on the next one.
  const [step, setStep] = useState(() => shownCreatePodStep(initialStep, initialValues));
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
    // categories and so let a category-less host straight through. A free
    // venue or a free pod adds its justification to the step that shows it.
    if (!(await form.trigger(stepFieldsFor(step, form.getValues())))) return;
    // A pod that sends no venue offer passes over the offer step.
    goTo(adjacentCreatePodStep(step, 1, form.getValues()));
  };
  const back = () => goTo(adjacentCreatePodStep(step, -1, form.getValues()));

  return {
    t,
    form,
    showProducts,
    smartIncentiveOn: smartIncentive.enabled,
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
    back,
  };
}

export type CreatePodFormState = ReturnType<typeof useCreatePodForm>;
