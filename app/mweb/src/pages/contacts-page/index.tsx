import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import { DuncitButton } from '@duncit/buttons';
import { useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { followActionFor, readFollowStatus } from '@duncit/utils';
import ConfirmDialog from '../../components/ConfirmDialog';
import { notifyError, notifySuccess } from '../../components/notify';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import { parseApiError } from '../../utils/parseApiError';
import { CANCEL_FOLLOW_REQUEST, FOLLOW_USER, UNFOLLOW_USER } from '../hosts-venues-page/queries';
import ContactsAllowCard from './ContactsAllowCard';
import ContactsBody from './ContactsBody';
import ContactsInviteList from './ContactsInviteList';
import ContactsRadar from './ContactsRadar';
import ContactsToolbar, { type ContactsScope } from './ContactsToolbar';
import { CLEAR_MY_CONTACTS, CONTACTS_ON_DUNCIT, MY_CONTACTS_SYNC, type ContactRow } from './queries';
import { useContactsInvite } from './useContactsInvite';
import { useContactsSync } from './useContactsSync';

const scopeTabs = (t: Translate): DuncitTabItem<ContactsScope>[] => [
  { value: 'all', label: t('mweb.contacts.filterAll') },
  { value: 'nearby', label: t('mweb.contacts.filterNearby') },
  { value: 'invite', label: t('mweb.contacts.filterInvite') },
];

/** Your Contacts on Duncit — twin of native `ContactsScreen` (rule 27). */
export default function ContactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tabs = useTabParam<ContactsScope>({ items: scopeTabs(t), fallback: 'all' });
  const [search, setSearch] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());

  const syncQuery = useQuery<any>(MY_CONTACTS_SYNC, { fetchPolicy: 'cache-and-network' });
  const status = syncQuery.data?.myContactsSync ?? null;
  const me = syncQuery.data?.me;
  const list = useQuery<any>(CONTACTS_ON_DUNCIT, {
    variables: { search: debouncedSearch || null, nearby: tabs.value === 'nearby' },
    fetchPolicy: 'cache-and-network',
  });
  const rows: ContactRow[] = list.data?.contactsOnDuncit ?? [];

  const inviting = tabs.value === 'invite';
  const invites = useContactsInvite(debouncedSearch, inviting);
  // A resync changes both halves at once — who is here now, and who is left to
  // ask. The invite list is only refetched while it is on screen; Apollo runs a
  // refetch even on a skipped query, and nobody needs a phone book they are not
  // looking at.
  const refetchInvites = inviting ? invites.refetch : null;
  const refreshAll = useCallback(
    () => Promise.all([syncQuery.refetch(), list.refetch(), refetchInvites?.()]),
    [syncQuery, list, refetchInvites]
  );
  const sync = useContactsSync(refreshAll);

  const [followUser] = useMutation<any>(FOLLOW_USER);
  const [unfollowUser] = useMutation<any>(UNFOLLOW_USER);
  const [cancelRequest] = useMutation<any>(CANCEL_FOLLOW_REQUEST);
  const [clearContacts, { loading: clearing }] = useMutation<any>(CLEAR_MY_CONTACTS);

  const toggleFollow = async (row: ContactRow) => {
    const mutations = { FOLLOW: followUser, UNFOLLOW: unfollowUser, CANCEL_REQUEST: cancelRequest };
    try {
      await mutations[followActionFor(readFollowStatus(row.profile))]({
        variables: { user_id: row.profile.user_id },
      });
      await list.refetch();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const clear = async () => {
    try {
      await clearContacts();
      setClearOpen(false);
      notifySuccess(t('mweb.contacts.cleared'));
      await refreshAll();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const openProfile = (userId: string) => navigate(`/u/${userId}`);

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%', pb: 6 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <ContactPhoneIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {t('mweb.contacts.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.contacts.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <ContactsAllowCard
        status={status}
        supported={sync.supported}
        busy={sync.busy}
        failure={sync.failure}
        onAllow={sync.request}
      />

      <ContactsToolbar tabs={tabs} search={search} onSearch={setSearch} />

      {inviting ? (
        <ContactsInviteList
          loading={invites.loading}
          hasData={invites.hasData}
          error={invites.error}
          synced={Boolean(status)}
          searching={Boolean(debouncedSearch)}
          rows={invites.rows}
          selected={invites.selected}
          busyKey={invites.busyKey}
          bulkBusy={invites.bulkBusy}
          onToggleSelect={invites.toggleSelect}
          onInviteRow={invites.inviteRow}
          onInviteSelected={invites.inviteSelected}
          onInviteAll={invites.inviteAll}
        />
      ) : (
        <>
          {rows.length > 0 && me && (
            <ContactsRadar
              contacts={rows}
              me={{ name: me.full_name || me.first_name || '', photo: me.profile_photo }}
              onOpen={openProfile}
            />
          )}

          <ContactsBody
            loading={list.loading}
            hasData={Boolean(list.data)}
            error={list.error?.message}
            synced={Boolean(status)}
            scope={tabs.value}
            searching={Boolean(debouncedSearch)}
            rows={rows}
            onToggleFollow={toggleFollow}
            onOpen={openProfile}
          />
        </>
      )}

      {status && (
        <DuncitButton
          variant="text"
          color="error"
          onClick={() => setClearOpen(true)}
          data-testid="contacts-clear"
          sx={{ alignSelf: 'center' }}
        >
          {t('mweb.contacts.clear')}
        </DuncitButton>
      )}

      <ConfirmDialog
        open={clearOpen}
        title={t('mweb.contacts.clearConfirmTitle')}
        message={t('mweb.contacts.clearConfirmBody')}
        confirmLabel={t('mweb.contacts.clear')}
        destructive
        busy={clearing}
        onConfirm={clear}
        onClose={() => setClearOpen(false)}
      />
    </Stack>
  );
}
