import type { ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import FailureText from './FailureText';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Where the test lives — workspace and file. */
  workspace: string;
  file: string;
  /** Anything else worth a line above the failure (status, describe path). */
  children?: ReactNode;
  failure: string;
}

/**
 * One test in full — a run's test case, or a regression report's item: where
 * it lives, and its failure as the runner printed it.
 */
export default function TestDialog({ open, onClose, title, workspace, file, children, failure }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="unit-test-dialog-title">
      <DialogTitle id="unit-test-dialog-title">{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {children}
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {t('testsUnit.cases.location', { vars: { workspace, file } })}
          </Typography>
          {failure ? (
            <FailureText text={failure} label={t('testsUnit.cases.failure')} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('testsUnit.cases.noFailure')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('testsUnit.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
