import { Text, YStack } from 'tamagui';
import { CREATE_POD_STEP_COUNT, CREATE_POD_WHERE_STEP, createPodSendsOffer } from '@duncit/utils';

import { TourAnchor } from '@/tours/TourAnchor';
import { stepTitleKey } from '../create-pod.form';
import { WhatStep } from '../steps/WhatStep';
import { WhereWhenStep } from '../steps/WhereWhenStep';
import { MoneyStep } from '../steps/MoneyStep';
import { DetailsStep } from '../steps/DetailsStep';
import { AiMonitorOverlay } from '../AiMonitorOverlay';
import { AssignHostsField } from '../AssignHostsField';
import { StepperActions } from '../StepperActions';
import { StepHeader } from '../StepHeader';
import { ModerationBlockedDialog } from '../ModerationBlockedDialog';
import { buildStepperSubmit } from './stepperSubmit';
import type { CreatePodStepperProps } from './types';
import { useCreatePodForm } from './useCreatePodForm';
import { useCreatePodScope } from './useCreatePodScope';

/** Host Create Pod stepper (mobile twin of mWeb): What (category, mode) →
 * Where & when (locality, club, venue and slot, or a virtual meeting) → Money
 * (the venue offer, when the pod sends one, and the ticket) → Details.
 * Per-step validation gates Next; tapping "Create Pod" runs the AI + rules
 * moderation preflight and only publishes when the content is clean. */
export function CreatePodStepper({
  initialValues,
  initialStep,
  initialDraftId,
  clubs,
  locations,
  venues,
  products,
  subCategories,
  categoryIcons,
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
    venues,
  });
  const { t, form, showProducts, step, busy, error, blocked, hosts, setHosts } = state;
  const isLast = step === CREATE_POD_STEP_COUNT - 1;
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
    offerMinGuests,
    pricing,
    venueNotice,
    venueQuote,
  } = useCreatePodScope({
    form,
    clubs,
    products,
    subCategories,
    hostCategories,
    clubAdmin,
    venues,
    viewerUserId,
  });
  const pinnedClub = clubAdmin?.club ?? null;
  const sendsOffer = createPodSendsOffer({
    pod_mode: podMode,
    partner_request_id: form.watch('partner_request_id'),
    venue_slot_id: form.watch('venue_slot_id'),
  });
  const nextLabel = isLast
    ? t('mweb.createPod.next')
    : t('mweb.createPod.nextTo', { vars: { step: t(stepTitleKey(step + 1, podMode)) } });

  const steps = [
    <WhatStep
      key="what"
      form={form}
      hostCategories={hostCategories}
      categoryIcons={categoryIcons}
      pinnedClub={!!pinnedClub}
    />,
    <WhereWhenStep
      key="where"
      form={form}
      clubs={clubsForLocation}
      cityClubs={clubsInCity}
      locations={locations}
      venues={venues}
      clubVenueIds={clubVenueIds}
      currencySymbol={finance.currency_symbol}
      pinnedVenueId={pinnedVenueId}
      venueNotice={venueNotice}
      spots={spots}
      offerMinGuests={offerMinGuests}
      pinnedClub={pinnedClub}
    />,
    <MoneyStep
      key="money"
      form={form}
      venues={venues}
      sendsOffer={sendsOffer}
      quote={venueQuote}
      products={availableProducts}
      showProducts={showProducts}
      finance={finance}
      pricing={pricing}
      venueNotice={venueNotice}
      forClubAdmin={!!clubAdmin}
    />,
    <DetailsStep
      key="details"
      form={form}
      hostCategories={hostCategories}
      venues={venues}
      currencySymbol={finance.currency_symbol}
      onEditWhen={() => state.goTo(CREATE_POD_WHERE_STEP)}
      showTerms={!clubAdmin}
      assignHosts={
        clubAdmin ? <AssignHostsField hosts={hosts} onChange={setHosts} search={clubAdmin.searchHosts} /> : null
      }
    />,
  ];

  return (
    <YStack gap={16} padding={16} paddingBottom={0}>
      {/* ONE page at a time, so every tour step lives on the page the host lands
          on — the header's step pills let the walkthrough explain the journey. */}
      <TourAnchor tour="create-pod" anchor="create-pod-steps">
        <StepHeader step={step} podMode={podMode} sendsOffer={sendsOffer} />
      </TourAnchor>
      {steps[step]}
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
          onBack={state.back}
          isLast={isLast}
          submitLabel={submitLabel}
          nextLabel={nextLabel}
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
