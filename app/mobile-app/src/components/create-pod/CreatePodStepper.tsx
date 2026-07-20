import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { fireAndForget } from '@/utils/fire-and-forget';
import { filterProductsForClub } from '@/utils/pod-product-category';
import {
  MODERATION_FIELD_MAP,
  STEP_FIELDS,
  STEP_TITLES,
  buildCreatePodInput,
  buildModerationInput,
  createPodSchema,
  filterClubs,
  hostCategoryKeyOf,
  serializeDraft,
  stepForField,
} from './create-pod.form';
import type {
  CreatePodClub,
  CreatePodFinance,
  CreatePodFormValues,
  CreatePodHostCategory,
  CreatePodLocation,
  CreatePodProduct,
  CreatePodVenue,
  PodModerationResult,
  PodModerationViolation,
} from './create-pod.types';
import { BasicsStep } from './steps/BasicsStep';
import { LocationClubStep } from './steps/LocationClubStep';
import { VenueSlotStep } from './steps/VenueSlotStep';
import { PricingStep } from './steps/PricingStep';
import { StepHeader } from './StepHeader';
import { ModerationBlockedDialog, type BlockedViolation } from './ModerationBlockedDialog';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export type DraftPayload = ReturnType<typeof serializeDraft>;

interface Props {
  initialValues: CreatePodFormValues;
  initialStep: number;
  initialDraftId: string | null;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  venues: CreatePodVenue[];
  products: CreatePodProduct[];
  hostCategories: CreatePodHostCategory[];
  viewerUserId: string;
  finance: CreatePodFinance;
  onSaveDraft: (draftId: string | null, payload: DraftPayload) => Promise<string>;
  onModerate: (input: ReturnType<typeof buildModerationInput>) => Promise<PodModerationResult>;
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
}

/** 4-step host Create Pod stepper (mobile twin of mWeb): Basics →
 * Location/Category/Club → Venue & Slot → Pricing. Per-step validation gates
 * Next; tapping "Create Pod" runs the AI + rules moderation preflight and only
 * publishes when the content is clean. */
export function CreatePodStepper({
  initialValues,
  initialStep,
  initialDraftId,
  clubs,
  locations,
  venues,
  products,
  hostCategories,
  viewerUserId,
  finance,
  onSaveDraft,
  onModerate,
  onPublish,
}: Readonly<Props>) {
  const form = useForm<CreatePodFormValues>({
    resolver: zodResolver(createPodSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  const showProducts = useFeatureFlag('is_product_visible');

  const [step, setStep] = useState(Math.min(initialStep, STEP_TITLES.length - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState<BlockedViolation[]>([]);
  const draftIdRef = useRef(initialDraftId);
  const dupTitleRef = useRef(false);
  const isLast = step === STEP_TITLES.length - 1;
  const submitLabel = busy ? 'Creating…' : 'Create Pod';

  // With products gated off, drop any product values a stale draft may carry.
  useEffect(() => {
    if (showProducts) return;
    if (form.getValues('products_enabled') || form.getValues('product_requests').length > 0) {
      form.setValue('products_enabled', false);
      form.setValue('product_requests', []);
    }
  }, [showProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear a duplicate-title error as soon as the host edits the title (DIFF-7).
  const podTitle = form.watch('pod_title');
  useEffect(() => {
    if (dupTitleRef.current) {
      form.clearErrors('pod_title');
      dupTitleRef.current = false;
    }
  }, [podTitle]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const persistSafely = (forStep: number) => persist(forStep).catch(() => undefined);
  const latest = useRef({ step, persistSafely });
  latest.current = { step, persistSafely };

  const valuesKey = JSON.stringify(form.watch());
  const dirty = form.formState.isDirty;
  useEffect(() => {
    if (!dirty) return undefined;
    const handle = setTimeout(() => latest.current.persistSafely(latest.current.step), 4000);
    return () => clearTimeout(handle);
  }, [valuesKey, dirty]);

  const goTo = (target: number) => {
    setStep(target);
    persistSafely(target);
  };
  const next = async () => {
    if (!(await form.trigger(STEP_FIELDS[step]))) return;
    if (step === 1 && hostCategories.length > 0 && !form.getValues('host_category_key')) {
      form.setError('host_category_key', { type: 'required', message: 'Select your category' });
      return;
    }
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
        // stepIndex is always an in-range STEP_TITLES index (the cast narrows the type).
        stepTitle: STEP_TITLES[stepIndex] as string,
      };
    });
    setBlocked(mapped);
    // applyModeration only runs when there is ≥1 violation, so mapped[0] is present.
    setStep((mapped[0] as BlockedViolation).stepIndex);
  };

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError('');
    try {
      const moderation = await onModerate(buildModerationInput(values));
      if (!moderation.allowed) {
        applyModeration(moderation.violations);
        return;
      }
      const id = await persist(step);
      await onPublish(id, buildCreatePodInput(values));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create the pod.';
      if (/already exists/i.test(message)) {
        dupTitleRef.current = true;
        form.setError('pod_title', { type: 'duplicate', message });
        setStep(0);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  });

  const jumpToStep = (target: number) => {
    setBlocked([]);
    setStep(target);
  };

  // Clubs are scoped by the selected host category (Super + Sub), then the picked
  // city and locality (helper shared with mWeb + covered by unit tests).
  const clubsForLocation = filterClubs(clubs, {
    hostCategories,
    selectedCategoryKey: form.watch('host_category_key'),
    locationId: form.watch('location_id'),
    locality: form.watch('locality'),
    podMode: form.watch('pod_mode'),
  });

  // Step 3 venues are scoped to the selected club's auto-matched venues.
  const selectedClub = clubs.find((club) => club.id === form.watch('club_id')) ?? null;
  const clubVenueIds = new Set((selectedClub?.matched_venues ?? []).map((venue) => venue.id));
  // Only offer products whose category matches the selected club (Super + Sub).
  const availableProducts = filterProductsForClub(products, selectedClub);

  // The picked slot feeds the Pricing panel (slot price + GST + earnings).
  const podMode = form.watch('pod_mode');
  const slotId = form.watch('venue_slot_id');
  const { slots } = useVenueSlots(podMode === 'PHYSICAL' ? form.watch('venue_id') : '');
  const selectedSlot = slots.find((slot) => slot.id === slotId) ?? null;

  const steps = [
    <BasicsStep key="basics" form={form} />,
    <LocationClubStep
      key="location"
      form={form}
      clubs={clubsForLocation}
      locations={locations}
      hostCategories={hostCategories}
    />,
    <VenueSlotStep
      key="venue"
      form={form}
      venues={venues}
      clubVenueIds={clubVenueIds}
      viewerUserId={viewerUserId}
    />,
    <PricingStep
      key="pricing"
      form={form}
      products={availableProducts}
      showProducts={showProducts}
      selectedSlot={selectedSlot}
      finance={finance}
    />,
  ];

  return (
    <YStack gap={16} padding={16} paddingBottom={48}>
      <StepHeader step={step} />
      {steps[step]}
      {error ? (
        <Text testID="create-pod-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      <XStack gap={10}>
        {step > 0 ? (
          <XStack
            flex={1}
            testID="create-pod-back"
            role="button"
            aria-label="Back"
            onPress={() => goTo(step - 1)}
            height={52}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize={15} fontWeight="700" color="$color">
              Back
            </Text>
          </XStack>
        ) : null}
        <YStack flex={2}>
          <PrimaryButton
            testID="create-pod-submit"
            label={isLast ? submitLabel : 'Next'}
            loading={busy}
            onPress={() => (isLast ? fireAndForget(submit()) : fireAndForget(next()))}
          />
        </YStack>
      </XStack>
      <ModerationBlockedDialog
        violations={blocked}
        onJump={jumpToStep}
        onClose={() => setBlocked([])}
      />
    </YStack>
  );
}
