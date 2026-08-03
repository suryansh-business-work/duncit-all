import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, useWindowDimensions, type ListRenderItemInfo } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import {
  buildFeedRows,
  buildOffsets,
  filterByQuery,
  isAdRow,
  makeItemLayout,
  rowForPodIndex,
  type FeedRow,
} from '@duncit/virtual-scroll';

import { AdCard } from '@/components/ads/AdCard';
import { PodCard } from '@/components/home/PodCard';
import type { ActiveAd } from '@/hooks/useActiveAds';
import { useDetailNav } from '@/hooks/useDetailNav';
import type { HomePod } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const POD_HEIGHT = 230;
const AD_HEIGHT = 120;
const GAP = 12;
const LEAD = 16;
const AD_EVERY = 4;
/** Stable default so an ad-less list does not rebuild its rows every render. */
const NO_ADS: ActiveAd[] = [];

type PodFeedRow = FeedRow<HomePod, ActiveAd>;

interface PodListViewProps {
  pods: HomePod[];
  ads?: ActiveAd[];
  /** Pod index to land on — "See all" continues after the home rail's cap. */
  initialIndex?: number;
  emptyText: string;
  /** testID prefix, e.g. "happening-nearby" -> "happening-nearby-empty". */
  testID: string;
}

function GapSeparator() {
  return <YStack height={GAP} />;
}

function ListLead() {
  return <YStack height={LEAD} />;
}

function ListFoot() {
  return <YStack height={40} />;
}

/**
 * Searchable, virtualized full pod list shared by the Happening Nearby and
 * Previous Pods screens. FlatList windowing mounts rows ahead of the scroll
 * until the list ends, and `initialIndex` jumps exactly because every row
 * height is known up front (@duncit/virtual-scroll offsets).
 */
export function PodListView({
  pods,
  ads = NO_ADS,
  initialIndex = 0,
  emptyText,
  testID,
}: Readonly<PodListViewProps>) {
  const { width } = useWindowDimensions();
  const { openPod } = useDetailNav();
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      filterByQuery(pods, query, (pod) => [
        pod.pod_title,
        pod.place_label,
        pod.place_detail,
        ...(pod.host_names ?? []),
      ]),
    [pods, query],
  );

  const searching = query.trim() !== '';
  const rows = useMemo(
    () =>
      buildFeedRows<HomePod, ActiveAd>({
        pods: filtered,
        ads: searching ? [] : ads,
        columns: 1,
        adEvery: AD_EVERY,
        adKeyOf: (ad, index) => `ad-${ad.id}-${index}`,
      }),
    [filtered, ads, searching],
  );

  const { getItemLayout, startRow } = useMemo(() => {
    const heights = rows.map((row) => (isAdRow(row) ? AD_HEIGHT : POD_HEIGHT));
    const offsets = buildOffsets(heights, GAP, LEAD);
    // Out-of-range indices (bad deep link) skip the jump — same as mWeb.
    const inRange = initialIndex > 0 && initialIndex < pods.length;
    return {
      getItemLayout: makeItemLayout(heights, offsets),
      startRow: inRange ? rowForPodIndex(rows, initialIndex) : 0,
    };
  }, [rows, initialIndex, pods.length]);

  // The FlatList unmounts on a zero-result search; consume the "See all" jump
  // on first mount so a later remount starts at the top instead of re-jumping.
  const jumpConsumedRef = useRef(false);
  const initialScrollIndex = !jumpConsumedRef.current && startRow > 0 ? startRow : undefined;
  useEffect(() => {
    jumpConsumedRef.current = true;
  }, []);

  const renderRow = ({ item: row }: ListRenderItemInfo<PodFeedRow>) => {
    if (isAdRow(row)) {
      return (
        <YStack paddingHorizontal={16} height={AD_HEIGHT}>
          <AdCard ad={row.ad} variant="banner" />
        </YStack>
      );
    }
    const pod = row.items[0];
    if (!pod) return null;
    return (
      <YStack paddingHorizontal={16} height={POD_HEIGHT}>
        <PodCard pod={pod} width={width - 32} onPress={() => openPod(pod.club_slug, pod.pod_id)} />
      </YStack>
    );
  };

  // The search bar renders in every state (mWeb parity, rule 27); the body
  // below it switches between empty, no-results and the virtualized list.
  let listBody: ReactNode;
  if (pods.length === 0) {
    listBody = (
      <Text testID={`${testID}-empty`} textAlign="center" color="$muted" padding={24}>
        {emptyText}
      </Text>
    );
  } else if (filtered.length === 0) {
    listBody = (
      <Text testID={`${testID}-no-results`} textAlign="center" color="$muted" padding={24}>
        {t('mweb.home.noSearchResults')}
      </Text>
    );
  } else {
    listBody = (
      <FlatList
        testID={`${testID}-list`}
        data={rows}
        keyExtractor={(row) => (isAdRow(row) ? row.adKey : (row.items[0]?.id ?? 'pod-row'))}
        renderItem={renderRow}
        ItemSeparatorComponent={GapSeparator}
        ListHeaderComponent={ListLead}
        ListFooterComponent={ListFoot}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialScrollIndex}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={40}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    );
  }

  return (
    <YStack flex={1}>
      <XStack
        marginHorizontal={16}
        marginTop={12}
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID={`${testID}-search-input`}
          aria-label={t('mweb.home.searchPods')}
          flex={1}
          unstyled
          value={query}
          onChangeText={setQuery}
          placeholder={t('mweb.home.searchPods')}
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>
      {listBody}
    </YStack>
  );
}
