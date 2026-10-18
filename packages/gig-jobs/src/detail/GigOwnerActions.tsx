import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { gigJobEditPath, type GigJob } from '@duncit/utils';
import { SET_GIG_JOB_STATUS } from '../documents';
import { useGigSurface } from '../GigSurfaceProvider';

/** The poster's controls: edit, and close (after a confirm) or reopen. */
export default function GigOwnerActions({ job }: Readonly<{ job: GigJob }>) {
  const { t } = useTranslation();
  const { go } = useGigSurface();
  const confirm = useConfirm();
  const [setStatus, { loading }] = useMutation(SET_GIG_JOB_STATUS);
  const open = job.status === 'OPEN';

  const toggle = async () => {
    if (open) {
      const ok = await confirm({
        title: t('gigJobs.detail.closeConfirmTitle'),
        message: t('gigJobs.detail.closeConfirmBody'),
        confirmLabel: t('gigJobs.detail.close'),
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await setStatus({ variables: { id: job.id, status: open ? 'CLOSED' : 'OPEN' } });
      notifySuccess(t('gigJobs.detail.statusSaved'));
    } catch {
      notifyError(t('gigJobs.detail.statusFailed'));
    }
  };

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      <DuncitButton variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => go(gigJobEditPath(job.id))}>
        {t('gigJobs.detail.edit')}
      </DuncitButton>
      <DuncitButton variant="outlined" color={open ? 'error' : 'primary'} onClick={toggle} loading={loading} disabled={loading}>
        {open ? t('gigJobs.detail.close') : t('gigJobs.detail.reopen')}
      </DuncitButton>
    </Stack>
  );
}
