import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { XStack } from 'tamagui';
import {
  contactSearchText,
  followActionFor,
  invitableSearchText,
  readFollowStatus,
} from '@duncit/utils';
import { filterByQuery } from '@duncit/virtual-scroll';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  ContactsEmpty,
  ContactsFeed,
  ContactsHeader,
  ContactsInviteBar,
  ContactsLoadProgress,
  ContactsRadar,
  type FeedRow,
} from '@/components/contacts';
import { DuncitButton } from '@/components/DuncitButton';
import { StackScreen } from '@/components/StackScreen';
import { useClearContacts } from '@/hooks/useClearContacts';
import {
  useContactsOnDuncit,
  useContactsSyncStatus,
  type ContactRow,
  type ContactsScope,
} from '@/hooks/useContacts';
import { useContactsInvite } from '@/hooks/useContactsInvite';
import { useContactsSync } from '@/hooks/useContactsSync';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { runUserFollowAction } from '@/services/follow-user';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Your Contacts on Duncit — RN twin of mWeb's ContactsPage (rule 27). */
export function ContactsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [scope, setScope] = useState<ContactsScope>('all');
  const [search, setSearch] = useState('');
  // The box answers every keystroke; the list re-filters once typing pauses.
  const query = useDebouncedValue(search.trim());
  const [busyId, setBusyId] = useState<string | null>(null);

  const { status, viewer, refetch: refetchStatus } = useContactsSyncStatus();
  const contacts = useContactsOnDuncit();
  const inviting = scope === 'invite';
  const invites = useContactsInvite(inviting);
  // A resync changes both halves at once — who is here now, and who is left to
  // ask — but the invite list is only re-read while it is on screen.
  const { reload: reloadContacts, setFollowStatus } = contacts;
  const reloadInvites = inviting ? invites.reload : null;
  const refreshAll = useCallback(
    () => Promise.all([refetchStatus(), reloadContacts(), reloadInvites?.()]),
    [refetchStatus, reloadContacts, reloadInvites],
  );
  const sync = useContactsSync(refreshAll);
  const removal = useClearContacts(refreshAll);

  const visibleContacts = useMemo(() => {
    const inScope =
      scope === 'nearby' ? contacts.rows.filter((row) => row.is_nearby) : contacts.rows;
    return filterByQuery(inScope, query, contactSearchText);
  }, [contacts.rows, scope, query]);
  const visibleInvites = useMemo(
    () => filterByQuery(invites.rows, query, invitableSearchText),
    [invites.rows, query],
  );

  // The server answers with the status it settled on (a private profile lands
  // on REQUESTED), and only that one row is redrawn.
  const toggleFollow = useCallback(
    async (row: ContactRow) => {
      setBusyId(row.profile.user_id);
      try {
        const settled = await runUserFollowAction(
          followActionFor(readFollowStatus(row.profile)),
          row.profile.user_id,
        );
        setFollowStatus(row.profile.user_id, settled);
      } finally {
        setBusyId(null);
      }
    },
    [setFollowStatus],
  );
  const onToggleFollow = useCallback(
    (row: ContactRow) => fireAndForget(toggleFollow(row)),
    [toggleFollow],
  );
  const openProfile = useCallback(
    (userId: string) => navigation.navigate('PublicProfile', { userId }),
    [navigation],
  );
  const { inviteRow, inviteSelected } = invites;
  const onInvite = useCallback((key: string) => fireAndForget(inviteRow(key)), [inviteRow]);

  const pages = inviting ? invites : contacts;
  const rows: readonly FeedRow[] = inviting ? visibleInvites : visibleContacts;
  const showRadar = !inviting && visibleContacts.length > 0 && viewer;

  const header = (
    <ContactsHeader
      status={status}
      sync={sync}
      onAllow={() => fireAndForget(sync.request())}
      scope={scope}
      onScope={setScope}
      search={search}
      onSearch={setSearch}
    >
      {inviting && invites.rows.length > 0 ? (
        <ContactsInviteBar
          selectedCount={invites.selected.length}
          busy={invites.bulkBusy}
          result={invites.result}
          error={invites.inviteError}
          onInviteSelected={() => fireAndForget(inviteSelected())}
        />
      ) : null}
      {showRadar ? (
        <ContactsRadar contacts={visibleContacts} viewer={viewer} onOpen={openProfile} />
      ) : null}
      <ContactsLoadProgress pages={pages} onRetry={() => fireAndForget(pages.reload())} />
    </ContactsHeader>
  );

  const footer = status ? (
    <XStack justifyContent="center" paddingTop={16}>
      <DuncitButton
        testID="contacts-clear"
        label={t('mweb.contacts.clear')}
        variant="ghost"
        tone="danger"
        onPress={() => removal.setOpen(true)}
      />
    </XStack>
  ) : null;

  return (
    <StackScreen title={t('mweb.contacts.title')} testID="contacts-screen">
      <ContactsFeed
        rows={rows}
        header={header}
        empty={
          <ContactsEmpty
            scope={scope}
            synced={Boolean(status)}
            searching={query !== ''}
            // A search with no hit yet, while pages are still landing, is not
            // "no matches" — it is not finished.
            loading={pages.loading || pages.loadingMore}
            error={pages.rows.length === 0 ? pages.error : undefined}
          />
        }
        footer={footer}
        busyId={busyId}
        onToggleFollow={onToggleFollow}
        onOpen={openProfile}
        selected={invites.selected}
        busyKey={invites.busyKey}
        onToggleSelect={invites.toggleSelect}
        onInvite={onInvite}
      />
      <ConfirmDialog
        open={removal.open}
        title={t('mweb.contacts.clearConfirmTitle')}
        message={t('mweb.contacts.clearConfirmBody')}
        confirmLabel={t('mweb.contacts.clear')}
        destructive
        busy={removal.busy}
        onConfirm={() => fireAndForget(removal.confirm())}
        onCancel={() => removal.setOpen(false)}
        testID="contacts-clear-dialog"
      />
    </StackScreen>
  );
}
