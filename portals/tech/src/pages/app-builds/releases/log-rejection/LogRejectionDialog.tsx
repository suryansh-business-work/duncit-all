import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import LogRejectionForm from './log-rejection.form';
import type { LogRejectionValues } from './log-rejection.types';

interface Props {
  open: boolean;
  /** Pre-filled from the row the operator opened, or blank from the page button. */
  initial: Pick<LogRejectionValues, 'version' | 'build_number'>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: LogRejectionValues) => void;
}

/** Logging a rejection the store's API could not report, with the reviewer's words. */
export default function LogRejectionDialog({ open, initial, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('tech.appBuilds.logRejectionTitle')}
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {t('tech.appBuilds.logRejectionSubtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <LogRejectionForm key={`${initial.version}|${initial.build_number}`} initial={initial} busy={busy} onCancel={onClose} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
