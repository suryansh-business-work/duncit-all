import { useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useBouncer, type CallbackHistoryItem } from '@/hooks/useBouncer';
import { durationLabel } from '@/utils/support-chat';
import { formatDateTime } from '@/utils/date-format';
import { StatusPill } from './StatusPill';

/** Previous callback requests with date, call duration and conclusion (Bug 5). */
export function CallbackHistory({ refreshKey = 0 }: Readonly<{ refreshKey?: number }>) {
  const { listMyCallbacks } = useBouncer();
  const [items, setItems] = useState<CallbackHistoryItem[]>([]);

  useEffect(() => {
    let on = true;
    listMyCallbacks()
      .then((rows) => on && setItems(rows))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [listMyCallbacks, refreshKey]);

  if (items.length === 0) return null;

  return (
    <SurfaceCard testID="callback-history" padding={0} overflow="hidden">
      <Text fontSize={16} fontWeight="600" color="$color" padding={16} paddingBottom={8}>
        Previous callbacks
      </Text>
      {items.map((c) => {
        const dur = durationLabel(c.duration_seconds);
        return (
          <YStack
            key={c.id}
            testID={`callback-${c.id}`}
            paddingHorizontal={16}
            paddingVertical={12}
            borderTopWidth={1}
            borderTopColor="$borderColor"
            gap={3}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} color="$muted">
                {formatDateTime(c.created_at)}
              </Text>
              <StatusPill status={c.status} />
            </XStack>
            {c.reason ? (
              <Text fontSize={14} color="$color">
                {c.reason}
              </Text>
            ) : null}
            {c.contacted_at || dur || c.conclusion ? (
              <Text fontSize={12} color="$muted">
                {c.contacted_at ? `Called ${formatDateTime(c.contacted_at)}` : ''}
                {dur ? ` · ${dur}` : ''}
                {c.conclusion ? ` · ${c.conclusion}` : ''}
              </Text>
            ) : null}
          </YStack>
        );
      })}
    </SurfaceCard>
  );
}
