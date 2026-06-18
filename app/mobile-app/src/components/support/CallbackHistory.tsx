import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Text, XStack, YStack } from 'tamagui';

import { useBouncer, type CallbackHistoryItem } from '@/hooks/useBouncer';
import { durationLabel } from '@/utils/support-chat';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f5a623',
  CONTACTED: '#2196f3',
  CLOSED: '#22c55e',
};

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
    <YStack
      testID="callback-history"
      padding={16}
      borderRadius={16}
      gap={10}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize={12} fontWeight="900" textTransform="uppercase" color="$muted">
        Previous callbacks
      </Text>
      {items.map((c) => {
        const dur = durationLabel(c.duration_seconds);
        return (
          <YStack
            key={c.id}
            testID={`callback-${c.id}`}
            padding={12}
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            gap={3}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} color="$muted">
                {format(new Date(c.created_at), 'd MMM yyyy, HH:mm')}
              </Text>
              <Text fontSize={11} fontWeight="900" color={STATUS_COLOR[c.status] ?? '$muted'}>
                {c.status}
              </Text>
            </XStack>
            {c.reason ? (
              <Text fontSize={13.5} color="$color">
                {c.reason}
              </Text>
            ) : null}
            {c.contacted_at || dur || c.conclusion ? (
              <Text fontSize={11.5} color="$muted">
                {c.contacted_at ? `Called ${format(new Date(c.contacted_at), 'd MMM, HH:mm')}` : ''}
                {dur ? ` · ${dur}` : ''}
                {c.conclusion ? ` · ${c.conclusion}` : ''}
              </Text>
            ) : null}
          </YStack>
        );
      })}
    </YStack>
  );
}
