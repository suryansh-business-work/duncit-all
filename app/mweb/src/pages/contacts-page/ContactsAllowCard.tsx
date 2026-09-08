import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime } from '../../utils/dateFormat';
import type { ContactsSyncStatus } from './queries';
import type { ContactsSyncFailure } from './useContactsSync';

interface Props {
  status: ContactsSyncStatus | null;
  supported: boolean;
  busy: boolean;
  failure: ContactsSyncFailure | null;
  onAllow: () => void;
}

const FAILURE_KEY: Record<ContactsSyncFailure, string> = {
  DENIED: 'mweb.contacts.permissionDenied',
  FAILED: 'mweb.contacts.syncFailed',
};

/**
 * The "allow" card: what syncing does, the button that does it, and what the
 * last sync found. A browser without a contact picker is told to use the app —
 * matches synced there still render on this page. Twin of native
 * `ContactsAllowCard` (rule 27).
 */
export default function ContactsAllowCard({ status, supported, busy, failure, onAllow }: Readonly<Props>) {
  const { t } = useTranslation();
  const failureText = failure ? t(FAILURE_KEY[failure]) : '';
  let summary = t('mweb.contacts.notSyncedYet');
  if (status) {
    summary = `${t('mweb.contacts.matched', { count: status.matched })} · ${t('mweb.contacts.lastSynced', {
      vars: { when: formatDateTime(status.synced_at) },
    })}`;
  }

  return (
    <Card variant="outlined" data-testid="contacts-allow-card">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ContactPhoneIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('mweb.contacts.allowTitle')}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.contacts.allowBody')}
          </Typography>
          <Typography variant="body2" data-testid="contacts-sync-summary">
            {summary}
          </Typography>
          {supported ? (
            <DuncitButton
              variant="contained"
              onClick={onAllow}
              loading={busy}
              data-testid="contacts-allow-button"
              sx={{ alignSelf: 'flex-start' }}
            >
              {status ? t('mweb.contacts.resync') : t('mweb.contacts.allowButton')}
            </DuncitButton>
          ) : (
            <Alert severity="info">{t('mweb.contacts.pickerUnavailable')}</Alert>
          )}
          {failureText && <Alert severity="error">{failureText}</Alert>}
        </Stack>
      </CardContent>
    </Card>
  );
}
