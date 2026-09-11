import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { ListSkeleton } from '@/components/Skeleton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTickets } from '@/hooks/useSupport';
import { ticketNo } from '@/components/support/TicketMeta';
import { StatusPill } from '@/components/support/StatusPill';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  // The first focus is skipped: useTickets has already fetched on mount, and
  // reloading there fetched the whole list twice every time the screen opened.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
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
      <SurfaceCard padding={0} overflow="hidden">
        {items.map((t, index) => (
          <YStack
            key={t.id}
            testID={`my-ticket-${t.id}`}
            role="button"
            aria-label={t.subject}
            onPress={() => navigation.navigate('TicketDetails', { ticketId: t.id })}
            paddingHorizontal={16}
            paddingVertical={14}
            borderTopWidth={index === 0 ? 0 : 1}
            borderTopColor="$borderColor"
            gap={3}
            pressStyle={PRESS_STYLE.row}
          >
            <XStack justifyContent="space-between" alignItems="center" gap={8}>
              <Text fontSize={15} fontWeight="600" color="$color" flex={1} numberOfLines={1}>
                {t.subject}
              </Text>
              <StatusPill status={t.status} label={LABEL[t.status as Filter] ?? t.status} />
            </XStack>
            <Text fontSize={12} color="$muted">
              {ticketNo(t.id)} · {t.category}
            </Text>
          </YStack>
        ))}
      </SurfaceCard>
    );

  return (
    <YStack gap={12} testID="my-tickets-list">
      <SectionHeader title="Your tickets" />
      <XStack gap={8} flexWrap="wrap">
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <XStack
              key={f}
              testID={`tickets-filter-${f}`}
              role="button"
              aria-label={LABEL[f]}
              onPress={() => setFilter(f)}
              height={36}
              alignItems="center"
              paddingHorizontal={14}
              borderRadius={999}
              backgroundColor={active ? '$primary' : '$surface'}
              pressStyle={PRESS_STYLE.control}
            >
              <Text fontSize={13} fontWeight="600" color={active ? '$onPrimary' : '$color'}>
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
