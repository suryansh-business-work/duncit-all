import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { FilterChips, type ChipOption } from '@/components/mobile/FilterChips';
import { SearchBar } from '@/components/mobile/SearchBar';
import { StateView } from '@/components/StateView';
import { MOBILE } from '@/constants/design';
import { LEAD_KINDS, isLeadKind, type LeadKind } from '@/features/leads/leadKinds';
import { useLeadSearch, type LeadRow } from '@/features/leads/useLeadSearch';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { LeadSearchRow } from './LeadSearchRow';
import { NewLeadPicker } from './NewLeadPicker';

type Filter = 'all' | LeadKind;
/** Room under the last row so the floating New lead button never covers it. */
const FAB_CLEARANCE = MOBILE.fab + MOBILE.gutter * 2;

/**
 * Every lead the CRM holds: search by name, city, phone or email, narrow to a
 * kind with the chips, call straight from a row, add one from the floating
 * button. A kind's full list (filters, bulk tools, import) is one tap away.
 */
export function LeadsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<TabParamList, 'Leads'>,
        NavigationProp<AppStackParamList>
      >
    >();
  const [search, setSearch] = useState('');
  const [pulling, setPulling] = useState(false);
  // The kind lives in the route, so a deep link, the More tab and the chips agree.
  const kind: LeadKind | null = useRoute<RouteProp<TabParamList, 'Leads'>>().params?.kind ?? null;
  const leads = useLeadSearch(search, kind, t('crmApp.common.loadFailed'));
  const chips = useMemo<ChipOption<Filter>[]>(
    () => [
      { key: 'all', label: t('crmApp.leads.all') },
      ...LEAD_KINDS.map((k) => ({ key: k, label: t(`crmApp.kind.${k}`) })),
    ],
    [t],
  );

  const open = useCallback(
    (row: LeadRow) => {
      if (isLeadKind(row.entity_type))
        navigation.navigate('LeadDetail', { kind: row.entity_type, id: row.id });
    },
    [navigation],
  );
  const call = useCallback(
    (row: LeadRow, to: string) => {
      if (isLeadKind(row.entity_type))
        navigation.navigate('Call', {
          kind: row.entity_type,
          id: row.id,
          to,
          leadName: row.name,
          contactName: row.name,
        });
    },
    [navigation],
  );
  const refresh = async () => {
    setPulling(true);
    try {
      await leads.refresh();
    } finally {
      setPulling(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack paddingTop="$3" paddingBottom="$2" gap="$2.5">
        <YStack paddingHorizontal="$4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('crmApp.leads.search')}
            testID="leads-search"
          />
        </YStack>
        <FilterChips
          options={chips}
          value={kind ?? 'all'}
          onChange={(next) => navigation.setParams({ kind: next === 'all' ? undefined : next })}
          label={t('crmApp.mobile.leadKind')}
          testID="leads-kind"
        />
        <XStack paddingHorizontal="$4" alignItems="center" minHeight={24}>
          <Text flex={1} color="$muted" fontSize="$2" aria-live="polite">
            {leads.total > 0 ? t('crmApp.leads.count', { count: leads.total }) : ''}
          </Text>
          {kind ? (
            <XStack
              role="button"
              aria-label={t('crmApp.leadList.openList')}
              onPress={() => navigation.navigate('LeadList', { kind })}
              alignItems="center"
              gap="$1"
              minHeight={MOBILE.touch}
              paddingLeft="$2"
              testID="leads-open-list"
            >
              <MaterialIcons name="tune" size={MOBILE.iconSm} color={theme.accentText?.val} />
              <Text color="$accentText" fontWeight="600" fontSize="$3">
                {t('crmApp.leadList.openList')}
              </Text>
            </XStack>
          ) : null}
        </XStack>
      </YStack>
      <FlatList
        data={leads.rows}
        keyExtractor={(row) => `${row.entity_type}:${row.id}`}
        onEndReached={leads.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() =>
              fireAndForget(refresh(), logs.mobileApp, 'crm-app/LeadsScreen', 'refresh')
            }
            colors={[theme.primary?.val ?? '']}
            tintColor={theme.accentText?.val}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{
          paddingHorizontal: MOBILE.gutter,
          paddingBottom: FAB_CLEARANCE,
          gap: 8,
        }}
        renderItem={({ item }) => <LeadSearchRow row={item} onOpen={open} onCall={call} />}
        ListEmptyComponent={
          <StateView
            loading={leads.loading}
            error={leads.error}
            empty={t('crmApp.leads.empty')}
            emptyIcon="person-search"
            onRetry={leads.refresh}
          />
        }
        ListFooterComponent={
          leads.rows.length > 0 && leads.loading ? <StateView loading inline /> : null
        }
      />
      <NewLeadPicker onPick={(k) => navigation.navigate('LeadEditor', { kind: k })} />
    </YStack>
  );
}
