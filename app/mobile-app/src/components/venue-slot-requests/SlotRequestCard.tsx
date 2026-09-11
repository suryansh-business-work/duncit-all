import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { slotSpanLabel } from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { slotPriceLabel } from '@/components/venue-availability/slot-labels';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack gap={2}>
      <Text fontSize={12} color="$muted">
        {label}
      </Text>
      <Text fontSize={14} color="$color">
        {value}
      </Text>
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
 * two answers — decline as an outlined danger pill, approve as the green one.
 * The RN twin of mWeb's SlotRequestCard (rule 27). */
export function SlotRequestCard({ request, busy, onApprove, onDecline }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { danger, onPrimary } = useThemeColors();
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
    <SurfaceCard gap={14} testID={`slot-request-${request.slot_id}`}>
      <XStack alignItems="flex-start" gap={8}>
        <YStack flex={1} gap={2}>
          <Text fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
            {request.pod_title}
          </Text>
          <Text fontSize={13} color="$muted">
            {request.pod_description || t('mweb.podDetails.aboutEmpty')}
          </Text>
        </YStack>
        <XStack
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={999}
          backgroundColor="$warning"
        >
          <Text fontSize={11} fontWeight="600" color="$onPrimary">
            {t('mweb.venueSlotRequests.awaitingDecision')}
          </Text>
        </XStack>
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      <YStack gap={10}>
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
      </YStack>

      <XStack gap={8}>
        <YStack flex={1}>
          <DuncitButton
            label={t('mweb.venueSlotRequests.decline')}
            onPress={() => onDecline(request.slot_id)}
            variant="outline"
            tone="danger"
            disabled={busy}
            fullWidth
            icon={<MaterialIcons name="close" size={18} color={danger} />}
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('mweb.venueSlotRequests.approve')}
            onPress={() => onApprove(request)}
            disabled={busy}
            fullWidth
            icon={<MaterialIcons name="check" size={18} color={onPrimary} />}
          />
        </YStack>
      </XStack>
    </SurfaceCard>
  );
}
