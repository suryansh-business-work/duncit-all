import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import {
  STEP_FIELDS,
  STEP_TITLES,
  buildCreatePodInput,
  createPodSchema,
  serializeDraft,
} from './create-pod.form';
import type {
  CreatePodClub,
  CreatePodFinance,
  CreatePodFormValues,
  CreatePodHostCategory,
  CreatePodLocation,
  CreatePodProduct,
  CreatePodVenue,
} from './create-pod.types';
import { BasicsStep } from './steps/BasicsStep';
import { LocationClubStep } from './steps/LocationClubStep';
import { VenueSlotStep } from './steps/VenueSlotStep';
import { PricingStep } from './steps/PricingStep';
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
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
}

/** 4-step host Create Pod stepper (mobile twin of mWeb): Basics →
 * Location/Category/Club → Venue & Slot (from the venue partner's availability
 * calendar) → Pricing. Per-step validation gates Next, the draft autosaves on
 * a timer + every step change, and the last step publishes the pod. */
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
  onPublish,
}: Readonly<Props>) {
  const form = useForm<CreatePodFormValues>({
    resolver: zodResolver(createPodSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  // Products are a flag-gated section inside the Pricing step (not a step of
  // their own), so the step list never changes shape.
  const showProducts = useFeatureFlag('is_product_visible');

  const [step, setStep] = useState(Math.min(initialStep, STEP_TITLES.length - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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

  // A duplicate-title error is shown inline on the title field; clear it as soon
  // as the host edits the title so the stale message can't linger (DIFF-7).
  const podTitle = form.watch('pod_title');
  useEffect(() => {
    if (dupTitleRef.current) {
      form.clearErrors('pod_title');
      dupTitleRef.current = false;
    }
  }, [podTitle]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (await form.trigger(STEP_FIELDS[step])) goTo(step + 1);
  };
  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError('');
    try {
      const id = await persist(step);
      await onPublish(id, buildCreatePodInput(values));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create the pod.';
      // Surface a duplicate title inline on the title field and jump back to it.
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

  // Clubs are now scoped by the host's category + the picked location (clubs
  // carry their own location_id + super_category). Physical pods narrow to the
  // city; virtual pods keep the category filter only (no city).
  const locationId = form.watch('location_id');
  const podMode = form.watch('pod_mode');
  const hostSuperIds = new Set(
    hostCategories.map((category) => category.super_category_id).filter(Boolean),
  );
  const clubMatchesHostCategory = (club: { super_category_id?: string | null }) =>
    hostSuperIds.size === 0 ||
    (!!club.super_category_id && hostSuperIds.has(club.super_category_id));
  const clubsForLocation = clubs.filter((club) => {
    if (!clubMatchesHostCategory(club)) return false;
    if (podMode === 'VIRTUAL' || !locationId) return true;
    return club.location_id === locationId;
  });

  // The picked slot feeds the Pricing panel (slot price + GST + earnings).
  const venueId = form.watch('venue_id');
  const slotId = form.watch('venue_slot_id');
  const { slots } = useVenueSlots(podMode === 'PHYSICAL' ? venueId : '');
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
    <VenueSlotStep key="venue" form={form} venues={venues} viewerUserId={viewerUserId} />,
    <PricingStep
      key="pricing"
      form={form}
      products={products}
      showProducts={showProducts}
      selectedSlot={selectedSlot}
      finance={finance}
    />,
  ];

  return (
    <YStack gap={16} padding={16} paddingBottom={48}>
      <YStack gap={6}>
        <Text fontSize={12.5} fontWeight="800" color="$muted">
          Step {step + 1} of {STEP_TITLES.length}
        </Text>
        <Text fontSize={17} fontWeight="900" color="$color">
          {STEP_TITLES[step]}
        </Text>
        <XStack height={6} borderRadius={999} backgroundColor="$borderColor" overflow="hidden">
          <YStack
            testID="create-pod-progress"
            height="100%"
            backgroundColor="$primary"
            width={`${((step + 1) / STEP_TITLES.length) * 100}%`}
          />
        </XStack>
      </YStack>
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
            onPress={() => (isLast ? void submit() : void next())}
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
