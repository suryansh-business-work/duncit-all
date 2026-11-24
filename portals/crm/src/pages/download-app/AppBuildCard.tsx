import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CrmAppBuild } from '../../api/appDownload.gql';

interface Props {
  /** The environment this card is for, named even when nothing is built yet. */
  env: 'PRODUCTION' | 'STAGING';
  build: CrmAppBuild | null;
}

/** One environment's newest Duncit CRM APK: what it is, and the way to get it onto a phone. */
export default function AppBuildCard({ env, build }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = env === 'PRODUCTION' ? t('crm.downloadApp.production') : t('crm.downloadApp.staging');

  const copyLink = async () => {
    if (!build) return;
    try {
      await navigator.clipboard.writeText(build.apk_url);
      notifySuccess(t('crm.downloadApp.linkCopied'));
    } catch {
      notifyError(t('crm.downloadApp.copyFailed'));
    }
  };

  return (
    <Card variant="outlined" component="section" aria-label={title}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {env === 'STAGING' && <Chip size="small" color="warning" label={t('crm.downloadApp.testingOnly')} />}
          </Stack>
          {build ? (
            <>
              <Typography variant="body2">
                {t('crm.downloadApp.version', { vars: { version: build.version } })}
                {build.build_number ? ` · ${t('crm.downloadApp.build', { vars: { build: build.build_number } })}` : ''}
                {build.size_mb == null ? '' : ` · ${t('crm.downloadApp.size', { vars: { size: build.size_mb.toFixed(1) } })}`}
              </Typography>
              {build.created_at && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('crm.downloadApp.builtOn', { vars: { date: formatDateTime(build.created_at) } })}
                </Typography>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <DuncitButton href={build.apk_url} download startIcon={<DownloadIcon />}>
                  {t('crm.downloadApp.download')}
                </DuncitButton>
                <DuncitButton variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyLink}>
                  {t('crm.downloadApp.copyLink')}
                </DuncitButton>
              </Stack>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('crm.downloadApp.noBuild')}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
