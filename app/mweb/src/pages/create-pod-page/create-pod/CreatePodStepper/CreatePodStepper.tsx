import { useState } from 'react';

import { Alert, Box, Stack } from '@mui/material';
import { CREATE_POD_STEP_COUNT, CREATE_POD_WHERE_STEP, clampCreatePodStep, createPodSendsOffer } from '@duncit/utils';
import {
  MODERATION_FIELD_MAP,
  STEP_TITLE_KEYS,
  stepTitleKey,
  stepSubtitleKey,
  buildCreatePodInput,
  buildModerationInput,
  serializeDraft,
  stepFieldsFor,
  stepForField,
} from '../create-pod.form';
import { useTranslation } from '../../../../i18n/useTranslation';
import AiMonitorBackdrop from '../AiMonitorBackdrop';
import StepHero from '../StepHero';
import StepFooterBar from '../StepFooterBar';
import { ModerationBlockedDialog, type BlockedViolation } from '@duncit/ui';
import type { PodModerationViolation } from '../create-pod.types';
import WhatStep from '../steps/WhatStep';
import WhereWhenStep from '../steps/WhereWhenStep';
import MoneyStep from '../steps/MoneyStep';
import DetailsStep from '../steps/DetailsStep';
import PickedVenueNote from '../PickedVenueNote';
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';
import { useSmartIncentiveSettings } from '../../../../utils/smartIncentive';
import type { CreatePodStepperProps } from './types';
import { useCreatePodForm } from './useCreatePodForm';
import { useStepperFormSync } from './useStepperFormSync';
import { useDraftAutosave } from './useDraftAutosave';
import { useStepperSelections } from './useStepperSelections';

/** Host Create Pod stepper: What (category, mode) → Where & when (locality,
 * club, venue and slot from the venue partner's availability calendar, or a
 * virtual meeting) → Money (the venue offer, when the pod sends one, and the
 * ticket) → Details. Per-step validation gates Next, the draft autosaves on a
 * timer + every step change, and the last step publishes. */
export default function CreatePodStepper({
  initialValues,
  initialStep,
  initialDraftId,
  clubs,
  locations,
  venues,
  products,
  subCategories,
  categoryIcons,
  hostCategories,
  viewerUserId,
  pinnedVenueId,
  pickedVenueId,
  onSaveDraft,
  onModerate,
  onPublish,
  onAutosave,
}: Readonly<CreatePodStepperProps>) {
  const { t } = useTranslation();
  const form = useCreatePodForm(t, initialValues, venues);
  // Products are a flag-gated section inside the Pricing step (not a step of
  // their own), so the step list never changes shape.
  const showProducts = useFeatureFlag('is_product_visible');
  // Money shows the Smart Incentive only while Loyalty has it on; publish
  // sends it the same way, so nothing unseen is published.
  const smartIncentiveOn = useSmartIncentiveSettings().enabled;

  const [step, setStep] = useState(() => clampCreatePodStep(initialStep));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedViolation[]>([]);
  const isLast = step === STEP_TITLE_KEYS.length - 1;

  useStepperFormSync(form, showProducts, hostCategories);

  // Every save writes the one draft this visit is about (it is in the URL).
  const autosave = useDraftAutosave(
    form,
    step,
    (payload, options) => onSaveDraft(initialDraftId, payload, options),
    onAutosave
  );

  // The step is part of the draft, so the autosave saves the move at once.
  const goTo = (target: number) => setStep(target);
  const next = async () => {
    if (!(await form.trigger(stepFieldsFor(step, form.getValues())))) return;
    goTo(clampCreatePodStep(step + 1));
  };

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
        stepTitle: t(STEP_TITLE_KEYS[stepIndex]),
      };
    });
    setBlocked(mapped);
    setStep(mapped[0].stepIndex);
  };

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      const moderation = await onModerate(buildModerationInput(values));
      if (!moderation.allowed) {
        applyModeration(moderation.violations);
        return;
      }
      // Let any autosave still out land first, so none can arrive after the
      // publish and bring the draft back; then write the form as published.
      await autosave.flush();
      const id = await onSaveDraft(initialDraftId, serializeDraft(values, step));
      autosave.markSaved();
      await onPublish(id, buildCreatePodInput(values, { smartIncentiveOn }));
      autosave.stop();
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

  const { podMode, clubsInCity, clubsForLocation, clubVenueIds, availableProducts, spots, offerMinGuests, preview, venueNotice, venueLocked } =
    useStepperSelections(form, { clubs, hostCategories, products, subCategories, venues, viewerUserId, pinnedVenueId, pickedVenueId });
  const sendsOffer = createPodSendsOffer({
    pod_mode: podMode,
    partner_request_id: form.watch('partner_request_id'),
    venue_slot_id: form.watch('venue_slot_id'),
  });

  const steps = [
    <WhatStep key="what" form={form} hostCategories={hostCategories} categoryIcons={categoryIcons} clubs={clubs} venueLocked={venueLocked} />,
    <WhereWhenStep key="where" form={form} clubs={clubsForLocation} cityClubs={clubsInCity} locations={locations} venues={venues} clubVenueIds={clubVenueIds} venueNotice={venueNotice} spots={spots} offerMinGuests={offerMinGuests} venueLocked={venueLocked} />,
    <MoneyStep key="money" form={form} venues={venues} sendsOffer={sendsOffer} products={availableProducts} showProducts={showProducts} preview={preview} venueNotice={venueNotice} />,
    <DetailsStep key="details" form={form} hostCategories={hostCategories} venues={venues} onEditWhen={() => goTo(CREATE_POD_WHERE_STEP)} />,
  ];
  const nextLabel = isLast ? undefined : t('mweb.createPod.nextTo', { vars: { step: t(stepTitleKey(step + 1, podMode)) } });

  return (
    <Stack data-testid="create-pod-stepper" spacing={2.5}>
      {/* The wizard renders ONE page at a time, so every tour step has to live on
          the page the host lands on. The hero's step pills are what lets the
          walkthrough explain the step-by-step journey. */}
      <Box data-tour="create-pod-steps">
        <StepHero step={step} total={CREATE_POD_STEP_COUNT} title={t(stepTitleKey(step, podMode))} subtitle={t(stepSubtitleKey(step, podMode, sendsOffer))} />
      </Box>
      {venueLocked && step <= CREATE_POD_WHERE_STEP && <PickedVenueNote venues={venues} venueId={form.watch('venue_id')} />}
      {steps[step]}
      {error &&<Alert data-testid="create-pod-error" severity="error">{error}</Alert>}
      {/* Spacer so the last field is never hidden behind the fixed footer bar. */}
      <Box aria-hidden sx={{ height: 88 }} />
      <Box data-tour="create-pod-publish">
        <StepFooterBar
          isFirst={step === 0}
          isLast={isLast}
          busy={busy}
          submitDisabled={preview.blocked}
          nextLabel={nextLabel}
          onBack={() => goTo(clampCreatePodStep(step - 1))}
          onNext={() => {
            next().catch(() => undefined);
          }}
          onSubmit={() => {
            submit().catch(() => undefined);
          }}
        />
      </Box>
      {/* The wait between pressing Create Pod and an answer IS the AI reading
          the pod, so it is named rather than left as a nameless spinner. */}
      <AiMonitorBackdrop open={busy} />
      <ModerationBlockedDialog
        violations={blocked}
        onJump={jumpToStep}
        onClose={() => setBlocked([])}
        title={t('mweb.createPod.moderationTitle')}
        description={t('mweb.createPod.moderationDescription')}
      />
    </Stack>
  );
}
