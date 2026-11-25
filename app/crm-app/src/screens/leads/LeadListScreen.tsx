import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import type { CrmAiLeadEntity } from '@duncit/utils';

import { StateView } from '@/components/StateView';
import type { LeadKind } from '@/features/leads/leadKinds';
import type { LeadListRow as Row } from '@/features/leads-list/listKinds';
import { useLeadListState } from '@/features/leads-list/useLeadListState';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { LeadListAiSheet } from './LeadListAiSheet';
import { LeadListDeleteDialog } from './LeadListDeleteDialog';
import { LeadListFiltersSheet } from './LeadListFiltersSheet';
import { LeadListHeader } from './LeadListHeader';
import { LeadListImportSheet, importSummary } from './LeadListImportSheet';
import { LeadListNearbySheet } from './LeadListNearbySheet';
import { LeadListRecalculate } from './LeadListRecalculate';
import { LeadListRow } from './LeadListRow';

type Sheet = 'filters' | 'nearby' | 'ai' | 'import' | 'recalculate' | null;

const SCOPE = 'crm-app/LeadListScreen';

/** Fill with AI and Excel import create venue and host leads (as on the portal). */
const bulkEntity = (kind: LeadKind): CrmAiLeadEntity | null =>
  kind === 'VENUE_LEAD' || kind === 'HOST_LEAD' ? kind : null;

/**
 * Leads › one kind (the portal's Venue / Host / Ecomm / Creators / Community
 * Leads page): search, filters and order, Nearby leads, Recalculate scores,
 * Fill with AI and Excel import, and each lead's card with edit and delete.
 */
export function LeadListScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { kind } = useRoute<RouteProp<AppStackParamList, 'LeadList'>>().params;
  const state = useLeadListState(kind, t);
  const { definition, list } = state;
  const [sheet, setSheet] = useState<Sheet>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const entity = bulkEntity(kind);
  const close = () => setSheet(null);
  const reload = () => fireAndForget(list.refresh(), logs.mobileApp, SCOPE, 'refresh');
  const done = (message: string) => {
    setStatus(message);
    reload();
  };

  useEffect(() => {
    navigation.setOptions({ title: t(definition.copy.title) });
  }, [navigation, t, definition]);
  // Back from the editor or a lead: show what changed.
  const { refresh } = list;
  useFocusEffect(
    useCallback(() => fireAndForget(refresh(), logs.mobileApp, SCOPE, 'focus'), [refresh]),
  );

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: theme.background?.val }}
        data={list.rows}
        keyExtractor={(row) => row.id}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshing={false}
        onRefresh={reload}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <LeadListHeader
            definition={definition}
            search={state.search}
            onSearch={state.setSearch}
            total={list.total}
            filterCount={state.filterCount}
            nearbyLabel={state.nearbyLabel}
            status={status}
            onNew={() => navigation.navigate('LeadEditor', { kind })}
            onFilters={() => setSheet('filters')}
            onNearby={() => setSheet('nearby')}
            onClearNearby={state.clearNearby}
            onRecalculate={() => setSheet('recalculate')}
            onFillWithAi={() => setSheet('ai')}
            onImport={() => setSheet('import')}
            onManageServices={
              kind === 'VENUE_LEAD' || kind === 'HOST_LEAD' || kind === 'ECOMM_LEAD'
                ? () => navigation.navigate('ServicesOffered')
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <LeadListRow
            row={item}
            matchedUser={definition.matchedUser}
            onOpen={(row) => navigation.navigate('LeadDetail', { kind, id: row.id })}
            onEdit={(row) => navigation.navigate('LeadEditor', { kind, id: row.id })}
            onDelete={setToDelete}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={list.loading}
            error={list.error}
            empty={t(definition.copy.empty)}
            onRetry={reload}
          />
        }
        ListFooterComponent={list.rows.length > 0 && list.loading ? <StateView loading /> : null}
      />
      {/* Mounted only while open, so its pickable values are read when the sheet is opened. */}
      {sheet === 'filters' ? (
        <LeadListFiltersSheet
          open
          kind={kind}
          nearby={state.nearbyOn}
          values={state.filterValues}
          onApply={(values) => {
            state.applyFilters(values);
            close();
          }}
          onClear={() => {
            state.clearFilters();
            close();
          }}
          onClose={close}
        />
      ) : null}
      <LeadListNearbySheet
        open={sheet === 'nearby'}
        search={state.nearbySearch}
        scan={state.scan}
        onSubmit={state.startNearby}
        onClose={close}
      />
      <LeadListRecalculate
        open={sheet === 'recalculate'}
        kind={kind}
        onClose={close}
        onDone={(message) => {
          close();
          setStatus(message);
        }}
      />
      {entity ? (
        <>
          <LeadListAiSheet
            open={sheet === 'ai'}
            entity={entity}
            onClose={close}
            onSaved={(count) =>
              done(
                entity === 'VENUE_LEAD'
                  ? t('crm.venueLeads.createdCount', { count })
                  : t('crm.hostLeads.createdCount', { count }),
              )
            }
          />
          <LeadListImportSheet
            open={sheet === 'import'}
            entity={entity}
            onClose={close}
            onImported={(result) => done(importSummary(result, t))}
          />
        </>
      ) : null}
      <LeadListDeleteDialog
        definition={definition}
        row={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={(message) => {
          setToDelete(null);
          done(message);
        }}
      />
    </>
  );
}
