import { ListItem, ListItemText, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestoreIcon from '@mui/icons-material/Restore';
import PublishIcon from '@mui/icons-material/Publish';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { copyToClipboard } from '@duncit/utils';
import type { CmsVersionsData } from '../queries/fragments';

type Version = CmsVersionsData['cmsVersions'][number];

interface Props {
  version: Version;
  busy: boolean;
  onRestore: (version: Version) => void;
  onPublish: (version: Version) => void;
}

/** One saved version: its live-demo link on the site's own domain, and making it the draft or the live page. */
export default function VersionRow({ version, busy, onRestore, onPublish }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const label = t('websiteApp.cms.versions.version', { vars: { version: version.version } });

  const copy = () => {
    if (!version.preview_url) return;
    copyToClipboard(version.preview_url)
      .then((copied) => (copied ? notifySuccess(t('websiteApp.cms.versions.copied')) : notifyError(t('websiteApp.cms.versions.copyFailed'))))
      .catch(() => notifyError(t('websiteApp.cms.versions.copyFailed')));
  };

  return (
    <ListItem divider sx={{ display: 'block', py: 1.5 }}>
      <ListItemText primary={label} secondary={t('websiteApp.cms.versions.publishedBy', { vars: { date: formatDateTime(version.created_at) } })} />
      {version.preview_url ? (
        <Typography variant="caption" component="code" sx={{ display: 'block', wordBreak: 'break-all', color: 'text.secondary', mb: 1 }}>
          {version.preview_url}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t('websiteApp.cms.versions.noDemo')}
        </Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        {version.preview_url ? (
          <DuncitButton
            size="small"
            startIcon={<OpenInNewIcon fontSize="small" />}
            href={version.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('websiteApp.cms.versions.openDemo')}: ${label}`}
          >
            {t('websiteApp.cms.versions.openDemo')}
          </DuncitButton>
        ) : (
          <DuncitButton size="small" startIcon={<OpenInNewIcon fontSize="small" />} disabled>
            {t('websiteApp.cms.versions.openDemo')}
          </DuncitButton>
        )}
        <DuncitButton size="small" startIcon={<ContentCopyIcon fontSize="small" />} disabled={!version.preview_url} onClick={copy} aria-label={`${t('websiteApp.cms.versions.copyLink')}: ${label}`}>
          {t('websiteApp.cms.versions.copyLink')}
        </DuncitButton>
        <DuncitButton size="small" startIcon={<RestoreIcon fontSize="small" />} disabled={busy} onClick={() => onRestore(version)} aria-label={`${t('websiteApp.cms.versions.restore')}: ${label}`}>
          {t('websiteApp.cms.versions.restore')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="contained"
          startIcon={<PublishIcon fontSize="small" />}
          disabled={busy}
          onClick={() => onPublish(version)}
          aria-label={`${t('websiteApp.cms.versions.publish')}: ${label}`}
        >
          {t('websiteApp.cms.versions.publish')}
        </DuncitButton>
      </Stack>
    </ListItem>
  );
}
