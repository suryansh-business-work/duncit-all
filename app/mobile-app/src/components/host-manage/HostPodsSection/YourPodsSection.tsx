import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { HostPod } from '@/hooks/useHostPods';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  DEFAULT_HOST_PODS_FILTERS,
  activeHostFilterCount,
  filterHostPods,
  type HostPodsFilters,
} from '@/utils/host-pods-filters';
import { HostPodsList } from '@/components/host-manage/HostPodsList';
import { HostPodsFilterSheet } from '@/components/host-manage/HostPodsFilterSheet';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** Pods the venue has already cleared — the requested and rejected ones are
   * listed by their own sections. */
  pods: HostPod[];
  isLoading: boolean;
  /** Confirmation line from the last link action, or null. */
  notice: string | null;
  onOpen: (pod: HostPod) => void;
  onActions: (pod: HostPod) => void;
}

/** "Your pods" — the pods this host actually runs, with a Type/Time/Price
 * filter that defaults to Upcoming, which is where a newly approved pod lands. */
export function YourPodsSection({ pods, isLoading, notice, onOpen, onActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, onPrimary } = useThemeColors();
  const [filters, setFilters] = useState<HostPodsFilters>(DEFAULT_HOST_PODS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterHostPods(pods, filters);
  const activeCount = activeHostFilterCount(filters);
  const filterActive = activeCount > 0;
  const filterLabel = filterActive
    ? t('mweb.hostManage.filterCount', { count: activeCount })
    : t('mweb.common.filter');

  return (
    <YStack gap={12} testID="host-pods-section">
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="700" color="$color">
          {t('mweb.common.yourPods')}
        </Text>
        <XStack
          testID="host-pods-filter-open"
          role="button"
          aria-label={t('mweb.hostManage.filterPods')}
          onPress={() => setFilterOpen(true)}
          alignItems="center"
          gap={6}
          height={34}
          paddingHorizontal={12}
          borderRadius={999}
          borderWidth={1}
          borderColor={filterActive ? '$primary' : '$borderColor'}
          backgroundColor={filterActive ? '$primary' : '$surface'}
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="filter-list" size={16} color={filterActive ? onPrimary : ink} />
          <Text fontSize={13} fontWeight="600" color={filterActive ? '$onPrimary' : '$color'}>
            {filterLabel}
          </Text>
        </XStack>
      </XStack>
      {notice ? (
        <Text testID="host-pods-notice" fontSize={12.5} color="$success">
          {notice}
        </Text>
      ) : null}
      <HostPodsList
        pods={pods}
        visible={visible}
        isLoading={isLoading}
        onOpen={onOpen}
        onActions={onActions}
      />
      <HostPodsFilterSheet
        open={filterOpen}
        initial={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </YStack>
  );
}
