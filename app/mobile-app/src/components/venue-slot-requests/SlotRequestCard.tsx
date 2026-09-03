import { Button, Text, XStack, YStack } from 'tamagui';
import { slotSpanLabel } from '@duncit/slots';

import { slotPriceLabel } from '@/components/venue-availability/slot-labels';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';
import { useTranslation } from '@/hooks/useTranslation';

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
  onApprove: (request: SlotRequestRow) => void;
  onDecline: (slotId: string) => void;
}

/** One pending request: the pod, the slot it wants, who is asking, and the
 * two answers. The RN twin of mWeb's SlotRequestCard (rule 27). */
export function SlotRequestCard({ request, busy, onApprove, onDecline }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  // The shared when-sentence — whole-day and multi-day aware — that the
  // Partners console prints for the same request (rule 40).
  const slotWindow = slotSpanLabel(
    request.start_at,
    request.end_at,
    request.whole_day,
    fmt,
    t('availability.wholeDay'),
  );

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
      <Detail label={t('mweb.venueSlotRequests.slot')} value={slotWindow} />
      <Detail
        label={t('mweb.venueSlotRequests.slotPrice')}
        value={slotPriceLabel(request.price, t)}
      />
      <Detail
        label={t('mweb.venueSlotRequests.requested')}
        value={fmt.formatDateTime(request.requested_at) || '—'}
      />
      <Detail label={t('mweb.venueSlotRequests.host')} value={request.host_name || '—'} />
      <Detail
        label={t('mweb.venueSlotRequests.contact')}
        value={[request.host_email, request.host_phone].filter(Boolean).join(' · ') || '—'}
      />

      <XStack gap={8} justifyContent="flex-end">
        <Button size="$3" disabled={busy} onPress={() => onDecline(request.slot_id)}>
          {t('mweb.venueSlotRequests.decline')}
        </Button>
        <Button size="$3" theme="active" disabled={busy} onPress={() => onApprove(request)}>
          {t('mweb.venueSlotRequests.approve')}
        </Button>
      </XStack>
    </YStack>
  );
}
