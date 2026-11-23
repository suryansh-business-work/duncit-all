import { Chip, Paper, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '../i18n/useTranslation';
import type { Detected } from './documents';

interface RowProps {
  label: string;
  value: string;
  testId: string;
}

function Row({ label, value, testId }: Readonly<RowProps>) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: { sm: 190 } }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 'medium', wordBreak: 'break-word' }} data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

/** The place an address belongs to, written the way it is known: city, region, country. */
const placeOf = (detected: Detected) => [detected.city, detected.region, detected.country].filter(Boolean).join(', ');

/**
 * What the server can already see of this sign-in, shown before anything is
 * asked: the address (read by the server, not sent by the browser), the
 * approximate place that address belongs to, the device and the time.
 */
export function DetectedDetails({ detected, userName }: Readonly<{ detected: Detected; userName: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const unknown = t('shell.securityVerification.detected.unknown');
  const place = placeOf(detected);
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="security-detected">
      <Stack spacing={1}>
        <Typography variant="subtitle1" component="h2">
          {t('shell.securityVerification.detected.title')}
        </Typography>
        <Row label={t('shell.securityVerification.detected.person')} value={userName} testId="security-detected-person" />
        <Row label={t('shell.securityVerification.detected.ip')} value={detected.ip ?? unknown} testId="security-detected-ip" />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} sx={{ alignItems: { sm: 'center' } }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: { sm: 190 } }}>
            {t('shell.securityVerification.detected.approxLocation')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }} data-testid="security-detected-place">
              {place || unknown}
            </Typography>
            {/* Always shown: an address maps to a provider's region, never to a position. */}
            <Chip size="small" color="warning" variant="outlined" label={t('shell.securityVerification.detected.approxBadge')} />
          </Stack>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('shell.securityVerification.detected.approxNote')}
        </Typography>
        <Row label={t('shell.securityVerification.detected.device')} value={detected.device_type ?? unknown} testId="security-detected-device" />
        <Row label={t('shell.securityVerification.detected.browser')} value={detected.browser ?? unknown} testId="security-detected-browser" />
        <Row label={t('shell.securityVerification.detected.os')} value={detected.os ?? unknown} testId="security-detected-os" />
        <Row label={t('shell.securityVerification.detected.loginTime')} value={formatDateTime(detected.server_time)} testId="security-detected-time" />
      </Stack>
    </Paper>
  );
}
