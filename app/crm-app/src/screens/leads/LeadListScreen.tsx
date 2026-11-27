import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Fab } from '@/components/mobile/Fab';
import { IconButton } from '@/components/mobile/IconButton';
import { StateView } from '@/components/StateView';
import { MOBILE } from '@/constants/design';
import type { LeadListRow as Row } from '@/features/leads-list/listKinds';
import { useLeadListState } from '@/features/leads-list/useLeadListState';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { LeadListDeleteDialog } from './LeadListDeleteDialog';
import { LeadListHeader } from './LeadListHeader';
import { LeadListRow } from './LeadListRow';
import { LeadListRowActions } from './LeadListRowActions';
import { LeadListToolSheets, type ToolSheet } from './LeadListToolSheets';
import { LeadListToolsMenu } from './LeadListToolsMenu';

const SCOPE = 'crm-app/LeadListScreen';

/**
 * Leads › one kind (the portal's Venue / Host / Ecomm / Creators / Community
 * Leads page): search and filters on top, the page tools (Nearby leads,
 * Recalculate scores, Fill with AI, Excel import, Manage services) in the app
 * bar's ⋯, New lead as the floating button, and each lead's card: tap to
 * open, Call at the side, its ⋯ (or a long press) for edit, note, follow-up
 * and delete.
 */
export function LeadListScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { kind } = useRoute<RouteProp<AppStackParamList, 'LeadList'>>().params;
  const state = useLeadListState(kind, t);
  const { definition, list } = state;
  const [sheet, setSheet] = useState<ToolSheet>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [actionsFor, setActionsFor] = useState<Row | null>(null);
  const [pulling, setPulling] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const close = () => setSheet(null);
  const reload = () => fireAndForget(list.refresh(), logs.mobileApp, SCOPE, 'refresh');
  const pull = () => {
    setPulling(true);
    fireAndForget(
      list.refresh().finally(() => setPulling(false)),
      logs.mobileApp,
      SCOPE,
      'pull',
    );
  };
  const done = (message: string) => {
    setStatus(message);
    reload();
  };

  useEffect(() => {
    navigation.setOptions({
      title: t(definition.copy.title),
      headerRight: () => (
        <IconButton
          icon={{ name: 'more-vert' }}
          label={t('crmApp.mobile.pageTools')}
          color={theme.onPrimary?.val}
          onPress={() => setToolsOpen(true)}
          testID="lead-list-tools-open"
        />
      ),
    });
  }, [navigation, t, definition, theme.onPrimary?.val]);
  const services =
    kind === 'VENUE_LEAD' || kind === 'HOST_LEAD' || kind === 'ECOMM_LEAD'
      ? () => navigation.navigate('ServicesOffered')
      : undefined;
  // Back from the editor or a lead: show what changed.
  const { refresh } = list;
  useFocusEffect(
    useCallback(() => fireAndForget(refresh(), logs.mobileApp, SCOPE, 'focus'), [refresh]),
  );

  return (
    <YStack flex={1}>
      <FlatList
        style={{ flex: 1, backgroundColor: theme.background?.val }}
        data={list.rows}
        keyExtractor={(row) => row.id}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={pull} tintColor={theme.accentText?.val} />
        }
        initialNumToRender={10}
        windowSize={7}
        contentContainerStyle={{
          padding: 16,
          gap: 8,
          paddingBottom: MOBILE.fab + MOBILE.gutter * 2,
        }}
        ListHeaderComponent={
          <LeadListHeader
            search={state.search}
            onSearch={state.setSearch}
            total={list.total}
            filterCount={state.filterCount}
            nearbyLabel={state.nearbyLabel}
            status={status}
            onFilters={() => setSheet('filters')}
            onNearby={() => setSheet('nearby')}
            onClearNearby={state.clearNearby}
          />
        }
        renderItem={({ item }) => (
          <LeadListRow
            row={item}
            matchedUser={definition.matchedUser}
            onOpen={(row) => navigation.navigate('LeadDetail', { kind, id: row.id })}
            onCall={(row, to) =>
              navigation.navigate('Call', {
                kind,
                id: row.id,
                to,
                leadName: row.name,
                contactName: row.name,
              })
            }
            onMore={setActionsFor}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={list.loading}
            error={list.error}
            empty={t(definition.copy.empty)}
            emptyIcon="person-search"
            onRetry={reload}
          />
        }
        ListFooterComponent={
          list.rows.length > 0 && list.loading ? <StateView loading inline /> : null
        }
      />
      <Fab
        icon="add"
        label={t(definition.copy.newLead)}
        onPress={() => navigation.navigate('LeadEditor', { kind })}
        testID="lead-list-new"
      />
      <LeadListToolsMenu
        open={toolsOpen}
        definition={definition}
        nearbyOn={Boolean(state.nearbyLabel)}
        onNearby={() => setSheet('nearby')}
        onRecalculate={() => setSheet('recalculate')}
        onFillWithAi={() => setSheet('ai')}
        onImport={() => setSheet('import')}
        onManageServices={services}
        onClose={() => setToolsOpen(false)}
      />
      <LeadListToolSheets
        sheet={sheet}
        kind={kind}
        state={state}
        onClose={close}
        onStatus={setStatus}
        onDone={done}
      />
      <LeadListRowActions
        row={actionsFor}
        onOpen={(row) => navigation.navigate('LeadDetail', { kind, id: row.id })}
        onEdit={(row) => navigation.navigate('LeadEditor', { kind, id: row.id })}
        onLogNote={(row) => navigation.navigate('AddNote', { kind, id: row.id, name: row.name })}
        onFollowUp={(row) =>
          navigation.navigate('AddReminder', { kind, id: row.id, name: row.name })
        }
        onDelete={setToDelete}
        onClose={() => setActionsFor(null)}
      />
      <LeadListDeleteDialog
        definition={definition}
        row={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={(message) => {
          setToDelete(null);
          done(message);
        }}
      />
    </YStack>
  );
}
