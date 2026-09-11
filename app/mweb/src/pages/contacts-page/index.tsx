import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import { DuncitButton } from '@duncit/buttons';
import { useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { contactSearchText, invitableSearchText } from '@duncit/utils';
import { filterByQuery } from '@duncit/virtual-scroll';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import ContactsAllowCard from './ContactsAllowCard';
import ContactsBody from './ContactsBody';
import ContactsEmpty from './ContactsEmpty';
import ContactsInviteBar from './ContactsInviteBar';
import ContactsInviteList from './ContactsInviteList';
import { ContactsLoadProgress } from './ContactsProgress';
import ContactsRadar from './ContactsRadar';
import ContactsToolbar, { type ContactsScope } from './ContactsToolbar';
import { MY_CONTACTS_SYNC } from './queries';
import { useClearContacts } from './useClearContacts';
import { useContactsInvite } from './useContactsInvite';
import { useContactsList } from './useContactsList';
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
  // The box answers every keystroke; the list re-filters once typing pauses.
  const query = useDebouncedValue(search.trim());

  const syncQuery = useQuery<any>(MY_CONTACTS_SYNC, { fetchPolicy: 'cache-and-network' });
  const status = syncQuery.data?.myContactsSync ?? null;
  const me = syncQuery.data?.me;
  const contacts = useContactsList();
  const inviting = tabs.value === 'invite';
  const invites = useContactsInvite(inviting);
  // A resync changes both halves at once — who is here now, and who is left to
  // ask — but the invite list is only re-read while it is on screen.
  const { refetch: refetchStatus } = syncQuery;
  const { reload: reloadContacts, toggleFollow } = contacts;
  const reloadInvites = inviting ? invites.reload : null;
  const refreshAll = useCallback(
    () => Promise.all([refetchStatus(), reloadContacts(), reloadInvites?.()]),
    [refetchStatus, reloadContacts, reloadInvites]
  );
  const sync = useContactsSync(refreshAll);
  const removal = useClearContacts(refreshAll);

  const visibleContacts = useMemo(() => {
    const inScope = tabs.value === 'nearby' ? contacts.rows.filter((row) => row.is_nearby) : contacts.rows;
    return filterByQuery(inScope, query, contactSearchText);
  }, [contacts.rows, tabs.value, query]);
  const visibleInvites = useMemo(
    () => filterByQuery(invites.rows, query, invitableSearchText),
    [invites.rows, query]
  );

  const openProfile = useCallback((userId: string) => navigate(`/u/${userId}`), [navigate]);
  const pages = inviting ? invites : contacts;
  const shown = inviting ? visibleInvites.length : visibleContacts.length;
  const resetKey = `${tabs.value}:${query}`;

  let list = (
    <ContactsBody rows={visibleContacts} resetKey={resetKey} onToggleFollow={toggleFollow} onOpen={openProfile} />
  );
  if (shown === 0) {
    list = (
      <ContactsEmpty
        scope={tabs.value}
        synced={Boolean(status)}
        searching={query !== ''}
        // A search with no hit yet, while pages are still landing, is not
        // "no matches" — it is not finished.
        loading={pages.loading || pages.loadingMore}
        error={pages.rows.length === 0 ? pages.error : undefined}
      />
    );
  } else if (inviting) {
    list = (
      <ContactsInviteList
        rows={visibleInvites}
        resetKey={resetKey}
        selected={invites.selected}
        busyKey={invites.busyKey}
        onToggleSelect={invites.toggleSelect}
        onInviteRow={invites.inviteRow}
      />
    );
  }

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
        stage={sync.stage}
        failure={sync.failure}
        onAllow={sync.request}
      />

      <ContactsToolbar tabs={tabs} search={search} onSearch={setSearch} />

      {inviting && invites.rows.length > 0 && (
        <ContactsInviteBar
          selectedCount={invites.selected.length}
          busy={invites.bulkBusy}
          onInviteSelected={invites.inviteSelected}
        />
      )}
      {!inviting && visibleContacts.length > 0 && me && (
        <ContactsRadar
          contacts={visibleContacts}
          me={{ name: me.full_name || me.first_name || '', photo: me.profile_photo }}
          onOpen={openProfile}
        />
      )}
      <ContactsLoadProgress pages={pages} onRetry={pages.reload} />

      {list}

      {status && (
        <DuncitButton
          variant="text"
          color="error"
          onClick={() => removal.setOpen(true)}
          data-testid="contacts-clear"
          sx={{ alignSelf: 'center' }}
        >
          {t('mweb.contacts.clear')}
        </DuncitButton>
      )}

      <ConfirmDialog
        open={removal.open}
        title={t('mweb.contacts.clearConfirmTitle')}
        message={t('mweb.contacts.clearConfirmBody')}
        confirmLabel={t('mweb.contacts.clear')}
        destructive
        busy={removal.busy}
        onConfirm={removal.confirm}
        onClose={() => removal.setOpen(false)}
      />
    </Stack>
  );
}
