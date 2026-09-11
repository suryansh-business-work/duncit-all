import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import {
  PodHistoryCard,
  PodHistoryFilterSheet,
  PodHistorySortSheet,
  PodHistoryToolbar,
} from '@/components/pod-history';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
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
import { RefreshScrollView } from '@/components/PullToRefresh';

/** One icon on a soft disc and one short line — the list's empty states. */
function EmptyLine({ text, testID }: Readonly<{ text: string; testID: string }>) {
  const { muted } = useThemeColors();
  return (
    <YStack
      testID={testID}
      alignItems="center"
      gap={12}
      paddingVertical={48}
      paddingHorizontal={24}
    >
      <YStack
        width={72}
        height={72}
        borderRadius={36}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="history" size={40} color={muted} />
      </YStack>
      <Text fontSize={15} fontWeight="600" color="$color" textAlign="center">
        {text}
      </Text>
    </YStack>
  );
}

/** Pod History — the pods the user has joined, with a search box over the list
 * and a top-right Filter (Super → Category) and Sort (date / price). RN twin of
 * mWeb's PodHistoryPage. */
export function PodHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const { uniqueItems, isLoading, error, refetch } = usePodHistory();
  const categories = usePodHistoryCategories();
  const [filters, setFilters] = useState<PodHistoryFilters>(DEFAULT_POD_HISTORY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  /*
    Re-read whenever this screen comes back to the front.

    The details screen holds its OWN copy of this list, so a backout made there
    left this one showing the seats and status the booking had before it — the
    list only caught up when the app was restarted. The first focus is skipped
    because the hook has already fetched on mount.
  */
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch().catch(() => undefined);
    }, [refetch]),
  );

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
      <RefreshScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16 }}>
        <XStack
          alignItems="center"
          gap={8}
          paddingHorizontal={16}
          height={48}
          borderRadius={999}
          borderWidth={1}
          borderColor="$cardBorder"
          backgroundColor="$surface"
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
          <EmptyLine testID="pod-history-no-match" text={t('mweb.podHistory.noPodsFound')} />
        ) : (
          <SurfaceCard padding={0} overflow="hidden">
            {visible.map((item, index) => (
              <YStack key={item.id}>
                {index > 0 ? (
                  <YStack height={1} marginHorizontal={16} backgroundColor="$borderColor" />
                ) : null}
                <PodHistoryCard
                  item={item}
                  onPress={() =>
                    navigation.navigate('PodHistoryDetails', { membershipId: item.id })
                  }
                />
              </YStack>
            ))}
          </SurfaceCard>
        )}
      </RefreshScrollView>
    );
  } else {
    body = <EmptyLine testID="pod-history-empty" text={t('mweb.podHistory.empty')} />;
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
