import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import {
  APP_BUILD_TRIGGER_CONFIG,
  TRIGGER_APP_BUILD,
  type AppBuildPlatform,
  type AppBuildTriggerConfig,
} from '../queries';
import CreateBuildForm, { CREATE_BUILD_FORM_ID } from './create-build.form';
import type { CreateBuildValues } from './create-build.types';

interface Props {
  open: boolean;
  platform: AppBuildPlatform;
  onClose: () => void;
  /** Called after a build is queued, so the table shows it without a reload. */
  onQueued: () => void;
}

/**
 * Start a build from the portal.
 *
 * The dialog is opened even when GitHub is not configured — the button that
 * opens it stays enabled and the reason appears HERE. A disabled button with no
 * explanation is the same dead end as a missing feature.
 */
export default function CreateBuildDialog({ open, platform, onClose, onQueued }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const { data, loading } = useQuery<{ appBuildTriggerConfig: AppBuildTriggerConfig }>(
    APP_BUILD_TRIGGER_CONFIG,
    { skip: !open, fetchPolicy: 'cache-and-network' }
  );
  const [triggerBuild] = useMutation(TRIGGER_APP_BUILD);
  const config = data?.appBuildTriggerConfig ?? null;

  const submit = async (values: CreateBuildValues) => {
    setBusy(true);
    try {
      const res = await triggerBuild({ variables: { input: { platform, ...values } } });
      const queued = res.data?.triggerAppBuild;
      notifySuccess(
        t('tech.appBuilds.triggered', { vars: { build: queued?.build?.build_no ?? '' } })
      );
      onQueued();
      onClose();
    } catch (err) {
      // notifyError takes a STRING — handing it the error object white-screens
      // the portal, which has no error boundary above this.
      notifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        {t('tech.appBuilds.triggerTitle')}
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {t('tech.appBuilds.triggerSubtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading && !config && <CircularProgress size={24} />}
        {config && !config.configured && (
          <Alert severity="warning">{t('tech.appBuilds.githubNotConfigured')}</Alert>
        )}
        {config?.configured && (
          <Stack spacing={2}>
            <CreateBuildForm platform={platform} config={config} onSubmit={submit} />
            {/* Which repo this dispatches against and where the row will land.
                Both are surprising often enough to be worth stating: a staging
                build still records itself in the portal it was started from. */}
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('tech.appBuilds.triggerTargets', {
                vars: { repository: config.repository, server: config.reports_to },
              })}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('tech.appBuilds.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={CREATE_BUILD_FORM_ID}
          variant="contained"
          disabled={busy || !config?.configured}
        >
          {busy ? t('tech.appBuilds.triggering') : t('tech.appBuilds.triggerAction')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
