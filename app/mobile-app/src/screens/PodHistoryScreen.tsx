import { useMemo, useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import {
  PodHistoryCard,
  PodHistoryFilterSheet,
  PodHistorySortSheet,
  PodHistoryToolbar,
} from '@/components/pod-history';
import { StackScreen } from '@/components/StackScreen';
import { usePodHistory, usePodHistoryCategories } from '@/hooks/usePodHistory';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  activePodHistoryFilterCount,
  applyPodHistory,
  DEFAULT_POD_HISTORY_FILTERS,
  type PodHistoryFilters,
} from '@/utils/pod-history';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** Pod History — the pods the user has joined, with a search box over the list
 * and a top-right Filter (Super → Category) and Sort (date / price). RN twin of
 * mWeb's PodHistoryPage. */
export function PodHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted } = useThemeColors();
  const { t } = useTranslation();
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
          <Text fontSize={20} fontWeight="700" color="$color">
            {t('mweb.podHistory.joinedPods')}
          </Text>
          <Text fontSize={13} color="$muted">
            {t('mweb.podHistory.subtitle')}
          </Text>
        </YStack>
        <XStack
          alignItems="center"
          gap={8}
          marginBottom={4}
          paddingHorizontal={12}
          height={46}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$background"
        >
          <MaterialIcons name="search" size={20} color={muted} />
          <Input
            testID="pod-history-search"
            aria-label={t('mweb.podHistory.searchAria')}
            flex={1}
            unstyled
            value={filters.search}
            onChangeText={(search) => setFilters((f) => ({ ...f, search }))}
            placeholder={t('mweb.podHistory.searchPlaceholder')}
            placeholderTextColor="$muted"
            color="$color"
            fontSize={15}
            returnKeyType="search"
          />
        </XStack>
        {visible.length === 0 ? (
          <YStack testID="pod-history-no-match" gap={4} paddingVertical={24} alignItems="center">
            <Text fontSize={16} fontWeight="700" color="$color">
              {t('mweb.podHistory.noPodsFound')}
            </Text>
            <Text fontSize={13} color="$muted" textAlign="center">
              {t('mweb.podHistory.noPodsFoundBody')}
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
        {t('mweb.podHistory.empty')}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.podHistory.title')} testID="pod-history-screen" right={toolbar}>
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
