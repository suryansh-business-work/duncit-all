import { useState } from 'react';
import { Spinner, Text, XStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SelectChip } from '@/components/venue-availability/SelectChip';
import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import { SlotRequestDecisionSheets } from '@/components/venue-slot-requests/SlotRequestDecisionSheets';
import {
  useVenueSlotRequests,
  ALL_VENUES,
  type SlotRequestRow,
} from '@/hooks/useVenueSlotRequests';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/**
 * Slot Requests — the RN twin of mWeb's venue-slot-requests-page.
 *
 * Same queue, same wording, same decisions: a pod stays unlisted until its slot
 * is approved, so a request sitting unread is a pod that cannot sell a seat.
 */
export function VenueSlotRequestsScreen() {
  const { t } = useTranslation();
  const slots = useVenueSlotRequests();
  // A pod goes live the moment you say yes, so neither answer is a tap to make
  // by accident: approving asks once, declining takes a reason.
  const [approving, setApproving] = useState<SlotRequestRow | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const dismiss = () => {
    setApproving(null);
    setDeclining(null);
  };
  const approve = () => {
    const slotId = approving?.slot_id;
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
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {slots.venues.length > 1 && (
          <XStack gap={8} flexWrap="wrap" aria-label={t('mweb.common.venue')}>
            <SelectChip
              testID="slot-requests-venue-all"
              label={t('mweb.venueSlotRequests.allVenues')}
              selected={slots.venueId === ALL_VENUES}
              onPress={() => slots.setVenueId(ALL_VENUES)}
            />
            {slots.venues.map((venue) => (
              <SelectChip
                key={venue.id}
                testID={`slot-requests-venue-${venue.id}`}
                label={venue.venue_name || t('mweb.venueManagePage.untitledVenue')}
                selected={slots.venueId === venue.id}
                onPress={() => slots.setVenueId(venue.id)}
              />
            ))}
          </XStack>
        )}

        {slots.feedback && (
          <Text
            pressStyle={PRESS_STYLE.inline}
            fontSize={13}
            color={slots.feedback.ok ? '$success' : '$danger'}
            onPress={slots.clearFeedback}
            testID="slot-request-feedback"
          >
            {slots.feedback.text}
          </Text>
        )}

        {slots.isLoading && <Spinner color="$primary" />}

        {!slots.isLoading && slots.requests.length === 0 && (
          <Text fontSize={14} color="$muted" textAlign="center">
            {t('mweb.venueSlotRequests.empty')}
          </Text>
        )}

        {slots.requests.map((request) => (
          <SlotRequestCard
            key={request.slot_id}
            request={request}
            busy={slots.busy}
            onApprove={setApproving}
            onDecline={openDecline}
          />
        ))}
      </RefreshScrollView>

      <SlotRequestDecisionSheets
        approving={approving}
        declining={!!declining}
        reason={reason}
        onReason={setReason}
        onApprove={approve}
        onDecline={decline}
        onDismiss={dismiss}
      />
    </StackScreen>
  );
}
