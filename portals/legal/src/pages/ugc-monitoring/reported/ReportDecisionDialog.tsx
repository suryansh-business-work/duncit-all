import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError, REPORT_TARGET_KEY } from '@duncit/utils';
import {
  MARK_REPORTED_CONTENT_OK,
  TAKE_DOWN_REPORTED_CONTENT,
  type ContentReport,
} from '../../../graphql/reports';
import ReportPreview from './ReportPreview';
import type { ReportDecision } from './ReportRowActions';

/** The server refuses a longer note; the field stops at the same length. */
const NOTE_MAX = 5000;

export interface PendingDecision {
  report: ContentReport;
  decision: ReportDecision;
}

interface Props {
  /** The verdict being confirmed; null keeps the dialog closed. */
  pending: PendingDecision | null;
  onClose: () => void;
  /** Fired once the server has applied it, with the line to toast. */
  onDone: (message: string) => void;
}

/** The words one verdict is confirmed with. */
function decisionCopy(pending: PendingDecision | null) {
  if (pending?.decision === 'LOOKS_GOOD') {
    return {
      title: 'reportLogs.looksGoodTitle',
      body: 'reportLogs.looksGoodBody',
      cta: 'reportLogs.looksGoodCta',
      done: 'reportLogs.markedOk',
    };
  }
  return {
    title: 'reportLogs.takeDownTitle',
    body: 'reportLogs.takeDownBody',
    cta: 'reportLogs.takeDownCta',
    done: 'reportLogs.takenDown',
  };
}

/**
 * Confirms a verdict on reported content before it is applied.
 *
 * A take-down removes somebody's post for everyone and cannot be undone, so it
 * never happens on one click: the dialog shows the content, names whose it is,
 * and says what will happen to the other reports on it. "Looks good" goes
 * through the same dialog because it closes other people's reports too.
 */
export default function ReportDecisionDialog({ pending, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [takeDown, takeDownState] = useMutation(TAKE_DOWN_REPORTED_CONTENT);
  const [markOk, markOkState] = useMutation(MARK_REPORTED_CONTENT_OK);
  const busy = takeDownState.loading || markOkState.loading;

  // Re-seed on every open: one dialog instance serves every row and verdict.
  useEffect(() => {
    if (!pending) return;
    setNote('');
    setError('');
  }, [pending]);

  const report = pending?.report ?? null;
  const isTakeDown = pending?.decision === 'TAKE_DOWN';
  const copy = decisionCopy(pending);

  const apply = async () => {
    if (!report) return;
    const variables = { id: report.id, note: note.trim() };
    try {
      if (isTakeDown) await takeDown({ variables });
      else await markOk({ variables });
      onDone(t(copy.done));
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('reportLogs.actionFailed'));
    }
  };

  const subject = report
    ? t('reportLogs.decisionSubject', {
        vars: {
          target: t(REPORT_TARGET_KEY[report.target_type]),
          owner: report.target_owner_name || '—',
          report_no: report.report_no,
        },
      })
    : '';

  return (
    <Dialog
      data-testid="report-decision-dialog"
      open={!!pending}
      onClose={() => !busy && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {t(copy.title)}
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          {subject}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert data-testid="report-decision-warning" severity={isTakeDown ? 'warning' : 'info'}>
            {t(copy.body)}
          </Alert>
          <ReportPreview report={report} />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t('reportLogs.decisionNote')}
            placeholder={t('reportLogs.decisionNotePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: NOTE_MAX, 'data-testid': 'report-decision-note' } }}
          />
          {error && (
            <Alert data-testid="report-decision-error" severity="error">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="report-decision-cancel" onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          data-testid="report-decision-confirm"
          variant="contained"
          color={isTakeDown ? 'error' : 'primary'}
          disabled={busy}
          onClick={apply}
        >
          {t(copy.cta)}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
