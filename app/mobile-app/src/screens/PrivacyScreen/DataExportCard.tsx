import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'tamagui';
import { logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDataExport } from '@/hooks/useDataExport';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

type ExportResult = 'done' | 'failed';

/**
 * "Download my data" — the GDPR right of access and portability. Twin of
 * mWeb's DataExportCard (rule 27): the server assembles the file, this only
 * hands it to the share sheet.
 */
export function DataExportCard() {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const { download, busy } = useDataExport();
  const [result, setResult] = useState<ExportResult | null>(null);

  const onDownload = () => {
    setResult(null);
    download()
      .then(() => setResult('done'))
      .catch((error: unknown) => {
        logs.mobileApp.error('PrivacyScreen', 'DataExportCard', { error });
        setResult('failed');
      });
  };

  return (
    <SurfaceCard testID="privacy-data-card" gap={12}>
      <Text role="heading" fontSize={17} fontWeight="600" color="$color">
        {t('privacy.page.dataTitle')}
      </Text>
      <Text fontSize={14} color="$muted">
        {t('privacy.page.dataBlurb')}
      </Text>
      <DuncitButton
        testID="privacy-download-data"
        label={busy ? t('privacy.page.downloading') : t('privacy.page.download')}
        variant="outline"
        loading={busy}
        icon={<MaterialIcons name="file-download" size={20} color={primary} />}
        onPress={onDownload}
      />
      {result === 'done' ? (
        <Text testID="privacy-download-done" role="status" fontSize={12.5} color="$success">
          {t('privacy.page.downloaded')}
        </Text>
      ) : null}
      {result === 'failed' ? (
        <Text testID="privacy-download-error" role="alert" fontSize={12.5} color="$danger">
          {t('privacy.page.downloadFailed')}
        </Text>
      ) : null}
      <Text fontSize={12} color="$muted">
        {t('privacy.page.deleteHint')}
      </Text>
    </SurfaceCard>
  );
}
