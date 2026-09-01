import { formResolver } from '../../utils/form-resolver';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TourAnchor } from '@/tours/TourAnchor';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { fireAndForget } from '@/utils/fire-and-forget';
import { filterProductsForClub, pruneProductRequests, spotsBounds } from '@duncit/utils';
import {
  MODERATION_FIELD_MAP,
  STEP_FIELDS,
  STEP_TITLE_KEYS,
  buildCreatePodInput,
  buildModerationInput,
  filterClubs,
  hostCategoryKeyOf,
  makeCreatePodSchema,
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
  CreatePodSubCategory,
  CreatePodVenue,
  PodModerationResult,
  PodModerationViolation,
} from './create-pod.types';
import { usePodPricing } from './price-panel';
import { BasicsStep } from './steps/BasicsStep';
import { LocationClubStep } from './steps/LocationClubStep';
import { VenueSlotStep } from './steps/VenueSlotStep';
import { PricingStep } from './steps/PricingStep';
import { AiMonitorOverlay } from './AiMonitorOverlay';
import { StepHeader } from './StepHeader';
import { ModerationBlockedDialog, type BlockedViolation } from './ModerationBlockedDialog';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { PRESS_STYLE } from '@duncit/buttons-native';

export type DraftPayload = ReturnType<typeof serializeDraft>;

interface Props {
  initialValues: CreatePodFormValues;
  initialStep: number;
  initialDraftId: string | null;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  venues: CreatePodVenue[];
  products: CreatePodProduct[];
  /** SUB-level categories with their admin-set minimum pax. */
  subCategories: CreatePodSubCategory[];
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
  subCategories,
  hostCategories,
  viewerUserId,
  finance,
  onSaveDraft,
  onModerate,
  onPublish,
}: Readonly<Props>) {
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
  const dupTitleRef = useRef(false);
  const isLast = step === STEP_TITLE_KEYS.length - 1;
  const submitLabel = busy ? t('mweb.createPod.creating') : t('mweb.createPod.createPod');

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
    // The category sits above the title, so it gates the FIRST step — enforced
    // by the schema (host_category_key is in STEP_FIELDS[0]) rather than by a
    // second hand-written check here, which only ran when the host already had
    // categories and so let a category-less host straight through.
    if (!(await form.trigger(STEP_FIELDS[step]))) return;
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
        // stepIndex is always an in-range STEP_TITLE_KEYS index (the cast narrows the type).
        stepTitle: t(STEP_TITLE_KEYS[stepIndex] as string),
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
      const message = e instanceof Error ? e.message : t('mweb.createPod.createFailed');
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
  const clubId = form.watch('club_id');
  const selectedClub = clubs.find((club) => club.id === clubId) ?? null;
  const clubVenueIds = new Set((selectedClub?.matched_venues ?? []).map((venue) => venue.id));
  // Only offer products whose category matches the selected club (Super + Sub).
  const availableProducts = filterProductsForClub(products, selectedClub);

  // Changing the club (or the host category, which clears the club) changes what
  // Step 4 may offer, so any row the new club no longer offers has to go — it
  // would otherwise render blank, price at ₹0 and die on the server's category
  // gate at publish with nothing on screen explaining why. mWeb twin.
  useEffect(() => {
    const requests = form.getValues('product_requests');
    const kept = pruneProductRequests(requests, availableProducts);
    if (kept !== requests) form.setValue('product_requests', kept, { shouldDirty: true });
    // availableProducts is derived from club_id, so that is the real trigger.
  }, [clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  // The picked slot feeds the Pricing panel (slot price + GST + earnings).
  const podMode = form.watch('pod_mode');
  const slotId = form.watch('venue_slot_id');
  const { slots } = useVenueSlots(podMode === 'PHYSICAL' ? form.watch('venue_id') : '');
  const selectedSlot = slots.find((slot) => slot.id === slotId) ?? null;

  // How big this pod may be: floored by the sub-category's admin-set minimum
  // (a doubles game needs 4) and capped by the venue space the host booked. The
  // pod's sub-category is its club's `category_id`. mWeb twin (rule 27).
  const spots = spotsBounds({
    minPax: subCategories.find((sub) => sub.id === selectedClub?.category_id)?.min_pax,
    venueCapacity: podMode === 'PHYSICAL' ? selectedSlot?.capacity : null,
  });

  // Step 4's money state lives HERE because it gates the Create Pod button: a
  // ₹0 projected payout, or a pod worth less than the venue slot, blocks
  // publishing. The panel renders from the same object, so both always agree.
  const pricing = usePodPricing({
    podAmount: Number(form.watch('pod_amount_text')) || 0,
    noOfSpots: Number(form.watch('no_of_spots_text')) || 0,
    venueId: form.watch('venue_id') || null,
    slotPrice: selectedSlot ? selectedSlot.price : null,
    isPhysical: podMode === 'PHYSICAL',
    isFree: form.watch('pod_type') === 'FREE',
  });

  const steps = [
    <BasicsStep key="basics" form={form} hostCategories={hostCategories} />,
    <LocationClubStep key="location" form={form} clubs={clubsForLocation} locations={locations} />,
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
      finance={finance}
      pricing={pricing}
      spots={spots}
    />,
  ];

  return (
    <YStack gap={16} padding={16} paddingBottom={48}>
      {/* The wizard renders ONE page at a time, so every tour step has to live
          on the page the host lands on. The header carries the step counter and
          is what lets the walkthrough explain the four-step journey. */}
      <TourAnchor tour="create-pod" anchor="create-pod-steps">
        <StepHeader step={step} podMode={podMode} />
      </TourAnchor>
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
            aria-label={t('mweb.createPod.back')}
            onPress={() => goTo(step - 1)}
            height={52}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={PRESS_STYLE.row}
          >
            <Text fontSize={15} fontWeight="700" color="$color">
              {t('mweb.createPod.back')}
            </Text>
          </XStack>
        ) : null}
        {/* flex:2 is restated on the wrapper, not moved onto it: TourAnchor
            renders nothing at all when no tour is on, so the child has to keep
            sizing the row by itself. */}
        <TourAnchor tour="create-pod" anchor="create-pod-publish" style={{ flex: 2 }}>
          <YStack flex={2}>
            <PrimaryButton
              testID="create-pod-submit"
              label={isLast ? submitLabel : t('mweb.createPod.next')}
              loading={busy}
              disabled={isLast && pricing.blocked}
              onPress={() => (isLast ? fireAndForget(submit()) : fireAndForget(next()))}
            />
          </YStack>
        </TourAnchor>
      </XStack>
      {/* The wait between pressing Create Pod and an answer IS the AI reading
          the pod, so it is named rather than left as a nameless spinner. */}
      <AiMonitorOverlay open={busy} />
      <ModerationBlockedDialog
        violations={blocked}
        onJump={jumpToStep}
        onClose={() => setBlocked([])}
      />
    </YStack>
  );
}
