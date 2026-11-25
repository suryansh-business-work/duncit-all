import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CrmAppArtifact, CrmAppBuild } from '../../api/appDownload.gql';

interface Props {
  /** The environment this card is for, named even when nothing is built yet. */
  env: 'PRODUCTION' | 'STAGING';
  build: CrmAppBuild | null;
}

/** The file a phone installs: the APK on Android, the IPA on iOS. The AAB only rides along. */
const installable = (build: CrmAppBuild): CrmAppArtifact | undefined => build.artifacts.find((a) => a.kind !== 'AAB');

/** One environment's newest Duncit CRM build: what it is, and every file it can be downloaded as. */
export default function AppBuildCard({ env, build }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = env === 'PRODUCTION' ? t('crm.downloadApp.production') : t('crm.downloadApp.staging');
  const labels: Record<CrmAppArtifact['kind'], string> = {
    APK: t('crm.downloadApp.download'),
    AAB: t('crm.downloadApp.downloadAab'),
    IPA: t('crm.downloadApp.downloadIpa'),
  };
  const primary = build ? installable(build) : undefined;
  const kinds = new Set(build?.artifacts.map((a) => a.kind));

  const copyLink = async () => {
    if (!primary) return;
    try {
      await navigator.clipboard.writeText(primary.url);
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
            <Typography component="h3" variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {env === 'STAGING' && <Chip size="small" color="warning" label={t('crm.downloadApp.testingOnly')} />}
          </Stack>
          {build ? (
            <>
              <Typography variant="body2">
                {t('crm.downloadApp.version', { vars: { version: build.version } })}
                {build.build_number ? ` · ${t('crm.downloadApp.build', { vars: { build: build.build_number } })}` : ''}
                {primary?.size_mb == null ? '' : ` · ${t('crm.downloadApp.size', { vars: { size: primary.size_mb.toFixed(1) } })}`}
              </Typography>
              {build.created_at && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('crm.downloadApp.builtOn', { vars: { date: formatDateTime(build.created_at) } })}
                </Typography>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                {build.artifacts.map((file) => (
                  <DuncitButton
                    key={file.kind}
                    href={file.url}
                    download
                    startIcon={<DownloadIcon />}
                    variant={file === primary ? 'contained' : 'outlined'}
                  >
                    {labels[file.kind]}
                  </DuncitButton>
                ))}
                {primary && (
                  <DuncitButton variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyLink}>
                    {t('crm.downloadApp.copyLink')}
                  </DuncitButton>
                )}
              </Stack>
              {kinds.has('AAB') && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('crm.downloadApp.aabHint')}
                </Typography>
              )}
              {kinds.has('IPA') && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('crm.downloadApp.ipaHint')}
                </Typography>
              )}
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
