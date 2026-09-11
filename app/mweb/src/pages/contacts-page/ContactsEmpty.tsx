import { Alert, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import { parseApiError } from '../../utils/parseApiError';
import type { ContactsScope } from './ContactsToolbar';

interface Props {
  scope: ContactsScope;
  synced: boolean;
  searching: boolean;
  /** Nothing to show yet, but pages are still on their way. */
  loading: boolean;
  error?: unknown;
}

/** The sentence for an empty list, most specific reason first. */
function emptyText(t: Translate, scope: ContactsScope, synced: boolean, searching: boolean): string {
  if (!synced) return t('mweb.contacts.notSyncedYet');
  if (searching) return t('mweb.contacts.noMatchesForSearch');
  if (scope === 'nearby') return t('mweb.contacts.noneNearby');
  if (scope === 'invite') return t('mweb.contacts.everyoneIsHere');
  return t('mweb.contacts.noneMatched');
}

/** Why a list is empty — never synced, no search hit, nobody nearby, nobody
 * left to invite, nobody at all — or that it is still loading. Twin of native
 * `ContactsEmpty` (rule 27). */
export default function ContactsEmpty({ scope, synced, searching, loading, error }: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading) return <Loader />;
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  return (
    <Typography
      variant="body2"
      data-testid="contacts-empty"
      sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
    >
      {emptyText(t, scope, synced, searching)}
    </Typography>
  );
}
