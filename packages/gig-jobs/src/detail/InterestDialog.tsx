import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError, type GigJob } from '@duncit/utils';
import { EXPRESS_GIG_INTEREST } from '../documents';
import GigInterestForm, { type GigInterestValues } from './gig-interest';

interface Props {
  job: GigJob;
  open: boolean;
  onClose: () => void;
}

const TITLE_ID = 'gig-interest-title';

/**
 * Confirms the swap before it happens: the freelancer's profile contact goes
 * to the poster and the poster's comes back. The server makes a repeat tap a
 * no-op, so a retry after a dropped response cannot share or notify twice.
 */
export default function InterestDialog({ job, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [express, { loading }] = useMutation(EXPRESS_GIG_INTEREST);

  const close = () => {
    setApiError(null);
    onClose();
  };

  const submit = async ({ message }: GigInterestValues) => {
    setApiError(null);
    try {
      // The returned gig carries the contact; Apollo writes it over the open page's copy.
      await express({ variables: { job_id: job.id, message } });
      notifySuccess(t('gigJobs.interest.sent'));
      close();
    } catch (error) {
      setApiError(parseApiError(error, t('gigJobs.interest.failed')));
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>{t('gigJobs.interest.dialogTitle', { vars: { name: job.poster_name } })}</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 2 }}>{t('gigJobs.interest.dialogBody')}</DialogContentText>
        <GigInterestForm busy={loading} errorMessage={apiError} onSubmit={submit} onCancel={close} />
      </DialogContent>
    </Dialog>
  );
}
