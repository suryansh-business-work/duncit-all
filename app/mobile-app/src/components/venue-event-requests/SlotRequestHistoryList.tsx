import { Spinner, Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToneChip } from '@/components/brand-orders/ToneChip';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { SlotRequestHistoryRow } from '@/hooks/useSlotRequestHistory';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  rows: readonly SlotRequestHistoryRow[];
  isLoading: boolean;
  error: string | null;
}

/** Slot requests answered before instant booking — read-only, newest decision first. */
export function SlotRequestHistoryList({ rows, isLoading, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();

  return (
    <YStack gap={12} testID="slot-request-history">
      <SectionHeader title={t('availability.eventInbox.history.pastTitle')} />
      {isLoading ? <Spinner color="$primary" /> : null}
      {error ? (
        <Text role="alert" testID="slot-request-history-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {!isLoading && !error && rows.length === 0 ? (
        <Text testID="slot-request-history-empty" fontSize={14} color="$muted">
          {t('availability.eventInbox.history.empty')}
        </Text>
      ) : null}
      {rows.map((row) => {
        const approved = row.decision === 'APPROVED';
        return (
          <SurfaceCard key={row.slot_id} gap={6} testID={`slot-request-history-${row.slot_id}`}>
            <XStack justifyContent="space-between" alignItems="center" gap={8}>
              <Text flex={1} fontSize={15} fontWeight="600" color="$color" numberOfLines={2}>
                {row.pod_title}
              </Text>
              <ToneChip
                label={
                  approved
                    ? t('availability.eventInbox.history.approved')
                    : t('availability.eventInbox.history.declined')
                }
                tone={approved ? 'done' : 'failed'}
              />
            </XStack>
            <Text fontSize={13} color="$muted">
              {row.venue_name}
            </Text>
            <Text fontSize={13} color="$color">
              {`${fmt.formatDateTime(row.start_at)} – ${fmt.formatTime(row.end_at)}`}
            </Text>
            {row.decided_at ? (
              <Text fontSize={12} color="$muted">
                {t('availability.eventInbox.history.decidedOn', {
                  vars: { date: fmt.formatDate(row.decided_at) },
                })}
              </Text>
            ) : null}
            {row.decline_reason ? (
              <Text fontSize={12} color="$muted">
                {t('availability.eventInbox.history.reason', {
                  vars: { reason: row.decline_reason },
                })}
              </Text>
            ) : null}
          </SurfaceCard>
        );
      })}
    </YStack>
  );
}
