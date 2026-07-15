import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { useTickets } from '@/hooks/useSupport';
import { ticketNo } from '@/components/support/TicketMeta';
import type { RootStackParamList } from '@/navigation/types';

type Filter = 'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
const FILTERS: Filter[] = ['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const LABEL: Record<Filter, string> = {
  ALL: 'All',
  OPEN: 'Open',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/**
 * The user's own support tickets with Open/Pending/Resolved/Closed filter chips
 * (Bug 4). Mirrors mWeb's MyTicketsList; rows open the ticket detail thread.
 */
export function MyTicketsList() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tickets, isLoading, reload } = useTickets();
  const [filter, setFilter] = useState<Filter>('ALL');

  // Reload whenever the screen regains focus so a ticket just created (which
  // navigates to its detail thread and back) appears in the list right away.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const items = filter === 'ALL' ? tickets : tickets.filter((t) => t.status === filter);
  // Count per status filter, computed from the loaded tickets (Bug 4).
  const countFor = (f: Filter) =>
    f === 'ALL' ? tickets.length : tickets.filter((t) => t.status === f).length;

  // Empty state or the ticket rows — hoisted so the render has no nested ternary.
  const listBody =
    items.length === 0 ? (
      <Text testID="my-tickets-empty" fontSize={13} color="$muted" paddingVertical={8}>
        {filter === 'ALL'
          ? "You haven't raised any tickets yet."
          : `No ${LABEL[filter].toLowerCase()} tickets.`}
      </Text>
    ) : (
      items.map((t) => (
        <YStack
          key={t.id}
          testID={`my-ticket-${t.id}`}
          role="button"
          aria-label={t.subject}
          onPress={() => navigation.navigate('TicketDetails', { ticketId: t.id })}
          padding={14}
          borderRadius={14}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          gap={3}
          pressStyle={{ opacity: 0.85 }}
        >
          <XStack justifyContent="space-between" alignItems="center" gap={8}>
            <Text fontSize={14} fontWeight="800" color="$color" flex={1} numberOfLines={1}>
              {t.subject}
            </Text>
            <Text fontSize={11} fontWeight="900" color="$primary">
              {LABEL[t.status as Filter] ?? t.status}
            </Text>
          </XStack>
          <Text fontSize={11.5} color="$muted">
            {ticketNo(t.id)} · {t.category}
          </Text>
        </YStack>
      ))
    );

  return (
    <YStack gap={10} testID="my-tickets-list">
      <Text fontSize={12} fontWeight="900" textTransform="uppercase" color="$muted">
        Your tickets
      </Text>
      <XStack gap={6} flexWrap="wrap">
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <XStack
              key={f}
              testID={`tickets-filter-${f}`}
              role="button"
              aria-label={LABEL[f]}
              onPress={() => setFilter(f)}
              paddingHorizontal={12}
              paddingVertical={6}
              borderRadius={999}
              borderWidth={1}
              borderColor={active ? '$primary' : '$borderColor'}
              backgroundColor={active ? '$primary' : 'transparent'}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={12} fontWeight="800" color={active ? '$onPrimary' : '$muted'}>
                {LABEL[f]} ({countFor(f)})
              </Text>
            </XStack>
          );
        })}
      </XStack>

      {isLoading && tickets.length === 0 ? (
        <ListSkeleton testID="my-tickets-loading" count={2} />
      ) : (
        listBody
      )}
    </YStack>
  );
}
