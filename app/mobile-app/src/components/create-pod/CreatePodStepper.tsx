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
  CreatePodProduct,
  CreatePodVenue,
} from './create-pod.types';
import { ClubStep } from './steps/ClubStep';
import { WhenWhereStep } from './steps/WhenWhereStep';
import { AboutStep } from './steps/AboutStep';
import { OffersStep } from './steps/OffersStep';
import { PerksStep } from './steps/PerksStep';
import { ProductsStep } from './steps/ProductsStep';
import { PaymentStep } from './steps/PaymentStep';

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

/** 7-step host Create Pod stepper (mobile twin of mWeb): per-step validation
 * gates Next, the draft autosaves on a timer + every step change, and step 7
 * publishes the pod. */
export function CreatePodStepper({
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
  const [error, setError] = useState('');
  const draftIdRef = useRef(initialDraftId);
  const isLast = step === STEP_TITLES.length - 1;

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
            label={isLast ? (busy ? 'Creating…' : 'Create Pod') : 'Next'}
            loading={busy}
            onPress={() => (isLast ? void submit() : void next())}
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
