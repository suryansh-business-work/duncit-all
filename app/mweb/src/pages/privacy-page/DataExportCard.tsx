import { useLazyQuery } from '@apollo/client/react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/DownloadRounded';
import { DuncitButton } from '@duncit/buttons';
import { downloadTextFile } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { MY_DATA_EXPORT, type MyDataExportData } from '../../components/consent';
import { notifyError, notifySuccess } from '../../components/notify';

/**
 * "Download my data" — the GDPR right of access and portability. The server
 * assembles the file (privacy.export.ts); this only saves it.
 */
export default function DataExportCard() {
  const { t } = useTranslation();
  const [fetchExport, { loading }] = useLazyQuery<MyDataExportData>(MY_DATA_EXPORT, {
    fetchPolicy: 'network-only',
  });

  const download = async () => {
    try {
      const { data } = await fetchExport();
      if (!data) throw new Error('myDataExport returned no data');
      const day = new Date().toISOString().slice(0, 10);
      downloadTextFile(data.myDataExport, `duncit-my-data-${day}.json`, 'application/json');
      notifySuccess(t('privacy.page.downloaded'));
    } catch (error) {
      logs.mWeb.error('privacy', 'DataExportCard', { error });
      notifyError(t('privacy.page.downloadFailed'));
    }
  };

  return (
    <Card data-testid="privacy-data-card">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography component="h2" sx={{ fontSize: 16, fontWeight: 600 }}>
              {t('privacy.page.dataTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('privacy.page.dataBlurb')}
            </Typography>
          </Stack>
          <DuncitButton
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={loading}
            data-testid="privacy-download-data"
            onClick={() => {
              download().catch((error) => logs.mWeb.error('privacy', 'DataExportCard', { error }));
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {loading ? t('privacy.page.downloading') : t('privacy.page.download')}
          </DuncitButton>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('privacy.page.deleteHint')}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
