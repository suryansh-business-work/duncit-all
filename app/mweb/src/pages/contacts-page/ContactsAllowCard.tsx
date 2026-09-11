import { Alert, Card, Stack, Typography } from '@mui/material';
import ContactPhoneIcon from '@mui/icons-material/ContactPhoneOutlined';
import { DuncitButton } from '@duncit/buttons';
import { progressPercent, type ContactSyncStage } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import { formatDateTime } from '../../utils/dateFormat';
import IconDisc from '../account-page/IconDisc';
import { ContactsProgress } from './ContactsProgress';
import type { ContactsSyncStatus } from './queries';
import type { ContactsSyncFailure } from './useContactsSync';

interface Props {
  status: ContactsSyncStatus | null;
  supported: boolean;
  busy: boolean;
  /** Where a sync in flight has got to; null while none is. */
  stage: ContactSyncStage | null;
  failure: ContactsSyncFailure | null;
  onAllow: () => void;
}

/** The sentence over the sync's bar. The browser's picker reads the phone
 * book itself, so here a sync is only ever SENDING. */
const stageLabel = (t: Translate, stage: ContactSyncStage): string =>
  stage.phase === 'READING'
    ? t('mweb.contacts.syncing')
    : t('mweb.contacts.syncProgress', { vars: { sent: stage.done, total: stage.total } });

const FAILURE_KEY: Record<ContactsSyncFailure, string> = {
  DENIED: 'mweb.contacts.permissionDenied',
  FAILED: 'mweb.contacts.syncFailed',
};

/**
 * The "allow" card: what syncing does (the privacy promise stays — it is the
 * consent), the button that does it, how far a sync in flight has got, and
 * what the last one found. A browser without a contact picker is told to use
 * the app — matches synced there still render on this page. Twin of native
 * `ContactsAllowCard` (rule 27).
 */
export default function ContactsAllowCard({
  status,
  supported,
  busy,
  stage,
  failure,
  onAllow,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const failureText = failure ? t(FAILURE_KEY[failure]) : '';
  let summary = t('mweb.contacts.notSyncedYet');
  if (status) {
    summary = `${t('mweb.contacts.matched', { count: status.matched })} · ${t('mweb.contacts.lastSynced', {
      vars: { when: formatDateTime(status.synced_at) },
    })}`;
  }

  return (
    <Card data-testid="contacts-allow-card" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <IconDisc>
            <ContactPhoneIcon />
          </IconDisc>
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{t('mweb.contacts.allowTitle')}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.contacts.allowBody')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }} data-testid="contacts-sync-summary">
          {summary}
        </Typography>
        {status && status.invitable > 0 && (
          <Typography
            variant="body2"
            data-testid="contacts-invite-summary"
            sx={{ color: 'text.secondary' }}
          >
            {t('mweb.contacts.toInvite', { count: status.invitable })}
          </Typography>
        )}
        {stage && (
          <ContactsProgress
            testId="contacts-sync-progress"
            label={stageLabel(t, stage)}
            percent={progressPercent(stage.done, stage.total)}
          />
        )}
        {supported ? (
          <DuncitButton
            variant="contained"
            size="large"
            fullWidth
            onClick={onAllow}
            loading={busy}
            data-testid="contacts-allow-button"
          >
            {status ? t('mweb.contacts.resync') : t('mweb.contacts.allowButton')}
          </DuncitButton>
        ) : (
          <Alert severity="info">{t('mweb.contacts.pickerUnavailable')}</Alert>
        )}
        {failureText && <Alert severity="error">{failureText}</Alert>}
      </Stack>
    </Card>
  );
}
