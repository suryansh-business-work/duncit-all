import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { createLogger, fireAndForget } from '@duncit/logs';
import { EmailCheckList, EmailValidationResult } from '@duncit/shell';
import { REVALIDATE_EMAIL, type EmailValidationLogRow } from './queries';

const TITLE_ID = 'email-validation-log-title';
const logger = createLogger('admin');

/** A log row to show; `run` re-validates it the moment the dialog opens. */
export interface ValidationTarget {
  row: EmailValidationLogRow;
  run: boolean;
}

interface Props {
  target: ValidationTarget | null;
  onClose: () => void;
  /** A re-run added a log row — the table refetches. */
  onRevalidated: () => void;
}

/**
 * One logged validation, and Re-validate. A re-run adds a new row pointing
 * back at the one shown; the dialog then shows the new result, so running it
 * again chains from the latest check while every earlier one stays logged.
 */
export default function ValidationResultDialog({ target, onClose, onRevalidated }: Readonly<Props>) {
  const { t } = useTranslation();
  const [revalidate] = useMutation(REVALIDATE_EMAIL);
  const [shown, setShown] = useState<EmailValidationLogRow | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const opened = useRef(0);
  const handled = useRef<ValidationTarget | null>(null);
  // Read at call time, so a parent re-render does not re-create the re-run.
  const onRevalidatedRef = useRef(onRevalidated);
  useEffect(() => {
    onRevalidatedRef.current = onRevalidated;
  }, [onRevalidated]);

  const rerun = useCallback(async (row: EmailValidationLogRow) => {
    const id = opened.current;
    setRunning(true);
    setError('');
    try {
      const { data } = await revalidate({ variables: { id: row.id } });
      if (id !== opened.current || !data) return;
      setShown(data.revalidateEmail);
      notifySuccess(t('admin.emailValidations.revalidated'));
      onRevalidatedRef.current();
    } catch (e) {
      if (id === opened.current) setError(e instanceof Error ? e.message : '');
    } finally {
      if (id === opened.current) setRunning(false);
    }
  }, [revalidate, t]);

  useEffect(() => {
    // Only a newly opened target resets the dialog (and re-runs when asked to).
    if (handled.current === target) return;
    handled.current = target;
    opened.current += 1;
    setShown(target?.row ?? null);
    setRunning(false);
    setError('');
    if (target?.run) fireAndForget(rerun(target.row), logger, 'emailValidations', 'revalidate');
  }, [target, rerun]);

  return (
    <Dialog
      open={Boolean(target)}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby={TITLE_ID}
      data-testid="email-validation-log-dialog"
    >
      <DialogTitle id={TITLE_ID}>{t('admin.emailValidations.resultTitle')}</DialogTitle>
      <DialogContent dividers>
        {shown ? (
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ wordBreak: 'break-all' }}>
              {shown.email}
            </Typography>
            {running ? <EmailCheckList /> : <EmailValidationResult result={shown} />}
            {error ? (
              <Alert severity="error" data-testid="email-validation-log-error">
                {t('admin.emailValidations.revalidateFailed')} {error}
              </Alert>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <DuncitButton
          disabled={running || !shown}
          onClick={() => {
            if (shown) fireAndForget(rerun(shown), logger, 'emailValidations', 'revalidate');
          }}
          data-testid="email-validation-log-revalidate"
        >
          {t('admin.emailValidations.revalidate')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={onClose} data-testid="email-validation-log-close">
          {t('shell.common.close')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
