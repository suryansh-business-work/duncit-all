import { Alert, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { MailAutomationAccount } from '../../graphql/mail-automation';

interface Props {
  account: MailAutomationAccount;
  active: boolean;
  onActiveChange: (value: boolean) => void;
}

/**
 * Step 1: which mailbox this rule is for.
 *
 * Read-only, because the row that opened this wizard already chose it — and
 * connecting or disconnecting a mailbox is the Tech portal's, which the hint
 * says rather than leaving an operator hunting for a button that is not here.
 * The pause switch IS here: pausing is a decision about the promise being
 * made, not about the credential.
 */
export default function MailboxStep({ account, active, onActiveChange }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="overline" color="text.secondary">
          {t('support.mailAutomation.colMailbox')}
        </Typography>
        <Typography variant="h6" fontWeight={800}>
          {account.email}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('support.mailAutomation.mailboxHint')}
        </Typography>
      </Paper>

      {!account.is_connected && (
        <Alert severity="error">{t('support.mailAutomation.mailboxNotConnected')}</Alert>
      )}

      <FormControlLabel
        control={<Switch checked={active} onChange={(e) => onActiveChange(e.target.checked)} />}
        label={t(
          active
            ? 'support.mailAutomation.automationActive'
            : 'support.mailAutomation.automationPaused'
        )}
      />

      <Typography variant="body2" color="text.secondary">
        {t('support.mailAutomation.threadRule')}
      </Typography>
    </Stack>
  );
}
