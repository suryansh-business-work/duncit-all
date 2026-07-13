import { useMemo, useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import {
  PodHistoryCard,
  PodHistoryFilterSheet,
  PodHistorySortSheet,
  PodHistoryToolbar,
} from '@/components/pod-history';
import { StackScreen } from '@/components/StackScreen';
import { usePodHistory, usePodHistoryCategories } from '@/hooks/usePodHistory';
import {
  activePodHistoryFilterCount,
  applyPodHistory,
  DEFAULT_POD_HISTORY_FILTERS,
  type PodHistoryFilters,
} from '@/utils/pod-history';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** Pod History — the pods the user has joined, with a top-right Filter (Super →
 * Category) and Sort (date / price). RN twin of mWeb's PodHistoryPage. */
export function PodHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { uniqueItems, isLoading, error } = usePodHistory();
  const categories = usePodHistoryCategories();
  const [filters, setFilters] = useState<PodHistoryFilters>(DEFAULT_POD_HISTORY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const visible = useMemo(
    () => applyPodHistory(uniqueItems, filters, categories),
    [uniqueItems, filters, categories],
  );
  const hasHistory = uniqueItems.length > 0;
  const resetFilters = () => setFilters(DEFAULT_POD_HISTORY_FILTERS);

  const toolbar = hasHistory ? (
    <PodHistoryToolbar
      filterCount={activePodHistoryFilterCount(filters)}
      onFilter={() => setFilterOpen(true)}
      onSort={() => setSortOpen(true)}
    />
  ) : undefined;

  let body: ReactNode;
  if (isLoading && uniqueItems.length === 0) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="pod-history-loading" color="$primary" />
      </YStack>
    );
  } else if (error) {
    body = (
      <Text testID="pod-history-error" padding={24} color="$danger">
        {toErrorMessage(error)}
      </Text>
    );
  } else if (hasHistory) {
    body = (
      <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 10 }}>
        <YStack gap={2} marginBottom={4}>
          <Text fontSize={20} fontWeight="900" color="$color">
            Joined Pods
          </Text>
          <Text fontSize={13} color="$muted">
            Tap any pod you joined to view details, actions, refund status, and timeline.
          </Text>
        </YStack>
        {visible.length === 0 ? (
          <YStack testID="pod-history-no-match" gap={4} paddingVertical={24} alignItems="center">
            <Text fontSize={16} fontWeight="900" color="$color">
              No Pods Found
            </Text>
            <Text fontSize={13} color="$muted" textAlign="center">
              We couldn't find any enrolled Pods matching your selected filters. Try changing your
              filters to explore more of your Pod history.
            </Text>
          </YStack>
        ) : (
          visible.map((item) => (
            <PodHistoryCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('PodHistoryDetails', { membershipId: item.id })}
            />
          ))
        )}
      </ScrollView>
    );
  } else {
    body = (
      <Text testID="pod-history-empty" padding={24} color="$muted">
        Pods you have joined will appear here.
      </Text>
    );
  }

  return (
    <StackScreen title="Pod History" testID="pod-history-screen" right={toolbar}>
      {body}
      <PodHistoryFilterSheet
        open={filterOpen}
        filters={filters}
        categories={categories}
        onChange={setFilters}
        onReset={resetFilters}
        onClose={() => setFilterOpen(false)}
      />
      <PodHistorySortSheet
        open={sortOpen}
        value={filters.sort}
        onClose={() => setSortOpen(false)}
        onSelect={(sort) => setFilters((f) => ({ ...f, sort }))}
      />
    </StackScreen>
  );
}
