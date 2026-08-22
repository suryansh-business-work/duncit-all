import { Alert } from 'react-native';
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import {
  useVenueSlotRequests,
  type SlotRequestRow,
  ALL_VENUES,
} from '@/hooks/useVenueSlotRequests';
import { formatDate, formatDateTime, formatTime } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Slot Requests — the RN twin of mWeb's venue-slot-requests-page.
 *
 * Same queue, same wording, same decisions: a pod stays unlisted until its slot
 * is approved, so a request sitting unread is a pod that cannot sell a seat.
 */

const fmtDay = (d: Date) => formatDate(d);

/** Same reading as mWeb's slotWindow: both dates when the booking spans days,
 * and "Whole day" instead of times for whole-day bookings. The end instant is
 * exclusive, so a slot ending exactly at midnight claims no extra day. */
const fmtWindow = (row: SlotRequestRow) => {
  const start = new Date(row.start_at);
  const end = new Date(row.end_at);
  if (Number.isNaN(start.getTime())) return '—';
  const time = (d: Date) => formatTime(d);
  const multiDay = start.toDateString() !== new Date(end.getTime() - 1).toDateString();
  if (row.whole_day) {
    return multiDay
      ? `Whole day · ${fmtDay(start)} – ${fmtDay(end)}`
      : `Whole day · ${fmtDay(start)}`;
  }
  if (multiDay) {
    return `${fmtDay(start)} · ${time(start)} – ${fmtDay(end)} · ${time(end)}`;
  }
  return `${fmtDay(start)} · ${time(start)} – ${time(end)}`;
};

const fmtRequested = (iso: string) => {
  const d = new Date(iso);
  return formatDateTime(d) || '—';
};

const fmtPrice = (price: number) => (price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free');

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack gap={2}>
      <Text fontSize={11} color="$muted">
        {label}
      </Text>
      <Text fontSize={13}>{value}</Text>
    </YStack>
  );
}

function RequestCard({
  request,
  busy,
  onApprove,
  onDecline,
}: Readonly<{
  request: SlotRequestRow;
  busy: boolean;
  onApprove: (slotId: string) => void;
  onDecline: (slotId: string) => void;
}>) {
  const { t } = useTranslation();
  return (
    <YStack
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      testID={`slot-request-${request.slot_id}`}
    >
      <YStack gap={2}>
        <Text fontSize={15} fontWeight="800">
          {request.pod_title}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {request.pod_description || 'No description provided.'}
        </Text>
      </YStack>

      <Detail label={t('mweb.common.venue')} value={request.venue_name} />
      <Detail label={t('mweb.venueSlotRequests.slot')} value={fmtWindow(request)} />
      <Detail label={t('mweb.venueSlotRequests.slotPrice')} value={fmtPrice(request.price)} />
      <Detail
        label={t('mweb.venueSlotRequests.requested')}
        value={fmtRequested(request.requested_at)}
      />
      <Detail label={t('mweb.venueSlotRequests.host')} value={request.host_name || '—'} />
      <Detail
        label={t('mweb.venueSlotRequests.contact')}
        value={[request.host_email, request.host_phone].filter(Boolean).join(' · ') || '—'}
      />

      <XStack gap={8} justifyContent="flex-end">
        <Button size="$3" disabled={busy} onPress={() => onDecline(request.slot_id)}>
          Decline
        </Button>
        <Button size="$3" theme="active" disabled={busy} onPress={() => onApprove(request.slot_id)}>
          Approve
        </Button>
      </XStack>
    </YStack>
  );
}

export function VenueSlotRequestsScreen() {
  const { t } = useTranslation();
  const slots = useVenueSlotRequests();

  // A pod goes live the moment you say yes, so neither answer is a tap to make
  // by accident. Rule 12 is a portal rule; RN's Alert IS the platform dialog.
  const confirmApprove = (slotId: string) => {
    Alert.alert('Approve this booking?', 'The pod goes live and the host is told.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => {
          slots.approve(slotId).catch(() => undefined);
        },
      },
    ]);
  };

  const confirmDecline = (slotId: string) => {
    Alert.alert('Decline this booking?', 'The slot opens again and the host is told.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => {
          slots.decline(slotId, '').catch(() => undefined);
        },
      },
    ]);
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
              All venues
            </Button>
            {slots.venues.map((venue) => (
              <Button
                key={venue.id}
                size="$2"
                theme={slots.venueId === venue.id ? 'active' : undefined}
                onPress={() => slots.setVenueId(venue.id)}
              >
                {venue.venue_name || 'Untitled venue'}
              </Button>
            ))}
          </XStack>
        )}

        {slots.feedback && (
          <Text
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
          <RequestCard
            key={request.slot_id}
            request={request}
            busy={slots.busy}
            onApprove={confirmApprove}
            onDecline={confirmDecline}
          />
        ))}
      </ScrollView>
    </StackScreen>
  );
}
