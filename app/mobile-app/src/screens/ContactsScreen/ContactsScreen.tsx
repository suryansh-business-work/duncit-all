import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';
import { followActionFor, readFollowStatus } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  ContactsAllowCard,
  ContactsFilters,
  ContactsInviteList,
  ContactsList,
  ContactsRadar,
} from '@/components/contacts';
import { DuncitButton } from '@/components/DuncitButton';
import { StackScreen } from '@/components/StackScreen';
import { ClearMyContactsDocument } from '@/graphql/contacts';
import {
  useContactsOnDuncit,
  useContactsSyncStatus,
  type ContactRow,
  type ContactsScope,
} from '@/hooks/useContacts';
import { useContactsInvite } from '@/hooks/useContactsInvite';
import { useContactsSync } from '@/hooks/useContactsSync';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { runUserFollowAction } from '@/services/follow-user';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Your Contacts on Duncit — RN twin of mWeb's ContactsPage (rule 27). */
export function ContactsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [scope, setScope] = useState<ContactsScope>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const { status, viewer, refetch: refetchStatus } = useContactsSyncStatus();
  const list = useContactsOnDuncit(search, scope);
  const inviting = scope === 'invite';
  const invites = useContactsInvite(search, inviting);
  // A resync changes both halves at once — who is here now, and who is left to
  // ask — but the invite list is only refetched while it is on screen.
  const refetchInvites = inviting ? invites.refetch : null;
  const refreshAll = useCallback(
    () => Promise.all([refetchStatus(), list.refetch(), refetchInvites?.()]),
    [refetchStatus, list, refetchInvites],
  );
  const sync = useContactsSync(refreshAll);

  const toggleFollow = async (row: ContactRow) => {
    setBusyId(row.profile.user_id);
    try {
      await runUserFollowAction(
        followActionFor(readFollowStatus(row.profile)),
        row.profile.user_id,
      );
      await list.refetch();
    } finally {
      setBusyId(null);
    }
  };

  // The dialog stays up, with Confirm spinning, until the server has actually
  // dropped the phone book — then it closes and the list re-reads behind it,
  // which is the order mWeb's ContactsPage uses (rule 27).
  const clear = async () => {
    setClearing(true);
    try {
      await graphqlRequest(ClearMyContactsDocument, undefined, { auth: true }).catch(
        () => undefined,
      );
    } finally {
      setClearing(false);
      setClearOpen(false);
    }
    await refreshAll();
  };

  const openProfile = (userId: string) => navigation.navigate('PublicProfile', { userId });

  return (
    <StackScreen title={t('mweb.contacts.title')} testID="contacts-screen">
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ paddingVertical: 16, gap: 16, paddingBottom: 32 }}
      >
        <Text paddingHorizontal={16} fontSize={13} color="$muted">
          {t('mweb.contacts.subtitle')}
        </Text>
        <ContactsAllowCard
          status={status}
          busy={sync.busy}
          failure={sync.failure}
          onAllow={() => fireAndForget(sync.request())}
        />
        <ContactsFilters scope={scope} onScope={setScope} search={search} onSearch={setSearch} />
        {inviting ? (
          <ContactsInviteList
            rows={invites.rows}
            isLoading={invites.isLoading}
            error={invites.error}
            synced={Boolean(status)}
            searching={Boolean(search.trim())}
            selected={invites.selected}
            result={invites.result}
            busyKey={invites.busyKey}
            bulkBusy={invites.bulkBusy}
            onToggleSelect={invites.toggleSelect}
            onInviteRow={(key) => fireAndForget(invites.inviteRow(key))}
            onInviteSelected={() => fireAndForget(invites.inviteSelected())}
            onInviteAll={() => fireAndForget(invites.inviteAll())}
          />
        ) : (
          <>
            {list.rows.length > 0 && viewer ? (
              <ContactsRadar contacts={list.rows} viewer={viewer} onOpen={openProfile} />
            ) : null}
            <ContactsList
              rows={list.rows}
              isLoading={list.isLoading}
              error={list.error}
              synced={Boolean(status)}
              scope={scope}
              searching={Boolean(search.trim())}
              busyId={busyId}
              onToggleFollow={(row) => fireAndForget(toggleFollow(row))}
              onOpen={openProfile}
            />
          </>
        )}
        {status ? (
          <XStack justifyContent="center">
            <DuncitButton
              testID="contacts-clear"
              label={t('mweb.contacts.clear')}
              variant="ghost"
              tone="danger"
              onPress={() => setClearOpen(true)}
            />
          </XStack>
        ) : null}
      </RefreshScrollView>
      <ConfirmDialog
        open={clearOpen}
        title={t('mweb.contacts.clearConfirmTitle')}
        message={t('mweb.contacts.clearConfirmBody')}
        confirmLabel={t('mweb.contacts.clear')}
        destructive
        busy={clearing}
        onConfirm={() => fireAndForget(clear())}
        onCancel={() => setClearOpen(false)}
        testID="contacts-clear-dialog"
      />
    </StackScreen>
  );
}
