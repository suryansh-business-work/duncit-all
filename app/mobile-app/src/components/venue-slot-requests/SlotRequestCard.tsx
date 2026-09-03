import { Button, Text, XStack, YStack } from 'tamagui';

import { slotPriceLabel } from '@/components/venue-availability/slot-labels';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { formatDate, formatDateTime, formatTime } from '@/utils/date-format';

/** Same reading as mWeb's slotWindow: both dates when the booking spans days,
 * and "Whole day" instead of times for whole-day bookings. The end instant is
 * exclusive, so a slot ending exactly at midnight claims no extra day. */
function slotWindow(row: SlotRequestRow, t: Translate): string {
  const start = new Date(row.start_at);
  const end = new Date(row.end_at);
  if (Number.isNaN(start.getTime())) return '—';
  const multiDay = start.toDateString() !== new Date(end.getTime() - 1).toDateString();
  if (row.whole_day) {
    const days = multiDay ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
    return `${t('availability.wholeDay')} · ${days}`;
  }
  if (multiDay) {
    return `${formatDate(start)} · ${formatTime(start)} – ${formatDate(end)} · ${formatTime(end)}`;
  }
  return `${formatDate(start)} · ${formatTime(start)} – ${formatTime(end)}`;
}

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

interface Props {
  request: SlotRequestRow;
  busy: boolean;
  /** The two decision buttons' words — the screen owns the decision copy. */
  approveLabel: string;
  declineLabel: string;
  onApprove: (slotId: string) => void;
  onDecline: (slotId: string) => void;
}

/** One pending request: the pod, the slot it wants, who is asking, and the
 * two answers. The RN twin of mWeb's SlotRequestCard (rule 27). */
export function SlotRequestCard({
  request,
  busy,
  approveLabel,
  declineLabel,
  onApprove,
  onDecline,
}: Readonly<Props>) {
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
          {request.pod_description || t('mweb.podDetails.aboutEmpty')}
        </Text>
      </YStack>

      <Detail label={t('mweb.common.venue')} value={request.venue_name} />
      <Detail label={t('mweb.venueSlotRequests.slot')} value={slotWindow(request, t)} />
      <Detail
        label={t('mweb.venueSlotRequests.slotPrice')}
        value={slotPriceLabel(request.price, t)}
      />
      <Detail
        label={t('mweb.venueSlotRequests.requested')}
        value={formatDateTime(request.requested_at) || '—'}
      />
      <Detail label={t('mweb.venueSlotRequests.host')} value={request.host_name || '—'} />
      <Detail
        label={t('mweb.venueSlotRequests.contact')}
        value={[request.host_email, request.host_phone].filter(Boolean).join(' · ') || '—'}
      />

      <XStack gap={8} justifyContent="flex-end">
        <Button size="$3" disabled={busy} onPress={() => onDecline(request.slot_id)}>
          {declineLabel}
        </Button>
        <Button size="$3" theme="active" disabled={busy} onPress={() => onApprove(request.slot_id)}>
          {approveLabel}
        </Button>
      </XStack>
    </YStack>
  );
}
