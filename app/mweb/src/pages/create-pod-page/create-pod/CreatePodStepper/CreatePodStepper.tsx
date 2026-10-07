import { useRef, useState } from 'react';

import { Alert, Box, Stack } from '@mui/material';
import {
  MODERATION_FIELD_MAP,
  STEP_FIELDS,
  STEP_TITLE_KEYS,
  stepTitleKey,
  buildCreatePodInput,
  buildModerationInput,
  serializeDraft,
  stepForField,
} from '../create-pod.form';
import { useTranslation } from '../../../../i18n/useTranslation';
import AiMonitorBackdrop from '../AiMonitorBackdrop';
import StepHero from '../StepHero';
import StepFooterBar from '../StepFooterBar';
import { ModerationBlockedDialog, type BlockedViolation } from '@duncit/ui';
import type { PodModerationViolation } from '../create-pod.types';
import BasicsStep from '../steps/BasicsStep';
import LocationClubStep from '../steps/LocationClubStep';
import VenueSlotStep from '../steps/VenueSlotStep';
import PricingStep from '../steps/PricingStep';
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';
import type { CreatePodStepperProps } from './types';
import { useCreatePodForm } from './useCreatePodForm';
import { useStepperFormSync } from './useStepperFormSync';
import { useDraftAutosave } from './useDraftAutosave';
import { useStepperSelections } from './useStepperSelections';

/** 4-step host Create Pod stepper: Category/Locality/Club → Basics →
 * Venue & Slot (from the venue partner's availability calendar) → Pricing.
 * Per-step validation gates Next, the draft autosaves on a timer + every step
 * change, and the last step publishes the pod. */
export default function CreatePodStepper({
  initialValues,
  initialStep,
  initialDraftId,
  clubs,
  locations,
  venues,
  products,
  subCategories,
  hostCategories,
  viewerUserId,
  pinnedVenueId,
  onSaveDraft,
  onModerate,
  onPublish,
}: Readonly<CreatePodStepperProps>) {
  const { t } = useTranslation();
  const form = useCreatePodForm(t, initialValues);
  // Products are a flag-gated section inside the Pricing step (not a step of
  // their own), so the step list never changes shape.
  const showProducts = useFeatureFlag('is_product_visible');

  const [step, setStep] = useState(Math.min(initialStep, STEP_TITLE_KEYS.length - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedViolation[]>([]);
  const draftIdRef = useRef(initialDraftId);
  const isLast = step === STEP_TITLE_KEYS.length - 1;

  useStepperFormSync(form, showProducts, hostCategories);

  const persist = async (forStep: number) => {
    const id = await onSaveDraft(draftIdRef.current, serializeDraft(form.getValues(), forStep));
    draftIdRef.current = id;
    return id;
  };
  useDraftAutosave(form, step, persist);

  const goTo = (target: number) => {
    setStep(target);
    persist(target).catch(() => undefined);
  };
  const next = async () => {
    if (!(await form.trigger(STEP_FIELDS[step]))) return;
    // The category, locality and club are the FIRST step — a host should not
    // fill a whole pod out and only then be told to pick them.
    goTo(step + 1);
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
      const id = await persist(step);
      await onPublish(id, buildCreatePodInput(values));
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

  const { podMode, clubsInCity, clubsForLocation, clubVenueIds, availableProducts, spots, preview } =
    useStepperSelections(form, { clubs, hostCategories, products, subCategories, pinnedVenueId });

  const steps = [
    <LocationClubStep
      key="location"
      form={form}
      hostCategories={hostCategories}
      clubs={clubsForLocation}
      cityClubs={clubsInCity}
      locations={locations}
    />,
    <BasicsStep key="basics" form={form} hostCategories={hostCategories} />,
    <VenueSlotStep key="venue" form={form} venues={venues} clubVenueIds={clubVenueIds} viewerUserId={viewerUserId} />,
    <PricingStep key="pricing" form={form} products={availableProducts} showProducts={showProducts} preview={preview} spots={spots} />,
  ];

  return (
    <Stack data-testid="create-pod-stepper" spacing={2.5}>
      {/* The wizard renders ONE page at a time, so every tour step has to live on
          the page the host lands on. The hero's step pills are what lets the
          walkthrough explain the four-step journey. */}
      <Box data-tour="create-pod-steps">
        <StepHero step={step} total={STEP_TITLE_KEYS.length} title={t(stepTitleKey(step, podMode))} />
      </Box>
      {steps[step]}
      {error && <Alert data-testid="create-pod-error" severity="error">{error}</Alert>}
      {/* Spacer so the last field is never hidden behind the fixed footer bar. */}
      <Box aria-hidden sx={{ height: 88 }} />
      <Box data-tour="create-pod-publish">
        <StepFooterBar
          isFirst={step === 0}
          isLast={isLast}
          busy={busy}
          submitDisabled={preview.blocked}
          onBack={() => goTo(step - 1)}
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
