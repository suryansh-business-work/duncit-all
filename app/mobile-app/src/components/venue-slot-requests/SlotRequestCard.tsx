import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { slotSpanLabel } from '@duncit/slots';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { VenueChatContactLink } from '@/components/chat/VenueChatContactLink';
import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SurfaceCard } from '@/components/SurfaceCard';
import { slotPriceLabel } from '@/components/venue-availability/slot-labels';
import { VenueOfferActions } from '@/components/venue-offer/VenueOfferActions';
import { OfferSummary } from '@/components/venue-slot-requests/OfferSummary';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { VenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';
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

/** The host's phone (dials) and email (opens mail), and the pod's venue chat. */
function HostReach({
  request,
  onChat,
}: Readonly<{ request: SlotRequestRow; onChat?: (podId: string) => void }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const id = request.slot_id;
  return (
    <YStack gap={6}>
      <Text fontSize={12} color="$muted">
        {t('mweb.venueSlotRequests.contact')}
      </Text>
      {request.host_phone || request.host_email ? (
        <XStack gap={16} flexWrap="wrap">
          {request.host_phone ? (
            <VenueChatContactLink kind="phone" value={request.host_phone} testID={`slot-request-${id}-phone`} />
          ) : null}
          {request.host_email ? (
            <VenueChatContactLink kind="email" value={request.host_email} testID={`slot-request-${id}-email`} />
          ) : null}
        </XStack>
      ) : (
        <Text fontSize={14} color="$color">
          —
        </Text>
      )}
      {onChat ? (
        <XStack>
          <DuncitButton
            testID={`slot-request-${id}-chat`}
            label={t('mweb.venueChat.chatWithHost')}
            variant="soft"
            size="sm"
            icon={<MaterialIcons name="chat-bubble-outline" size={16} color={accent} />}
            onPress={() => onChat(request.pod_id)}
          />
        </XStack>
      ) : null}
    </YStack>
  );
}

interface Props {
  request: SlotRequestRow;
  /** The venue's answers (`useVenueSlotRequests().answers`), each for the round on screen. */
  answers: VenueOfferAnswers;
  /** Opens the pod's venue chat with the host; left out, the card offers none. */
  onChat?: (podId: string) => void;
}

/** One booking request: the pod, the window it wants, who is asking, the host's
 * offer (or, from before offers, the slot price) and the answers — reject,
 * counter, accept. The RN twin of the web OfferRequestCard (rule 27). */
export function SlotRequestCard({ request, answers, onChat }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { offer } = request;
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
        {/* An offer names where it stands itself (OfferSummary); an old request only waits. */}
        {offer ? null : (
          <XStack
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
            backgroundColor="$warning"
          >
            <Text fontSize={11} fontWeight="600" color="$onDanger">
              {t('mweb.venueSlotRequests.awaitingDecision')}
            </Text>
          </XStack>
        )}
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      {/* A free pod's venue charges are settled with the host off the platform,
       * so the owner reads this instead of a price (the server sends 0). */}
      {request.pod_is_free ? (
        <YStack role="status" testID="slot-request-free-pod-notice">
          <NoticeCard
            tone="warning"
            title={t('mweb.venueSlotRequests.freePodTitle')}
            body={t('mweb.venueSlotRequests.freePodNotice')}
          />
        </YStack>
      ) : null}

      <YStack gap={10}>
        <Detail label={t('mweb.common.venue')} value={request.venue_name} />
        <Detail label={t('mweb.venueSlotRequests.slot')} value={slotWindow} />
        {request.pod_is_free || offer ? null : (
          <Detail
            label={t('mweb.venueSlotRequests.slotPrice')}
            value={slotPriceLabel(request, t)}
          />
        )}
        <Detail
          label={t('mweb.venueSlotRequests.requested')}
          value={fmt.formatDateTime(request.requested_at) || '—'}
        />
        <Detail label={t('mweb.venueSlotRequests.host')} value={request.host_name || '—'} />
        <HostReach request={request} onChat={onChat} />
      </YStack>

      {offer ? <OfferSummary offer={offer} podIsFree={request.pod_is_free} /> : null}

      <VenueOfferActions
        slotId={request.slot_id}
        offer={offer}
        subject={request}
        answers={answers}
        testIDPrefix={`slot-request-${request.slot_id}`}
      />
    </SurfaceCard>
  );
}
