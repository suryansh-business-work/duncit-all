import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Stack } from '@mui/material';
import {
  MODERATION_FIELD_MAP,
  STEP_FIELDS,
  STEP_TITLE_KEYS,
  STEP_SUBTITLE_KEYS,
  buildCreatePodInput,
  buildModerationInput,
  filterClubs,
  hostCategoryKeyOf,
  makeCreatePodSchema,
  serializeDraft,
  stepForField,
} from './create-pod.form';
import { useTranslation } from '../../../i18n/useTranslation';
import StepHero from './StepHero';
import StepFooterBar from './StepFooterBar';
import { ModerationBlockedDialog, type BlockedViolation } from '@duncit/ui';
import type {
  CreatePodClub,
  CreatePodFormValues,
  CreatePodHostCategory,
  CreatePodLocation,
  CreatePodProduct,
  CreatePodSlot,
  CreatePodSubCategory,
  CreatePodVenue,
  PodModerationResult,
  PodModerationViolation,
} from './create-pod.types';
import BasicsStep from './steps/BasicsStep';
import LocationClubStep from './steps/LocationClubStep';
import VenueSlotStep, { VENUE_AVAILABLE_SLOTS } from './steps/VenueSlotStep';
import PricingStep from './steps/PricingStep';
import { useEarningsPreview } from './price-panel';
import { useQuery } from '@apollo/client';
import { filterProductsForClub, pruneProductRequests, spotsBounds } from '@duncit/utils';
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
  /** SUB-level categories with their admin-set minimum pax. */
  subCategories: CreatePodSubCategory[];
  hostCategories: CreatePodHostCategory[];
  viewerUserId: string;
  onSaveDraft: (draftId: string | null, payload: DraftPayload) => Promise<string>;
  onModerate: (input: ReturnType<typeof buildModerationInput>) => Promise<PodModerationResult>;
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
  subCategories,
  hostCategories,
  viewerUserId,
  onSaveDraft,
  onModerate,
  onPublish,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // The schema cannot call `t` at module scope, so it is built here from the
  // reader's own catalogue — the validation messages are copy like any other.
  const schema = useMemo(() => makeCreatePodSchema(t), [t]);
  const form = useForm<CreatePodFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  // Products are a flag-gated section inside the Pricing step (not a step of
  // their own), so the step list never changes shape.
  const showProducts = useFeatureFlag('is_product_visible');

  const [step, setStep] = useState(Math.min(initialStep, STEP_TITLE_KEYS.length - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedViolation[]>([]);
  const draftIdRef = useRef(initialDraftId);
  const dupTitleRef = useRef(false);
  const isLast = step === STEP_TITLE_KEYS.length - 1;

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

  // A host with a single onboarded category has it auto-selected, so they never
  // see the extra choice; multi-category hosts must pick (enforced in next()).
  useEffect(() => {
    const sole = hostCategories[0];
    if (hostCategories.length === 1 && sole && !form.getValues('host_category_key')) {
      form.setValue('host_category_key', hostCategoryKeyOf(sole));
    }
  }, [hostCategories, form]);

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
    if (!(await form.trigger(STEP_FIELDS[step]))) return;
    // The category now sits above the title, so it gates the FIRST step — a host
    // should not fill a whole pod out and only then be told to pick one.
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
      const message = e instanceof Error ? e.message : t('mweb.createPod.createFailed');
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

  const jumpToStep = (target: number) => {
    setBlocked([]);
    setStep(target);
  };

  // Clubs are scoped by the selected host category (Super + Sub), then the picked
  // city and locality (helper shared with mobile + covered by unit tests).
  const podMode = form.watch('pod_mode');
  const clubsForLocation = filterClubs(clubs, {
    hostCategories,
    selectedCategoryKey: form.watch('host_category_key'),
    locationId: form.watch('location_id'),
    locality: form.watch('locality'),
    podMode,
  });

  // Step 3 venues are scoped to the selected club's auto-matched venues.
  const clubId = form.watch('club_id');
  const selectedClub = clubs.find((club) => club.id === clubId) ?? null;
  const clubVenueIds = new Set((selectedClub?.matched_venues ?? []).map((venue) => venue.id));
  // Only offer products whose category matches the selected club (Super + Sub).
  const availableProducts = filterProductsForClub(products, selectedClub) as CreatePodProduct[];

  // Changing the club (or the host category, which clears the club) changes what
  // Step 4 may offer, so any row the new club no longer offers has to go — it
  // would otherwise render blank, price at ₹0 and die on the server's category
  // gate at publish with nothing on screen explaining why. Native twin.
  useEffect(() => {
    const requests = form.getValues('product_requests');
    const kept = pruneProductRequests(requests, availableProducts);
    if (kept !== requests) form.setValue('product_requests', kept, { shouldDirty: true });
    // availableProducts is derived from club_id, so that is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, form]);

  // The picked slot feeds the Pricing panel (slot price + GST + earnings).
  const venueId = form.watch('venue_id');
  const slotId = form.watch('venue_slot_id');
  const slotsQuery = useQuery<{ venueAvailableSlots: CreatePodSlot[] }>(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId },
    skip: podMode !== 'PHYSICAL' || !venueId,
    fetchPolicy: 'cache-first',
  });
  const selectedSlot = (slotsQuery.data?.venueAvailableSlots ?? []).find((slot) => slot.id === slotId) ?? null;

  // How big this pod may be: floored by the sub-category's admin-set minimum
  // (a doubles game needs 4) and capped by the venue space the host booked. The
  // pod's sub-category is its club's `category_id`. Native twin (rule 27).
  const spots = spotsBounds({
    minPax: subCategories.find((sub) => sub.id === selectedClub?.category_id)?.min_pax,
    venueCapacity: podMode === 'PHYSICAL' ? selectedSlot?.capacity : null,
  });

  // Step-4 money lives here so the footer can block Create Pod on the same two
  // rules the panel renders (zero earnings / venue price not covered).
  const preview = useEarningsPreview({
    slotPrice: selectedSlot ? selectedSlot.price : null,
    podAmount: Number(form.watch('pod_amount')) || 0,
    noOfSpots: Number(form.watch('no_of_spots')) || 0,
    venueId: venueId || null,
    isPhysical: podMode === 'PHYSICAL',
    isFree: form.watch('pod_type') === 'FREE',
  });

  const steps = [
    <BasicsStep key="basics" form={form} hostCategories={hostCategories} />,
    <LocationClubStep key="location" form={form} clubs={clubsForLocation} locations={locations} />,
    <VenueSlotStep key="venue" form={form} venues={venues} clubVenueIds={clubVenueIds} viewerUserId={viewerUserId} />,
    <PricingStep key="pricing" form={form} products={availableProducts} showProducts={showProducts} preview={preview} spots={spots} />,
  ];

  return (
    <Stack spacing={2.5}>
      {/* The wizard renders ONE page at a time, so every tour step has to live on
          the page the host lands on. The hero carries the step counter and is
          what lets the walkthrough explain the four-step journey. */}
      <Box data-tour="create-pod-steps">
        <StepHero
          step={step}
          total={STEP_TITLE_KEYS.length}
          title={t(STEP_TITLE_KEYS[step])}
          subtitle={t(STEP_SUBTITLE_KEYS[step])}
        />
      </Box>
      {steps[step]}
      {error && <Alert severity="error">{error}</Alert>}
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
