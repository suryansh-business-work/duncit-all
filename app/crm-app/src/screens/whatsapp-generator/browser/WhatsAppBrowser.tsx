import { useState, type ReactElement } from 'react';
import { FlatList } from 'react-native';
import { fireAndForget, logs } from '@duncit/logs';

import { StateView } from '@/components/StateView';
import { useWaExtraction } from '@/features/whatsapp-generator/extractionStore';
import { useWaBrowser, type WaGroupRef } from '@/features/whatsapp-generator/useWaBrowser';
import { useTranslation } from '@/hooks/useTranslation';
import { BrowserHeader } from './BrowserHeader';
import { BrowserRow } from './BrowserRow';
import { GroupMembersSheet } from './GroupMembersSheet';

const SCOPE = 'crm-app/WhatsAppBrowser';

/**
 * The connected account's browser — the portal's WhatsAppBrowser: Communities
 * → Groups → Members, plus every User, searched on the server and read page
 * by page as the list scrolls. Extract pulls fresh data in the background.
 * `top` is drawn above the list (the linked-account summary).
 */
export function WhatsAppBrowser({ top }: Readonly<{ top: ReactElement }>) {
  const { t } = useTranslation();
  const browser = useWaBrowser(t('crmApp.common.loadFailed'));
  const running = useWaExtraction((s) => s.job?.status === 'RUNNING');
  const [members, setMembers] = useState<WaGroupRef | null>(null);
  const { list } = browser;

  const refresh = () => {
    fireAndForget(list.refresh(), logs.mobileApp, SCOPE, 'refresh');
    fireAndForget(useWaExtraction.getState().load(), logs.mobileApp, SCOPE, 'extraction');
  };

  return (
    <>
      <FlatList
        data={list.rows}
        keyExtractor={(row) => `${row.kind}-${row.id}`}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshing={false}
        onRefresh={refresh}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 8 }}
        testID="wa-browser-list"
        ListHeaderComponent={
          <>
            {top}
            <BrowserHeader browser={browser} />
          </>
        }
        renderItem={({ item }) => (
          <BrowserRow row={item} onCommunity={browser.openCommunity} onGroup={setMembers} />
        )}
        ListEmptyComponent={
          <StateView
            loading={list.loading}
            error={list.error}
            empty={running ? t('crm.tools.extractingFromWhatsapp') : t('crm.tools.noDataYet')}
            onRetry={refresh}
          />
        }
        ListFooterComponent={
          list.rows.length > 0 && list.loading ? <StateView loading inline /> : null
        }
      />
      <GroupMembersSheet group={members} onClose={() => setMembers(null)} />
    </>
  );
}
