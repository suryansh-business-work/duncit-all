import { useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { SelectChip } from '@/components/venue-availability/SelectChip';
import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import { SlotRequestDecisionSheets } from '@/components/venue-slot-requests/SlotRequestDecisionSheets';
import { VenueOfferCounterForm } from '@/forms/venue-offer-counter';
import {
  useVenueSlotRequests,
  ALL_VENUES,
  type CounterTerms,
  type SlotRequestRow,
} from '@/hooks/useVenueSlotRequests';
import { currentOfferTerms } from '@duncit/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** Called after any decision, so the answered history below re-reads too. */
  onDecided: () => void;
}

/**
 * Booking requests waiting on the venue — hosts' offers to run a pod there —
 * on Workshop & Event Requests' first tab: accept, reject, or counter with the
 * venue's own terms (which the host then accepts or declines). A request from
 * before offers keeps accept / reject only.
 */
export function SlotRequestQueue({ onDecided }: Readonly<Props>) {
  const { t } = useTranslation();
  const slots = useVenueSlotRequests();
  // A pod goes live the moment you say yes, so neither answer is a tap to make
  // by accident: approving asks once, declining takes a reason.
  const [approving, setApproving] = useState<SlotRequestRow | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [countering, setCountering] = useState<SlotRequestRow | null>(null);
  const counterOffer = countering?.offer ?? null;

  const dismiss = () => {
    setApproving(null);
    setDeclining(null);
  };
  const settle = (run: Promise<void>) => {
    run.then(onDecided).catch(() => undefined);
  };
  const approve = () => {
    const slotId = approving?.slot_id;
    dismiss();
    if (slotId) settle(slots.approve(slotId));
  };
  const decline = () => {
    const slotId = declining;
    dismiss();
    if (slotId) settle(slots.decline(slotId, reason.trim()));
  };
  const sendCounter = (terms: CounterTerms, note: string) => {
    const slotId = countering?.slot_id;
    setCountering(null);
    if (slotId) settle(slots.counter(slotId, terms, note.trim()));
  };
  const openDecline = (slotId: string) => {
    setReason('');
    setDeclining(slotId);
  };
  const card = (request: SlotRequestRow) => (
    <SlotRequestCard
      key={request.slot_id}
      request={request}
      busy={slots.busy}
      onApprove={setApproving}
      onDecline={openDecline}
      onCounter={setCountering}
    />
  );

  return (
    <YStack gap={16} testID="slot-request-queue">
      {slots.venues.length > 1 && (
        <XStack gap={8} flexWrap="wrap" role="radiogroup" aria-label={t('mweb.common.venue')}>
          <SelectChip
            testID="slot-requests-venue-all"
            role="radio"
            label={t('mweb.venueSlotRequests.allVenues')}
            selected={slots.venueId === ALL_VENUES}
            onPress={() => slots.setVenueId(ALL_VENUES)}
          />
          {slots.venues.map((venue) => (
            <SelectChip
              key={venue.id}
              testID={`slot-requests-venue-${venue.id}`}
              role="radio"
              label={venue.venue_name || t('mweb.venueManagePage.untitledVenue')}
              selected={slots.venueId === venue.id}
              onPress={() => slots.setVenueId(venue.id)}
            />
          ))}
        </XStack>
      )}

      {slots.feedback && (
        <Text
          role="button"
          hitSlop={12}
          pressStyle={PRESS_STYLE.inline}
          fontSize={13}
          color={slots.feedback.ok ? '$success' : '$danger'}
          onPress={slots.clearFeedback}
          aria-live="polite"
          testID="slot-request-feedback"
        >
          {slots.feedback.text}
        </Text>
      )}

      {slots.isLoading && (
        <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
      )}

      {!slots.isLoading && slots.requests.length === 0 && (
        <Text fontSize={14} color="$muted" textAlign="center">
          {t('mweb.venueSlotRequests.empty')}
        </Text>
      )}

      {slots.requests.map(card)}

      <SlotRequestDecisionSheets
        approving={approving}
        declining={!!declining}
        reason={reason}
        onReason={setReason}
        onApprove={approve}
        onDecline={decline}
        onDismiss={dismiss}
      />
      {countering && counterOffer ? (
        <VenueOfferCounterForm
          slotId={countering.slot_id}
          terms={currentOfferTerms(counterOffer)}
          busy={slots.busy}
          onClose={() => setCountering(null)}
          onSend={sendCounter}
        />
      ) : null}
    </YStack>
  );
}
