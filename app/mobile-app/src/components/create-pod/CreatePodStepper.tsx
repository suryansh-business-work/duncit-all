import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import {
  STEP_FIELDS,
  STEP_TITLES,
  buildCreatePodInput,
  createPodSchema,
  serializeDraft,
} from './create-pod.form';
import type {
  CreatePodClub,
  CreatePodFormValues,
  CreatePodLocation,
  CreatePodProduct,
  CreatePodVenue,
  VenueLocationRef,
} from './create-pod.types';
import { LocationStep } from './steps/LocationStep';
import { ClubStep } from './steps/ClubStep';
import { WhenWhereStep } from './steps/WhenWhereStep';
import { AboutStep } from './steps/AboutStep';
import { OffersStep } from './steps/OffersStep';
import { PerksStep } from './steps/PerksStep';
import { ProductsStep } from './steps/ProductsStep';
import { PaymentStep } from './steps/PaymentStep';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export type DraftPayload = ReturnType<typeof serializeDraft>;

/** Index of the optional "Add Products" step inside the full step list. */
const PRODUCTS_STEP_INDEX = 6;

interface Props {
  initialValues: CreatePodFormValues;
  initialStep: number;
  initialDraftId: string | null;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  venueLocations: VenueLocationRef[];
  venues: CreatePodVenue[];
  products: CreatePodProduct[];
  onSaveDraft: (draftId: string | null, payload: DraftPayload) => Promise<string>;
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
}

/** 8-step host Create Pod stepper (mobile twin of mWeb): per-step validation
 * gates Next, the draft autosaves on a timer + every step change, and step 7
 * publishes the pod. */
export function CreatePodStepper({
  initialValues,
  initialStep,
  initialDraftId,
  clubs,
  locations,
  venueLocations,
  venues,
  products,
  onSaveDraft,
  onPublish,
}: Readonly<Props>) {
  const form = useForm<CreatePodFormValues>({
    resolver: zodResolver(createPodSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  // When products are gated off, the "Add Products" step is removed so the
  // stepper skips straight from Perks to Payment. Titles/fields are filtered in
  // lockstep to keep their indices aligned with the rendered steps.
  const showProducts = useFeatureFlag('is_product_visible');
  const dropProductsStep = <T,>(list: T[]): T[] =>
    showProducts ? list : list.filter((_, index) => index !== PRODUCTS_STEP_INDEX);
  const stepTitles = dropProductsStep(STEP_TITLES);
  const stepFields = dropProductsStep(STEP_FIELDS);

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const draftIdRef = useRef(initialDraftId);
  const dupTitleRef = useRef(false);
  const isLast = step === stepTitles.length - 1;
  const submitLabel = busy ? 'Creating…' : 'Create Pod';

  // With products gated off, drop any product values a stale draft may carry and
  // clamp the active step so a draft saved on the (now-removed) Products step
  // can't land out of range.
  useEffect(() => {
    if (showProducts) return;
    if (form.getValues('products_enabled') || form.getValues('product_requests').length > 0) {
      form.setValue('products_enabled', false);
      form.setValue('product_requests', []);
    }
    if (step > stepTitles.length - 1) setStep(stepTitles.length - 1);
  }, [showProducts, step, stepTitles.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (await form.trigger(stepFields[step])) goTo(step + 1);
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
        setStep(1);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  });

  // Clubs load for the picked location: a club qualifies when any of its
  // meetup venues sits in that city (virtual pods see every club).
  const locationId = form.watch('location_id');
  const podMode = form.watch('pod_mode');
  const venueLocationById = new Map(venueLocations.map((venue) => [venue.id, venue.location_id]));
  const clubsForLocation =
    podMode === 'VIRTUAL' || !locationId
      ? clubs
      : clubs.filter((club) => {
          const venueIds = (club.meetup_venues_id ?? []).filter(Boolean) as string[];
          if (venueIds.length === 0) return true;
          return venueIds.some((venueId) => venueLocationById.get(venueId) === locationId);
        });

  const steps = dropProductsStep([
    <LocationStep key="location" form={form} locations={locations} />,
    <ClubStep key="club" form={form} clubs={clubsForLocation} />,
    <WhenWhereStep key="when" form={form} clubs={clubsForLocation} venues={venues} />,
    <AboutStep key="about" form={form} />,
    <OffersStep key="offers" form={form} />,
    <PerksStep key="perks" form={form} />,
    <ProductsStep key="products" form={form} products={products} />,
    <PaymentStep key="payment" form={form} />,
  ]);

  return (
    <YStack gap={16} padding={16} paddingBottom={48}>
      <YStack gap={6}>
        <Text fontSize={12.5} fontWeight="800" color="$muted">
          Step {step + 1} of {stepTitles.length}
        </Text>
        <Text fontSize={17} fontWeight="900" color="$color">
          {stepTitles[step]}
        </Text>
        <XStack height={6} borderRadius={999} backgroundColor="$borderColor" overflow="hidden">
          <YStack
            testID="create-pod-progress"
            height="100%"
            backgroundColor="$primary"
            width={`${((step + 1) / stepTitles.length) * 100}%`}
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
