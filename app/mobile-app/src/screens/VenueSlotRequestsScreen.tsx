import { useState } from 'react';
import { Spinner, Text, XStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SelectChip } from '@/components/venue-availability/SelectChip';
import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import { SlotRequestDecisionSheets } from '@/components/venue-slot-requests/SlotRequestDecisionSheets';
import { SeriesRequestGroup } from '@/components/venue-slot-requests/SeriesRequestGroup';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { groupSlotRequestsBySeries } from '@duncit/utils';
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
  // A recurring pod answered as a whole: the series being accepted / declined.
  const [approvingSeries, setApprovingSeries] = useState<string | null>(null);
  const [decliningSeries, setDecliningSeries] = useState<string | null>(null);

  const dismiss = () => {
    setApproving(null);
    setDeclining(null);
    setApprovingSeries(null);
    setDecliningSeries(null);
  };
  const seriesResult = (approveAll: boolean) => (decided: number, failed: number) => {
    const text = approveAll
      ? t('mweb.podSeries.acceptedAll', { vars: { count: decided } })
      : t('mweb.podSeries.declinedAll', { vars: { count: decided } });
    return failed ? `${text} ${t('mweb.podSeries.someFailed', { vars: { count: failed } })}` : text;
  };
  const approveSeries = () => {
    const seriesId = approvingSeries;
    dismiss();
    if (seriesId) slots.decideSeries(seriesId, true, '', seriesResult(true)).catch(() => undefined);
  };
  const approve = () => {
    const slotId = approving?.slot_id;
    dismiss();
    if (slotId) slots.approve(slotId).catch(() => undefined);
  };
  const decline = () => {
    const slotId = declining;
    const seriesId = decliningSeries;
    dismiss();
    if (seriesId)
      slots
        .decideSeries(seriesId, false, reason.trim(), seriesResult(false))
        .catch(() => undefined);
    else if (slotId) slots.decline(slotId, reason.trim()).catch(() => undefined);
  };
  const card = (request: SlotRequestRow) => (
    <SlotRequestCard
      key={request.slot_id}
      request={request}
      busy={slots.busy}
      onApprove={setApproving}
      onDecline={openDecline}
    />
  );
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

        {groupSlotRequestsBySeries(slots.requests, (r) => r.slot_id).map((group) =>
          group.kind === 'SERIES' ? (
            <SeriesRequestGroup
              key={group.key}
              rows={group.rows}
              busy={slots.busy}
              onApproveAll={() => setApprovingSeries(group.seriesId)}
              onDeclineAll={() => {
                setReason('');
                setDecliningSeries(group.seriesId);
              }}
              renderRow={card}
            />
          ) : (
            card(group.row)
          ),
        )}
      </RefreshScrollView>

      <SlotRequestDecisionSheets
        approving={approving}
        declining={!!declining || !!decliningSeries}
        reason={reason}
        onReason={setReason}
        onApprove={approve}
        onDecline={decline}
        onDismiss={dismiss}
      />
      <ConfirmDialog
        open={!!approvingSeries}
        testID="slot-series-approve"
        title={t('mweb.podSeries.acceptAllTitle')}
        message={t('mweb.podSeries.acceptAllMessage')}
        confirmLabel={t('mweb.venueSlotRequests.approve')}
        onConfirm={approveSeries}
        onCancel={dismiss}
      />
    </StackScreen>
  );
}
