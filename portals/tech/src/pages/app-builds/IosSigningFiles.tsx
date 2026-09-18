import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { notifyError } from '@duncit/dialogs';
import { formatDateTime } from '@duncit/app-settings';
import { downloadBase64File, parseApiError } from '@duncit/utils';
import { DOWNLOAD_IOS_SIGNING_FILE, IOS_SIGNING_FOR_BUILD, type IosSigningFileKind } from './queries';

const FILES: readonly { kind: IosSigningFileKind; labelKey: string }[] = [
  { kind: 'CERTIFICATE', labelKey: 'tech.appBuilds.iosSigningFileCertificate' },
  { kind: 'PROFILE', labelKey: 'tech.appBuilds.iosSigningFileProfile' },
  { kind: 'P12', labelKey: 'tech.appBuilds.iosSigningFileP12' },
  { kind: 'API_KEY', labelKey: 'tech.appBuilds.iosSigningFileApiKey' },
];

interface P12Notice {
  file: string;
  password: string;
}

/**
 * The signing files an iOS build was signed with, each its own download. The
 * .p12 is sealed with a password made for that one download, shown here once
 * it has been saved — without it the file cannot be opened.
 */
export default function IosSigningFiles({ buildId }: Readonly<{ buildId: string }>) {
  const { t } = useTranslation();
  const { data, loading } = useQuery(IOS_SIGNING_FOR_BUILD, {
    variables: { id: buildId },
    fetchPolicy: 'cache-and-network',
  });
  const [download] = useMutation(DOWNLOAD_IOS_SIGNING_FILE);
  const [busy, setBusy] = useState<IosSigningFileKind | null>(null);
  const [p12, setP12] = useState<P12Notice | null>(null);
  const signing = data?.iosSigningForBuild ?? null;

  const onDownload = async (kind: IosSigningFileKind) => {
    if (!signing) return;
    setBusy(kind);
    try {
      const res = await download({ variables: { id: signing.id, kind } });
      const file = res.data?.downloadIosSigningFile;
      if (!file) return;
      downloadBase64File(file.content_base64, file.file_name, 'application/octet-stream');
      if (file.password) setP12({ file: file.file_name, password: file.password });
    } catch (err) {
      notifyError(parseApiError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{t('tech.appBuilds.iosSigningFilesTitle')}</Typography>
      {!signing && !loading && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.appBuilds.iosSigningFilesNone')}
        </Typography>
      )}
      {signing && (
        <>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.appBuilds.iosSigningFilesCaption', {
              vars: {
                serial: signing.certificate_serial,
                expires: signing.expires_at ? formatDateTime(signing.expires_at) : '—',
              },
            })}
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            {FILES.map((f) => (
              <DuncitButton
                key={f.kind}
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                loading={busy === f.kind}
                disabled={busy !== null && busy !== f.kind}
                onClick={() => onDownload(f.kind)}
              >
                {t(f.labelKey)}
              </DuncitButton>
            ))}
          </Stack>
          {p12 && (
            <Alert severity="info">
              {t('tech.appBuilds.iosSigningP12Password', { vars: { file: p12.file, password: p12.password } })}
            </Alert>
          )}
        </>
      )}
    </Stack>
  );
}
