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
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError, type EmployeeExpenseClaim } from '@duncit/utils';
import ClaimDetails from './ClaimDetails';
import { REVIEW_EMPLOYEE_EXPENSE } from './queries';

interface Props {
  /** The row that was clicked; null keeps the dialog closed. */
  claim: EmployeeExpenseClaim | null;
  currency: string;
  onClose: () => void;
  /** Refresh the queue + tiles after a decision. */
  onDecided: () => void;
}

/**
 * The panel Finance decides in.
 *
 * A rejection must carry a note — the employee's only account of why they are
 * not being paid is what is typed here — so Reject is disabled until there is
 * one rather than failing on submit.
 */
export default function ReviewClaimDialog({
  claim,
  currency,
  onClose,
  onDecided,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [review, reviewState] = useMutation(REVIEW_EMPLOYEE_EXPENSE);

  // A different claim is a different decision: never carry a note across.
  const claimId = claim?.id ?? null;
  useEffect(() => {
    setNote('');
    setError(null);
  }, [claimId]);

  const decide = async (decision: 'APPROVED' | 'REJECTED', id: string) => {
    setError(null);
    try {
      await review({ variables: { expense_doc_id: id, decision, note } });
      onDecided();
      onClose();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const pending = claim?.status === 'PENDING';
  const rejectBlocked = note.trim().length === 0;

  return (
    <Dialog open={!!claim} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('employeeExpense.review.openClaim')}</DialogTitle>
      <DialogContent dividers>
        {claim && (
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <ClaimDetails claim={claim} currency={currency} />
            {pending ? (
              <TextField
                fullWidth
                multiline
                minRows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                label={t('employeeExpense.review.noteLabel')}
                helperText={
                  rejectBlocked
                    ? t('employeeExpense.review.noteHintReject')
                    : t('employeeExpense.review.noteHintApprove')
                }
              />
            ) : (
              <Alert severity="info">{t('employeeExpense.review.alreadyDecided')}</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={reviewState.loading}>
          {t('shell.common.close')}
        </DuncitButton>
        {claim && pending && (
          <>
            <DuncitButton
              color="error"
              variant="outlined"
              disabled={reviewState.loading || rejectBlocked}
              onClick={() => decide('REJECTED', claim.id)}
            >
              {t('employeeExpense.review.reject')}
            </DuncitButton>
            <DuncitButton
              variant="contained"
              disabled={reviewState.loading}
              onClick={() => decide('APPROVED', claim.id)}
            >
              {t('employeeExpense.review.approve')}
            </DuncitButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
