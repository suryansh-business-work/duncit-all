import { Alert, Stack, Typography } from '@mui/material';
import { Loader, LoadingOverlay } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';
import ContactRow from './ContactRow';
import type { ContactRow as ContactRowData } from './queries';
import type { ContactsScope } from './ContactsToolbar';

interface Props {
  loading: boolean;
  hasData: boolean;
  /** A re-read of a list already on screen — after a follow, or a resync. */
  refreshing: boolean;
  error?: string;
  synced: boolean;
  scope: ContactsScope;
  searching: boolean;
  rows: ContactRowData[];
  onToggleFollow: (row: ContactRowData) => Promise<void>;
  onOpen: (userId: string) => void;
}

/** Loading / error / empty / list body under the radar — the empty copy says
 * WHY it is empty (never synced, nobody nearby, no search hit, nobody at all).
 * Twin of native `ContactsList` (rule 27). */
export default function ContactsBody({
  loading,
  hasData,
  refreshing,
  error,
  synced,
  scope,
  searching,
  rows,
  onToggleFollow,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading && !hasData) return <Loader />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (rows.length === 0) {
    let empty = t('mweb.contacts.noneMatched');
    if (!synced) empty = t('mweb.contacts.notSyncedYet');
    else if (searching) empty = t('mweb.contacts.noMatchesForSearch');
    else if (scope === 'nearby') empty = t('mweb.contacts.noneNearby');
    return (
      <Typography
        variant="body2"
        data-testid="contacts-empty"
        sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
      >
        {empty}
      </Typography>
    );
  }
  return (
    <LoadingOverlay open={refreshing}>
      <Stack data-testid="contacts-list">
        {rows.map((row) => (
          <ContactRow key={row.profile.user_id} row={row} onToggleFollow={onToggleFollow} onOpen={onOpen} />
        ))}
      </Stack>
    </LoadingOverlay>
  );
}
