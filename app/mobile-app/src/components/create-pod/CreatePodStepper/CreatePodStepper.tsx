import { Text, YStack } from 'tamagui';

import { TourAnchor } from '@/tours/TourAnchor';
import { STEP_TITLE_KEYS } from '../create-pod.form';
import { BasicsStep } from '../steps/BasicsStep';
import { LocationClubStep } from '../steps/LocationClubStep';
import { VenueSlotStep } from '../steps/VenueSlotStep';
import { PricingStep } from '../steps/PricingStep';
import { AiMonitorOverlay } from '../AiMonitorOverlay';
import { AssignHostsField } from '../AssignHostsField';
import { StepperActions } from '../StepperActions';
import { StepHeader } from '../StepHeader';
import { ModerationBlockedDialog } from '../ModerationBlockedDialog';
import { buildStepperSubmit } from './stepperSubmit';
import type { CreatePodStepperProps } from './types';
import { useCreatePodForm } from './useCreatePodForm';
import { useCreatePodScope } from './useCreatePodScope';

/** 4-step host Create Pod stepper (mobile twin of mWeb): Category/Locality/Club
 * → Basics → Venue & Slot → Pricing. Per-step validation gates
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
  pinnedVenueId,
  finance,
  onSaveDraft,
  onModerate,
  onPublish,
  clubAdmin,
}: Readonly<CreatePodStepperProps>) {
  const state = useCreatePodForm({
    initialValues,
    initialStep,
    initialDraftId,
    hostCategories,
    onSaveDraft,
    clubAdmin,
  });
  const { t, form, showProducts, step, busy, error, blocked, hosts, setHosts } = state;
  const isLast = step === STEP_TITLE_KEYS.length - 1;
  const hostSubmitLabel = busy ? t('mweb.createPod.creating') : t('mweb.createPod.createPod');
  let submitLabel = hostSubmitLabel;
  if (clubAdmin) submitLabel = busy ? clubAdmin.busyLabel : clubAdmin.submitLabel;

  const { saveDraft, submit, jumpToStep } = buildStepperSubmit({
    clubAdmin,
    onModerate,
    onPublish,
    state,
  });

  const {
    clubsInCity,
    clubsForLocation,
    clubVenueIds,
    availableProducts,
    podMode,
    spots,
    pricing,
  } = useCreatePodScope({ form, clubs, products, subCategories, hostCategories, clubAdmin });

  const steps = [
    <LocationClubStep
      key="location"
      form={form}
      hostCategories={hostCategories}
      clubs={clubsForLocation}
      cityClubs={clubsInCity}
      locations={locations}
      pinnedClub={clubAdmin?.club ?? null}
    />,
    <BasicsStep key="basics" form={form} hostCategories={hostCategories} />,
    <VenueSlotStep
      key="venue"
      form={form}
      venues={venues}
      clubVenueIds={clubVenueIds}
      viewerUserId={viewerUserId}
      pinnedVenueId={pinnedVenueId}
    />,
    <PricingStep
      key="pricing"
      form={form}
      products={availableProducts}
      showProducts={showProducts}
      finance={finance}
      pricing={pricing}
      spots={spots}
      showTerms={!clubAdmin}
    />,
  ];

  return (
    <YStack gap={16} padding={16} paddingBottom={0}>
      {/* ONE page at a time, so every tour step lives on the page the host lands
          on — the header's step pills let the walkthrough explain the journey. */}
      <TourAnchor tour="create-pod" anchor="create-pod-steps">
        <StepHeader step={step} podMode={podMode} />
      </TourAnchor>
      {steps[step]}
      {clubAdmin && step === 1 ? (
        <AssignHostsField hosts={hosts} onChange={setHosts} search={clubAdmin.searchHosts} />
      ) : null}
      {error ? (
        <Text role="alert" testID="create-pod-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      <YStack
        marginHorizontal={-16}
        padding={16}
        paddingBottom={48}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$borderColor"
      >
        <StepperActions
          showBack={step > 0}
          backLabel={t('mweb.createPod.back')}
          onBack={() => state.goTo(step - 1)}
          isLast={isLast}
          submitLabel={submitLabel}
          nextLabel={t('mweb.createPod.next')}
          busy={busy}
          submitDisabled={isLast && pricing.blocked}
          onSubmit={submit}
          onNext={state.next}
          draftLabel={clubAdmin?.draftLabel}
          onSaveDraft={clubAdmin ? saveDraft : undefined}
        />
      </YStack>
      {/* The wait between pressing Create Pod and an answer IS the AI reading
          the pod, so it is named rather than left as a nameless spinner. */}
      <AiMonitorOverlay open={busy} />
      <ModerationBlockedDialog
        violations={blocked}
        onJump={jumpToStep}
        onClose={() => state.setBlocked([])}
      />
    </YStack>
  );
}
