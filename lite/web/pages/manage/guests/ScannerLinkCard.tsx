import { Link as RouterLink } from 'react-router';
import { Card, Stack, Typography } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { DuncitButton } from '@duncit/buttons';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { SITE_URL } from '../../../../shared/env';
import { useWebT } from '../../../../shared/i18n';
import { LITE_RADII } from '../../../../shared/tokens';
import { CopyField } from '../../../components/CopyField';
import { paths } from '../../../lib/paths';

/**
 * "Check in guests": the host's own scanner link. Opened on a phone it turns
 * the camera into the door scanner; the link can be sent to a co-host's phone
 * too (it only works for the event's hosts).
 */
export function ScannerLinkCard({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  const link = `${SITE_URL}${paths.eventScan(event.slug)}`;
  return (
    <Card sx={{ p: 2 }} data-testid="scanner-link-card">
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <QrCodeScannerIcon color="success" aria-hidden />
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body1" component="h2" sx={{ fontWeight: 700 }}>
              {t('liteWeb.manage.scanner.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('liteWeb.manage.scanner.body')}
            </Typography>
          </Stack>
          <DuncitButton component={RouterLink} to={paths.eventScan(event.slug)} variant="contained" sx={{ borderRadius: LITE_RADII.pill, flexShrink: 0 }} data-testid="open-scanner">
            {t('liteWeb.manage.scanner.open')}
          </DuncitButton>
        </Stack>
        <CopyField label={t('liteWeb.manage.scanner.link')} value={link} testId="scanner-link" />
      </Stack>
    </Card>
  );
}
