import { Alert, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  pendingInviteKeys,
  type InvitableContact,
  type InviteBulkPress,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import InviteRow from './InviteRow';

interface Props {
  loading: boolean;
  hasData: boolean;
  error?: string;
  synced: boolean;
  searching: boolean;
  rows: InvitableContact[];
  selected: string[];
  busyKey: string | null;
  bulkBusy: InviteBulkPress | null;
  onToggleSelect: (key: string) => void;
  onInviteRow: (key: string) => void;
  onInviteSelected: () => void;
  onInviteAll: () => void;
}

/** The people from the phone book who are not here yet, with the three ways to
 * ask them: one row, the ticked ones, or everyone still waiting. Twin of native
 * `ContactsInviteList` (rule 27). */
export default function ContactsInviteList({
  loading,
  hasData,
  error,
  synced,
  searching,
  rows,
  selected,
  busyKey,
  bulkBusy,
  onToggleSelect,
  onInviteRow,
  onInviteSelected,
  onInviteAll,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading && !hasData) {
    return (
      <Stack sx={{ alignItems: 'center', p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  const pending = pendingInviteKeys(rows);
  if (rows.length === 0) {
    let empty = t('mweb.contacts.everyoneIsHere');
    if (!synced) empty = t('mweb.contacts.notSyncedYet');
    else if (searching) empty = t('mweb.contacts.noMatchesForSearch');
    return (
      <Typography
        variant="body2"
        data-testid="contacts-invite-empty"
        sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
      >
        {empty}
      </Typography>
    );
  }

  return (
    <Stack spacing={1} data-testid="contacts-invite-list">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.contacts.inviteBody')}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <DuncitButton
          variant="outlined"
          size="small"
          disabled={selected.length === 0}
          loading={bulkBusy === 'SELECTED'}
          onClick={onInviteSelected}
          data-testid="contacts-invite-selected"
        >
          {t('mweb.contacts.inviteSelected', { vars: { count: selected.length } })}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          size="small"
          disabled={pending.length === 0}
          loading={bulkBusy === 'ALL'}
          onClick={onInviteAll}
          data-testid="contacts-invite-all"
        >
          {t('mweb.contacts.inviteAll', { vars: { count: pending.length } })}
        </DuncitButton>
      </Stack>
      <Divider />
      {rows.map((row) => (
        <InviteRow
          key={row.phone_key}
          row={row}
          selected={selected.includes(row.phone_key)}
          busy={busyKey === row.phone_key}
          onToggleSelect={onToggleSelect}
          onInvite={onInviteRow}
        />
      ))}
    </Stack>
  );
}
