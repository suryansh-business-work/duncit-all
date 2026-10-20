import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToneChip } from '@/components/brand-orders/ToneChip';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { EventRequestRow } from '@/hooks/useVenueEventRequests';
import { eventStatusChip, isAnswerable } from './event-request-status';

export type EventAnswer = 'ACCEPT' | 'REJECT' | 'COUNTER';

interface Props {
  request: EventRequestRow;
  busy: boolean;
  onAnswer: (request: EventRequestRow, answer: EventAnswer) => void;
}

/** One request: who asked which venue for what, its status, any offer the
 * owner made (with what the venue receives for it) and the three answers. */
export function EventRequestCard({ request, busy, onAnswer }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const chip = eventStatusChip(request.status, t);
  const offer = request.offer;

  return (
    <SurfaceCard gap={8} testID={`event-request-${request.id}`}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <Text flex={1} fontSize={15} fontWeight="600" color="$color" numberOfLines={2}>
          {request.target_name}
        </Text>
        <ToneChip
          label={chip.label}
          tone={chip.tone}
          testID={`event-request-${request.id}-status`}
        />
      </XStack>
      <Text fontSize={13} color="$color">
        {t('availability.eventInbox.requestedBy', { vars: { name: request.requester_name } })}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('availability.eventInbox.requestedOn', {
          vars: { date: fmt.formatDate(request.created_at) },
        })}
      </Text>
      {request.note ? (
        <YStack gap={2}>
          <Text fontSize={12} color="$muted">
            {t('availability.eventInbox.theirNote')}
          </Text>
          <Text fontSize={14} color="$color">
            {request.note}
          </Text>
        </YStack>
      ) : null}
      {offer ? (
        <YStack gap={2} testID={`event-request-${request.id}-offer`}>
          <Text fontSize={13} color="$color">
            {t('availability.eventInbox.offer', {
              vars: {
                window: `${fmt.formatDateTime(offer.start_at)} – ${fmt.formatTime(offer.end_at)}`,
              },
            })}
          </Text>
          {offer.pax > 0 ? (
            <Text fontSize={12} color="$muted">
              {t('availability.eventInbox.offerGuests', { vars: { count: offer.pax } })}
            </Text>
          ) : null}
          {offer.quote ? (
            <Text fontSize={12} color="$muted">
              {t('availability.eventInbox.offerPayout', {
                vars: { amount: formatMoney(offer.quote.venue_payout, { decimals: 2 }) },
              })}
            </Text>
          ) : null}
        </YStack>
      ) : null}
      {request.response_note ? (
        <YStack gap={2}>
          <Text fontSize={12} color="$muted">
            {t('availability.eventInbox.yourNote')}
          </Text>
          <Text fontSize={14} color="$color">
            {request.response_note}
          </Text>
        </YStack>
      ) : null}
      {isAnswerable(request.status) ? (
        <XStack gap={8} flexWrap="wrap" justifyContent="flex-end">
          <DuncitButton
            testID={`event-request-${request.id}-reject`}
            label={t('availability.eventInbox.reject')}
            onPress={() => onAnswer(request, 'REJECT')}
            disabled={busy}
            variant="outline"
            tone="danger"
            size="sm"
          />
          <DuncitButton
            testID={`event-request-${request.id}-counter`}
            label={t('availability.eventInbox.counter')}
            onPress={() => onAnswer(request, 'COUNTER')}
            disabled={busy}
            variant="outline"
            tone="neutral"
            size="sm"
          />
          <DuncitButton
            testID={`event-request-${request.id}-accept`}
            label={t('availability.eventInbox.accept')}
            onPress={() => onAnswer(request, 'ACCEPT')}
            disabled={busy}
            size="sm"
          />
        </XStack>
      ) : null}
    </SurfaceCard>
  );
}
