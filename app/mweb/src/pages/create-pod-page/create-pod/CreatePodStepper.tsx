import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
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
  CreatePodHostCategory,
  CreatePodLocation,
  CreatePodProduct,
  CreatePodSlot,
  CreatePodVenue,
} from './create-pod.types';
import BasicsStep from './steps/BasicsStep';
import LocationClubStep from './steps/LocationClubStep';
import VenueSlotStep, { VENUE_AVAILABLE_SLOTS } from './steps/VenueSlotStep';
import PricingStep from './steps/PricingStep';
import { useQuery } from '@apollo/client';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

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
  onSaveDraft: (draftId: string | null, payload: DraftPayload) => Promise<string>;
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
}

/** 4-step host Create Pod stepper: Basics → Location/Category/Club →
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
  hostCategories,
  viewerUserId,
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
  const [error, setError] = useState<string | null>(null);
  const draftIdRef = useRef(initialDraftId);
  const dupTitleRef = useRef(false);
  const isLast = step === STEP_TITLES.length - 1;

  // With products gated off, drop any product values a stale draft may carry.
  useEffect(() => {
    if (showProducts) return;
    if (form.getValues('products_enabled') || form.getValues('product_requests').length > 0) {
      form.setValue('products_enabled', false);
      form.setValue('product_requests', []);
    }
  }, [showProducts, form]);

  // A duplicate-title error is shown inline on the title field; clear it as soon
  // as the host edits the title so the stale message can't linger (DIFF-7).
  const podTitle = form.watch('pod_title');
  useEffect(() => {
    if (dupTitleRef.current) {
      form.clearErrors('pod_title');
      dupTitleRef.current = false;
    }
  }, [podTitle, form]);

  const persist = async (forStep: number) => {
    const id = await onSaveDraft(draftIdRef.current, serializeDraft(form.getValues(), forStep));
    draftIdRef.current = id;
    return id;
  };
  const latest = useRef({ step, persist });
  latest.current = { step, persist };

  const valuesKey = JSON.stringify(form.watch());
  const dirty = form.formState.isDirty;
  useEffect(() => {
    if (!dirty) return undefined;
    const handle = setTimeout(() => {
      latest.current.persist(latest.current.step).catch(() => undefined);
    }, 4000);
    return () => clearTimeout(handle);
  }, [valuesKey, dirty]);

  const goTo = (target: number) => {
    setStep(target);
    persist(target).catch(() => undefined);
  };
  const next = async () => {
    if (await form.trigger(STEP_FIELDS[step])) goTo(step + 1);
  };
  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
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
    (hostCategories ?? []).map((category) => category.super_category_id).filter(Boolean)
  );
  const clubMatchesHostCategory = (club: { super_category_id?: string | null }) =>
    hostSuperIds.size === 0 || (!!club.super_category_id && hostSuperIds.has(club.super_category_id));
  const clubsForLocation = clubs.filter((club) => {
    if (!clubMatchesHostCategory(club)) return false;
    if (podMode === 'VIRTUAL' || !locationId) return true;
    return club.location_id === locationId;
  });

  // The picked slot feeds the Pricing panel (slot price + GST + earnings).
  const venueId = form.watch('venue_id');
  const slotId = form.watch('venue_slot_id');
  const slotsQuery = useQuery<{ venueAvailableSlots: CreatePodSlot[] }>(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId },
    skip: podMode !== 'PHYSICAL' || !venueId,
    fetchPolicy: 'cache-first',
  });
  const selectedSlot = (slotsQuery.data?.venueAvailableSlots ?? []).find((slot) => slot.id === slotId) ?? null;

  const steps = [
    <BasicsStep key="basics" form={form} />,
    <LocationClubStep key="location" form={form} clubs={clubsForLocation} locations={locations} hostCategories={hostCategories} />,
    <VenueSlotStep key="venue" form={form} venues={venues} viewerUserId={viewerUserId} />,
    <PricingStep key="pricing" form={form} products={products} showProducts={showProducts} selectedSlot={selectedSlot} />,
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
          Step {step + 1} of {STEP_TITLES.length}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {STEP_TITLES[step]}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((step + 1) / STEP_TITLES.length) * 100}
          sx={{ mt: 0.75, borderRadius: 999, height: 6 }}
        />
      </Box>
      {steps[step]}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Button disabled={step === 0 || busy} onClick={() => goTo(step - 1)}>
          Back
        </Button>
        {isLast ? (
          <Button variant="contained" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Creating…' : 'Create Pod'}
          </Button>
        ) : (
          <Button variant="contained" onClick={() => void next()} disabled={busy}>
            Next
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
