import { useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';

import { SURFACE } from '@/components/surface';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { LEAD_KINDS, isLeadKind, type LeadKind } from '@/features/leads/leadKinds';
import { useLeadSearch } from '@/features/leads/useLeadSearch';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { NewLeadPicker } from './NewLeadPicker';

/** Every lead the CRM holds, searchable by name, city, phone or email, filterable by kind. */
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
  // The kind lives in the route, so the side menu's per-kind pages and the chips agree.
  const kind: LeadKind | null = useRoute<RouteProp<TabParamList, 'Leads'>>().params?.kind ?? null;
  const setKind = (next: LeadKind | null) => navigation.setParams({ kind: next ?? undefined });
  const leads = useLeadSearch(search, kind, t('crmApp.common.loadFailed'));

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack paddingTop="$4" paddingBottom="$3" gap="$2">
        <YStack paddingHorizontal="$4" gap="$2">
          <NewLeadPicker onPick={(k) => navigation.navigate('LeadEditor', { kind: k })} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('crmApp.leads.search')}
            aria-label={t('crmApp.leads.search')}
            placeholderTextColor="$muted"
            borderColor="$inputBorder"
            autoCorrect={false}
            testID="leads-search"
          />
        </YStack>
        {/* The chips scroll under the screen edges, starting in line with the content. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <XStack gap="$2" role="radiogroup">
            <DuncitButton
              label={t('crmApp.leads.all')}
              onPress={() => setKind(null)}
              size="sm"
              variant={kind ? 'outline' : 'solid'}
              testID="leads-kind-all"
            />
            {LEAD_KINDS.map((k) => (
              <DuncitButton
                key={k}
                label={t(`crmApp.kind.${k}`)}
                onPress={() => setKind(k)}
                size="sm"
                variant={kind === k ? 'solid' : 'outline'}
                testID={`leads-kind-${k}`}
              />
            ))}
          </XStack>
        </ScrollView>
        <YStack paddingHorizontal="$4" gap="$2">
          {kind ? (
            <DuncitButton
              label={t('crmApp.leadList.openList')}
              onPress={() => navigation.navigate('LeadList', { kind })}
              variant="outline"
              size="sm"
              icon={<MaterialIcons name="tune" size={18} color={theme.accentText?.val} />}
              testID="leads-open-list"
            />
          ) : null}
          {leads.total > 0 ? (
            <Text color="$muted" fontSize="$2" aria-live="polite">
              {t('crmApp.leads.count', { count: leads.total })}
            </Text>
          ) : null}
        </YStack>
      </YStack>
      <FlatList
        data={leads.rows}
        keyExtractor={(row) => `${row.entity_type}:${row.id}`}
        onEndReached={leads.loadMore}
        onEndReachedThreshold={0.4}
        refreshing={false}
        onRefresh={leads.refresh}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
        renderItem={({ item }) => (
          <YStack
            role="button"
            aria-label={item.name}
            onPress={() => {
              if (isLeadKind(item.entity_type))
                navigation.navigate('LeadDetail', { kind: item.entity_type, id: item.id });
            }}
            {...SURFACE}
            pressStyle={{ backgroundColor: '$soft' }}
            testID={`lead-row-${item.id}`}
          >
            <Text fontWeight="700">{item.name}</Text>
            <Text color="$muted" fontSize="$2">
              {[t(`crmApp.kind.${item.entity_type}`), item.city, item.lead_status]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </YStack>
        )}
        ListEmptyComponent={
          <StateView
            loading={leads.loading}
            error={leads.error}
            empty={t('crmApp.leads.empty')}
            onRetry={leads.refresh}
          />
        }
        ListFooterComponent={leads.rows.length > 0 && leads.loading ? <StateView loading /> : null}
      />
    </YStack>
  );
}
