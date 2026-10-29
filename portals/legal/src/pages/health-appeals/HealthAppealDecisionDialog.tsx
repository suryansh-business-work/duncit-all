import { useState } from 'react';
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
import { HEALTH_APPEAL_REASON_KEY, parseApiError } from '@duncit/utils';
import { ACCEPT_HEALTH_APPEAL, DENY_HEALTH_APPEAL, type HealthAppeal } from '../../graphql/healthAppeals';
import { AppealDecisionForm, type AppealDecision, type AppealDecisionValues } from './appeal-decision-form';

const FORM_ID = 'appeal-decision-form';

export interface PendingAppealDecision {
  appeal: HealthAppeal;
  decision: AppealDecision;
}

interface Props {
  /** The verdict being confirmed; null keeps the dialog closed. */
  pending: PendingAppealDecision | null;
  onClose: () => void;
  /** Fired once the server has applied it, with the line to toast. */
  onDone: (message: string) => void;
}

/** One labelled fact about the appeal: what was deducted, what they said. */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

function DecisionBody({ pending, onClose, onDone }: Readonly<Props & { pending: PendingAppealDecision }>) {
  const { t } = useTranslation();
  const { appeal, decision } = pending;
  const isAccept = decision === 'ACCEPT';
  const [error, setError] = useState('');
  const [accept, acceptState] = useMutation(ACCEPT_HEALTH_APPEAL);
  const [deny, denyState] = useMutation(DENY_HEALTH_APPEAL);
  const busy = acceptState.loading || denyState.loading;

  const apply = async (values: AppealDecisionValues) => {
    setError('');
    const variables = { id: appeal.id, note: values.note.trim() };
    try {
      if (isAccept) await accept({ variables });
      else await deny({ variables });
      onDone(t(isAccept ? 'healthAppeals.accepted' : 'healthAppeals.denied'));
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('healthAppeals.actionFailed'));
    }
  };

  return (
    <>
      <DialogTitle id="appeal-decision-title">
        {t(isAccept ? 'healthAppeals.acceptTitle' : 'healthAppeals.denyTitle')}
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          {t('healthAppeals.decisionSubject', {
            vars: { appeal_no: appeal.appeal_no, account: appeal.subject_label || '—' },
          })}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert data-testid="appeal-decision-warning" severity={isAccept ? 'info' : 'warning'}>
            {t(isAccept ? 'healthAppeals.acceptBody' : 'healthAppeals.denyBody')}
          </Alert>
          <Fact label={t('healthAppeals.colDeduction')} value={String(appeal.delta)} />
          <Fact label={t('healthAppeals.colRemark')} value={appeal.remark} />
          <Fact label={t('healthAppeals.colReason')} value={t(HEALTH_APPEAL_REASON_KEY[appeal.reason])} />
          <Fact label={t('healthAppeals.colMessage')} value={appeal.message} />
          <AppealDecisionForm formId={FORM_ID} decision={decision} disabled={busy} onSubmit={apply} />
          {error && (
            <Alert data-testid="appeal-decision-error" severity="error">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="appeal-decision-cancel" onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={FORM_ID}
          data-testid="appeal-decision-confirm"
          variant="contained"
          color={isAccept ? 'primary' : 'error'}
          disabled={busy}
        >
          {t(isAccept ? 'healthAppeals.acceptCta' : 'healthAppeals.denyCta')}
        </DuncitButton>
      </DialogActions>
    </>
  );
}

/**
 * Confirms a verdict on an appeal before it is applied. Accepting gives points
 * back and denying is final, and either one writes to the person — so neither
 * happens on one click. The dialog shows the deduction and what they said,
 * and takes the note they will read.
 */
export default function HealthAppealDecisionDialog({ pending, onClose, onDone }: Readonly<Props>) {
  return (
    <Dialog
      data-testid="appeal-decision-dialog"
      open={!!pending}
      onClose={onClose}
      aria-labelledby="appeal-decision-title"
      fullWidth
      maxWidth="sm"
    >
      {pending && (
        <DecisionBody
          key={`${pending.appeal.id}:${pending.decision}`}
          pending={pending}
          onClose={onClose}
          onDone={onDone}
        />
      )}
    </Dialog>
  );
}
