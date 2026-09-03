import { useState } from 'react';
import { Button, ScrollView, Spinner, Text, XStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import {
  SlotRequestDecisionSheets,
  type DecisionCopy,
} from '@/components/venue-slot-requests/SlotRequestDecisionSheets';
import { useVenueSlotRequests, ALL_VENUES } from '@/hooks/useVenueSlotRequests';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Slot Requests — the RN twin of mWeb's venue-slot-requests-page.
 *
 * Same queue, same wording, same decisions: a pod stays unlisted until its slot
 * is approved, so a request sitting unread is a pod that cannot sell a seat.
 */

/** The decisions' own words — the same sentences mWeb's card shows in its two
 * dialogs. */
const DECISION_COPY: DecisionCopy = {
  approveLabel: 'Approve',
  approveMessage: 'The pod goes live and the host is told.',
  declineLabel: 'Decline',
  declineMessage:
    'The slot opens again and the host is told. A reason helps them ask better next time.',
};

export function VenueSlotRequestsScreen() {
  const { t } = useTranslation();
  const slots = useVenueSlotRequests();
  // A pod goes live the moment you say yes, so neither answer is a tap to make
  // by accident: approving asks once, declining takes a reason.
  const [approving, setApproving] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const dismiss = () => {
    setApproving(null);
    setDeclining(null);
  };
  const approve = () => {
    const slotId = approving;
    dismiss();
    if (slotId) slots.approve(slotId).catch(() => undefined);
  };
  const decline = () => {
    const slotId = declining;
    dismiss();
    if (slotId) slots.decline(slotId, reason.trim()).catch(() => undefined);
  };
  const openDecline = (slotId: string) => {
    setReason('');
    setDeclining(slotId);
  };

  return (
    <StackScreen
      title={t('mweb.venueSlotRequests.slotRequests')}
      testID="venue-slot-requests-screen"
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text fontSize={12.5} color="$muted">
          Hosts who want to run their pod at your venue. A pod only goes live after you approve its
          slot.
        </Text>

        {slots.venues.length > 1 && (
          <XStack gap={8} flexWrap="wrap">
            <Button
              size="$2"
              theme={slots.venueId === ALL_VENUES ? 'active' : undefined}
              onPress={() => slots.setVenueId(ALL_VENUES)}
            >
              {t('mweb.venueSlotRequests.allVenues')}
            </Button>
            {slots.venues.map((venue) => (
              <Button
                key={venue.id}
                size="$2"
                theme={slots.venueId === venue.id ? 'active' : undefined}
                onPress={() => slots.setVenueId(venue.id)}
              >
                {venue.venue_name || t('mweb.venueManagePage.untitledVenue')}
              </Button>
            ))}
          </XStack>
        )}

        {slots.feedback && (
          <Text
            pressStyle={PRESS_STYLE.inline}
            fontSize={12.5}
            color={slots.feedback.ok ? '$green10' : '$red10'}
            onPress={slots.clearFeedback}
            testID="slot-request-feedback"
          >
            {slots.feedback.text}
          </Text>
        )}

        {slots.isLoading && <Spinner />}

        {!slots.isLoading && slots.requests.length === 0 && (
          <Text fontSize={13} color="$muted">
            No pending slot requests right now. New ones appear here the moment a host books one of
            your slots.
          </Text>
        )}

        {slots.requests.map((request) => (
          <SlotRequestCard
            key={request.slot_id}
            request={request}
            busy={slots.busy}
            approveLabel={DECISION_COPY.approveLabel}
            declineLabel={DECISION_COPY.declineLabel}
            onApprove={setApproving}
            onDecline={openDecline}
          />
        ))}
      </ScrollView>

      <SlotRequestDecisionSheets
        approving={!!approving}
        declining={!!declining}
        reason={reason}
        onReason={setReason}
        copy={DECISION_COPY}
        onApprove={approve}
        onDecline={decline}
        onDismiss={dismiss}
      />
    </StackScreen>
  );
}
