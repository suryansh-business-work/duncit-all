import { useCallback, useId, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import EnrollForm, { toLeadFilter } from './enroll.form';
import type { EnrollFormValues } from './enroll.types';
import { ENROLL_LEADS, OUTREACH_ENROLL_COUNT, type OutreachEnrollResult, type OutreachLeadFilter, type OutreachSequence } from '../queries';

interface Props {
  /** The sequence to enroll into; null keeps the dialog closed. */
  sequence: OutreachSequence | null;
  onClose: () => void;
  onEnrolled: () => void;
}

/** Enroll leads from the pipeline by filter, then say how many joined, were already in, or were not taken. */
export default function EnrollDialog({ sequence, onClose, onEnrolled }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [filter, setFilter] = useState<OutreachLeadFilter | null>(null);
  const [result, setResult] = useState<OutreachEnrollResult | null>(null);
  const counted = useQuery<{ outreachEnrollCount: number }>(OUTREACH_ENROLL_COUNT, {
    variables: { sequence_id: sequence?.id ?? '', filter },
    skip: !sequence || filter === null,
    fetchPolicy: 'network-only',
  });
  const [enroll, { loading }] = useMutation<{ enrollLeads: OutreachEnrollResult }>(ENROLL_LEADS);
  const changeFilter = useCallback((next: OutreachLeadFilter) => setFilter(next), []);

  const close = () => {
    setResult(null);
    setFilter(null);
    onClose();
  };

  const submit = (target: OutreachSequence) => async (values: EnrollFormValues): Promise<boolean> => {
    try {
      const { data } = await enroll({ variables: { sequence_id: target.id, filter: toLeadFilter(values) } });
      /* v8 ignore next -- Apollo rejects a failed mutation, so a resolved one always carries data */
      if (!data) return false;
      setResult(data.enrollLeads);
      notify(t('marketing.outreach.enrolled'), 'success');
      onEnrolled();
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  const count = counted.loading || counted.data === undefined ? null : counted.data.outreachEnrollCount;

  return (
    <Dialog open={sequence !== null} onClose={close} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid="enroll-dialog">
      <DialogTitle id={titleId}>{t('marketing.outreach.enrollTitle', { vars: { name: sequence?.name ?? '' } })}</DialogTitle>
      <DialogContent>
        {counted.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseApiError(counted.error)}
          </Alert>
        )}
        {result && (
          <Alert severity="success" data-testid="enroll-result">
            {t('marketing.outreach.enrollResult', {
              vars: { enrolled: String(result.enrolled), already: String(result.already), skipped: String(result.skipped) },
            })}
          </Alert>
        )}
        {!result && sequence && <EnrollForm sequence={sequence} busy={loading} count={count} countFailed={!!counted.error} onFilterChange={changeFilter} onSubmit={submit(sequence)} onCancel={close} />}
      </DialogContent>
      {result && (
        <DialogActions>
          <DuncitButton onClick={close} data-testid="enroll-close">
            {t('marketing.outreach.close')}
          </DuncitButton>
        </DialogActions>
      )}
    </Dialog>
  );
}
