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
  CreatePodProduct,
  CreatePodVenue,
} from './create-pod.types';
import ClubStep from './steps/ClubStep';
import WhenWhereStep from './steps/WhenWhereStep';
import AboutStep from './steps/AboutStep';
import OffersStep from './steps/OffersStep';
import PerksStep from './steps/PerksStep';
import ProductsStep from './steps/ProductsStep';
import PaymentStep from './steps/PaymentStep';

export type DraftPayload = ReturnType<typeof serializeDraft>;

interface Props {
  initialValues: CreatePodFormValues;
  initialStep: number;
  initialDraftId: string | null;
  clubs: CreatePodClub[];
  venues: CreatePodVenue[];
  products: CreatePodProduct[];
  onSaveDraft: (draftId: string | null, payload: DraftPayload) => Promise<string>;
  onPublish: (draftId: string, input: ReturnType<typeof buildCreatePodInput>) => Promise<void>;
}

/** 7-step host Create Pod stepper: per-step validation gates Next, the draft
 * autosaves on a timer + every step change, and step 7 publishes the pod. */
export default function CreatePodStepper({
  initialValues,
  initialStep,
  initialDraftId,
  clubs,
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
  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftIdRef = useRef(initialDraftId);
  const isLast = step === STEP_TITLES.length - 1;

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
      setError(e instanceof Error ? e.message : 'Could not create the pod.');
    } finally {
      setBusy(false);
    }
  });

  const steps = [
    <ClubStep key="club" form={form} clubs={clubs} />,
    <WhenWhereStep key="when" form={form} clubs={clubs} venues={venues} />,
    <AboutStep key="about" form={form} />,
    <OffersStep key="offers" form={form} />,
    <PerksStep key="perks" form={form} />,
    <ProductsStep key="products" form={form} products={products} />,
    <PaymentStep key="payment" form={form} />,
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
