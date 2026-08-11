import {
  Alert,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { MailAutomationAccount } from '../../graphql/mail-automation';

interface Props {
  accounts: MailAutomationAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  active: boolean;
  onActiveChange: (value: boolean) => void;
}

/**
 * Step 1: which mailbox this rule is for.
 *
 * A picker, not a connect button. Connecting is Tech's — the hint says so
 * rather than leaving an operator hunting for a button that is not here.
 * The pause switch IS here, because pausing is a decision about the promise
 * being made, not about the credential.
 */
export default function MailboxStep({
  accounts,
  selectedId,
  onSelect,
  active,
  onActiveChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <Stack spacing={2}>
      <TextField
        select
        fullWidth
        label={t('support.mailAutomation.stepMailbox')}
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        helperText={t('support.mailAutomation.mailboxHint')}
      >
        {accounts.map((account) => (
          <MenuItem key={account.id} value={account.id}>
            {account.email}
          </MenuItem>
        ))}
      </TextField>

      {selected && !selected.is_connected && (
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
