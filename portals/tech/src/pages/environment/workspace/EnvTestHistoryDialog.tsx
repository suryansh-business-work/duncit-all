import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { EnvEntry } from '../queries';
import EnvTestHistoryList from './EnvTestHistoryList';

const HISTORY_LIMIT = 50;

/** Every test run on one entry, opened from its row in the table. */
export default function EnvTestHistoryDialog({ entry, onClose }: Readonly<{ entry: EnvEntry | null; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!entry} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="env-test-history-title">
      <DialogTitle id="env-test-history-title">
        {t('tech.environment.testHistory')}
        {entry ? (
          <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.secondary' }}>
            {t('tech.environment.testHistorySubtitle', { vars: { name: entry.name } })}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>{entry ? <EnvTestHistoryList entryId={entry.id} limit={HISTORY_LIMIT} /> : null}</DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
