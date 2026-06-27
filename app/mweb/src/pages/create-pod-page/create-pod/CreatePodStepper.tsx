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
  CreatePodLocation,
  CreatePodProduct,
  CreatePodVenue,
  VenueLocationRef,
} from './create-pod.types';
import LocationStep from './steps/LocationStep';
import ClubStep from './steps/ClubStep';
import WhenWhereStep from './steps/WhenWhereStep';
import AboutStep from './steps/AboutStep';
import OffersStep from './steps/OffersStep';
import PerksStep from './steps/PerksStep';
import ProductsStep from './steps/ProductsStep';
import PaymentStep from './steps/PaymentStep';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

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

/** 8-step host Create Pod stepper: per-step validation gates Next, the draft
 * autosaves on a timer + every step change, and step 7 publishes the pod. */
export default function CreatePodStepper({
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
  // When products are gated off, the "Add Products" step is removed from the
  // flow so the stepper skips straight from Perks to Payment. Titles/fields are
  // filtered in lockstep to keep their indices aligned with the rendered steps.
  const showProducts = useFeatureFlag('is_product_visible');
  const dropProductsStep = <T,>(list: T[]): T[] =>
    showProducts ? list : list.filter((_, index) => index !== PRODUCTS_STEP_INDEX);
  const stepTitles = dropProductsStep(STEP_TITLES);
  const stepFields = dropProductsStep(STEP_FIELDS);

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftIdRef = useRef(initialDraftId);
  const dupTitleRef = useRef(false);
  const isLast = step === stepTitles.length - 1;

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
  }, [showProducts, step, stepTitles.length, form]);

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
    if (await form.trigger(stepFields[step])) goTo(step + 1);
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
          const venueIds = club.meetup_venues_id ?? [];
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
    <Stack spacing={2}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
          Step {step + 1} of {stepTitles.length}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {stepTitles[step]}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((step + 1) / stepTitles.length) * 100}
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
