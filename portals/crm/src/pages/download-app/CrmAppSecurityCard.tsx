import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, FormControlLabel, Paper, Skeleton, Stack, Switch, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import { CRM_APP_SETTINGS, UPDATE_CRM_APP_SETTINGS, type CrmAppSettings } from '../../api/appDownload.gql';

/**
 * Whether the Duncit CRM app asks for Security Verification (location and the
 * notice) after sign-in. Turning it off asks first; the server applies it to
 * new app sign-ins and the CRM web portal keeps asking either way.
 */
export function CrmAppSecurityCard() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, loading, error, refetch } = useQuery<{ crmAppSettings: CrmAppSettings }>(CRM_APP_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, saving] = useMutation<{ updateCrmAppSettings: CrmAppSettings }>(UPDATE_CRM_APP_SETTINGS);
  const on = data?.crmAppSettings.security_verification;

  const change = async (next: boolean) => {
    if (!next) {
      const ok = await confirm({
        title: t('crm.downloadApp.settings.security.confirmTitle'),
        message: t('crm.downloadApp.settings.security.confirmMessage'),
        confirmLabel: t('crm.downloadApp.settings.security.confirmOff'),
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await save({
        variables: { input: { security_verification: next } },
        update: (cache, { data: saved }) => {
          if (saved) cache.writeQuery({ query: CRM_APP_SETTINGS, data: { crmAppSettings: saved.updateCrmAppSettings } });
        },
      });
      notifySuccess(
        next ? t('crm.downloadApp.settings.security.savedOn') : t('crm.downloadApp.settings.security.savedOff'),
      );
    } catch (err) {
      notifyError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }} data-testid="crm-app-security">
      <Stack spacing={1}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('crm.downloadApp.settings.security.title')}
        </Typography>
        {loading && on === undefined && <Skeleton variant="rounded" height={40} aria-label={t('crm.downloadApp.loading')} />}
        {error && on === undefined && (
          <Alert
            severity="error"
            action={
              <DuncitButton size="small" color="inherit" onClick={() => fireAndForget(refetch(), logs.portal.crm, 'CrmAppSecurityCard', 'retry')}>
                {t('shell.common.retry')}
              </DuncitButton>
            }
          >
            {t('crm.downloadApp.settings.security.loadFailed')}
          </Alert>
        )}
        {on !== undefined && (
          <FormControlLabel
            control={
              <Switch
                checked={on}
                disabled={saving.loading}
                onChange={(_e, next) => fireAndForget(change(next), logs.portal.crm, 'CrmAppSecurityCard', 'change')}
                slotProps={{ input: { 'aria-describedby': 'crm-app-security-hint' } }}
              />
            }
            label={t('crm.downloadApp.settings.security.label')}
          />
        )}
        <Typography id="crm-app-security-hint" variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.downloadApp.settings.security.hint')}
        </Typography>
      </Stack>
    </Paper>
  );
}
