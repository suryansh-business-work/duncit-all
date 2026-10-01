import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError, type ReportMailRecipient } from '@duncit/utils';
import { SEND_CONTENT_REPORT_MAIL, type ContentReport } from '../../../graphql/reports';
import { ReportMailForm, type ReportMailFormValues } from './report-mail-form';

const FORM_ID = 'report-mail-form';

export interface PendingMail {
  report: ContentReport;
  recipient: ReportMailRecipient;
}

interface Props {
  /** Who is being written to, about which report; null keeps the dialog closed. */
  pending: PendingMail | null;
  onClose: () => void;
  onSent: () => void;
}

/**
 * Write to the person who reported content, or to the person who posted it.
 *
 * The dialog shows a name and never an address: the server reads the address
 * from the account, so a legal notice cannot be pointed at somebody else's
 * inbox and nobody's email has to travel to the browser to send it.
 */
export default function ReportMailDialog({ pending, onClose, onSent }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [send, { loading }] = useMutation(SEND_CONTENT_REPORT_MAIL);

  useEffect(() => {
    if (pending) setError('');
  }, [pending]);

  const report = pending?.report ?? null;
  const toReporter = pending?.recipient === 'REPORTER';
  const name = (toReporter ? report?.reporter_name : report?.target_owner_name) || '—';

  const submit = async (values: ReportMailFormValues) => {
    if (!pending) return;
    setError('');
    try {
      await send({
        variables: {
          id: pending.report.id,
          input: { recipient: pending.recipient, subject: values.subject.trim(), message: values.message.trim() },
        },
      });
      onSent();
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('reportLogs.mailFailed'));
    }
  };

  return (
    <Dialog
      data-testid="report-mail-dialog"
      open={!!pending}
      onClose={() => !loading && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {t(toReporter ? 'reportLogs.mailTitleReporter' : 'reportLogs.mailTitleOwner')}
        <Typography
          data-testid="report-mail-to"
          variant="caption"
          component="div"
          sx={{ color: 'text.secondary' }}
        >
          {t('reportLogs.mailTo', { vars: { name } })}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('reportLogs.mailHint', { vars: { report_no: report?.report_no ?? '' } })}
          </Typography>
          {error && (
            <Alert data-testid="report-mail-error" severity="error">
              {error}
            </Alert>
          )}
          <ReportMailForm
            formId={FORM_ID}
            resetKey={pending ? `${pending.report.id}:${pending.recipient}` : ''}
            disabled={loading}
            onSubmit={submit}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="report-mail-cancel" onClick={onClose} disabled={loading}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          data-testid="report-mail-send"
          type="submit"
          form={FORM_ID}
          variant="contained"
          disabled={loading}
        >
          {t('reportLogs.mailSend')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
